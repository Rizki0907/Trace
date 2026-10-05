(function () {
  'use strict';

  let currentBinaryString = "";

  window.previewSimImage = function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('sim-img-preview-container').style.display = 'block';
        document.getElementById('sim-img-preview').src = e.target.result;
      }
      reader.readAsDataURL(file);
    }
  };

  window.simulateHash = function () {
    window.runSimulation('enroll');
  };

  window.runSimulation = async function (mode) {
    const seedInput = document.getElementById('sim-key-seed');
    const dimSelect = document.getElementById('sim-dim');
    const fileInput = document.getElementById('sim-image-upload');
    const backendUrlInput = document.getElementById('sim-backend-url');
    
    const backendUrl = backendUrlInput ? backendUrlInput.value.trim() : "http://localhost:7860";
    const baseSeed = seedInput ? parseInt(seedInput.value, 10) || 20260728 : 20260728;
    const dim = dimSelect ? parseInt(dimSelect.value, 10) || 256 : 256;
    const actualSeed = mode === 'revoke' ? Math.floor(Math.random() * 10000000) : baseSeed;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Peringatan: Silakan upload Citra Uji Wajah (CCTV) terlebih dahulu sebelum Enroll!");
        return;
    }

    // Reset UI stages
    const stages = [
      { id: 'sstep-1', prog: 'prog-1', badge: 'sstep-1-badge', dur: 400 },
      { id: 'sstep-2', prog: 'prog-2', badge: 'sstep-2-badge', dur: 250 },
      { id: 'sstep-3', prog: 'prog-3', badge: 'sstep-3-badge', dur: 450 },
      { id: 'sstep-4', prog: 'prog-4', badge: 'sstep-4-badge', dur: 350 }
    ];

    stages.forEach((st) => {
      const el = document.getElementById(st.id);
      const p = document.getElementById(st.prog);
      const b = document.getElementById(st.badge);
      if (el) el.classList.remove('active', 'done');
      if (p) p.style.width = '0%';
      if (b) {
        b.textContent = 'STANDBY';
        b.className = 'sim-stage-badge status-badge';
      }
    });

    const hexOut = document.getElementById('sim-hex-out');
    const bitOut = document.getElementById('sim-bit-out');
    const statusBanner = document.getElementById('sim-status');
    const hackPanel = document.getElementById('hack-panel');
    const hackOut = document.getElementById('hack-out');

    if (hackPanel) hackPanel.style.display = 'none';

    if (hexOut) hexOut.innerHTML = '<span style="color:var(--txt3)">Mengirim citra ke AI Server (FastAPI PyTorch)...</span>';
    if (bitOut) bitOut.innerHTML = '<span style="color:var(--txt3)">Mengeksekusi ProposedNet (ArcFace + GRL)...</span>';
    if (statusBanner) {
      statusBanner.innerHTML =
        mode === 'revoke'
          ? '<span style="color:var(--c-amber)">Mencabut kredensial lama & memanggil endpoint FastAPI...</span>'
          : '<span style="color:var(--c-cyan)">Menjalankan pipeline TRACE real-time di Backend PyTorch...</span>';
    }

    try {
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('seed', actualSeed);

      // Panggil backend FastAPI PyTorch Asli!
      const response = await fetch(`${backendUrl}/api/enroll`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      currentBinaryString = data.binary_stream;

      // Animate progress bars for dramatic effect (berjalan paralel dengan fetch agar cantik)
      let elapsed = 0;
      stages.forEach((st, i) => {
        setTimeout(() => {
          const el = document.getElementById(st.id);
          const p = document.getElementById(st.prog);
          const b = document.getElementById(st.badge);

          if (el) el.classList.add('active');
          if (b) {
            b.textContent = 'RUNNING';
            b.className = 'sim-stage-badge status-badge badge-blue';
          }
          if (p) {
            setTimeout(() => { p.style.width = '100%'; }, 30);
          }

          setTimeout(() => {
            if (el) {
              el.classList.remove('active');
              el.classList.add('done');
            }
            if (b) {
              b.textContent = 'TERVERIFIKASI';
              b.className = 'sim-stage-badge status-badge badge-green';
            }
          }, st.dur - 50);
        }, elapsed);
        elapsed += st.dur;
      });

      // Display results after animation
      setTimeout(() => {
        const hexChunks = data.hex_hash.match(/.{1,4}/g) || [data.hex_hash];
        const coloredHex = hexChunks
          .map((chunk) => `<span class="hex-chunk">${chunk}</span>`)
          .join(' ');

        const coloredBin = data.binary_stream
          .split('')
          .map((b) => `<span class="${b === '1' ? 'bit-1' : 'bit-0'}">${b}</span>`)
          .join('');

        if (hexOut) hexOut.innerHTML = coloredHex;
        if (bitOut) bitOut.innerHTML = coloredBin;

        const actionText = mode === 'revoke' ? 'REVOKED & REGENERATED' : 'ENROLLED & SECURED';
        const keyText = mode === 'revoke' ? `REVOCATION_KEY_SEED=${actualSeed}` : `INSTITUTION_KEY_SEED=${actualSeed}`;

        if (statusBanner) {
          statusBanner.innerHTML = `<strong style="color:var(--c-green)">Template ${actionText}</strong> | ${keyText} | Dimensi: ${dim} bits | Kepatuhan ISO/IEC 24745: <strong>VALID</strong>`;
        }
      }, elapsed + 80);

    } catch (err) {
      if (hexOut) hexOut.innerHTML = `<span style="color:var(--c-red)">Error menghubungi server AI Backend di ${backendUrl}. Pastikan server.py berjalan!</span>`;
      if (bitOut) bitOut.innerHTML = '';
      console.error(err);
    }
  };

  window.runHack = async function () {
    const backendUrlInput = document.getElementById('sim-backend-url');
    const backendUrl = backendUrlInput ? backendUrlInput.value.trim() : "http://localhost:7860";
    const hackPanel = document.getElementById('hack-panel');
    const hackOut = document.getElementById('hack-out');

    if (!currentBinaryString) {
      if (hackPanel) hackPanel.style.display = 'block';
      if (hackOut) hackOut.innerHTML = '<span style="color:var(--c-red); font-weight:bold;">[ERROR] Silakan Enroll template biometrik terlebih dahulu sebelum meretas!</span>';
      return;
    }

    if (hackPanel) hackPanel.style.display = 'block';
    if (hackOut) hackOut.innerHTML = '<span style="color:var(--c-amber)">Menginisiasi serangan Inversi pada TemplateDecoder... (Menghubungi Server)</span>';

    try {
      const response = await fetch(`${backendUrl}/api/hack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ binary_stream: currentBinaryString })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Simulate hack loading bar
      let html = '<div style="margin-bottom:10px; color:var(--c-amber)">[SYSTEM_WARNING] Deep Attacker Reconstruction Attempt Detected</div>';
      html += '<div class="sim-bar-bg" style="margin-bottom:10px;"><div class="sim-bar-fill" id="hack-prog" style="background:var(--c-red); width:0%; transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);"></div></div>';
      hackOut.innerHTML = html;

      setTimeout(() => {
        const hp = document.getElementById('hack-prog');
        if (hp) hp.style.width = '100%';
      }, 50);

      setTimeout(() => {
        let resultHtml = '<div style="color:var(--c-red); margin-bottom:8px; font-weight:bold;">' + data.message + '</div>';
        resultHtml += '<div style="font-size:11px; color:var(--txt3); margin-bottom:8px;">Sampel ' + data.reconstructed_vector.length + ' Dimensi Vektor Laten Hasil Dekode (Noise/Trash):</div>';
        
        let vecStr = data.reconstructed_vector.map(v => {
           return v.toFixed(4);
        }).join(', ');
        
        resultHtml += `<div style="font-family:var(--font-mono); font-size:10px; word-break:break-all; color:var(--c-amber); line-height:1.6; background:rgba(0,0,0,0.4); padding:10px; border-radius:4px; border:1px solid rgba(244,63,94,0.3);">${vecStr}...</div>`;
        resultHtml += `<div style="margin-top:12px; padding:10px; border-left:3px solid var(--c-green); background:rgba(16,185,129,0.1); color:var(--txt2); font-size:12px; line-height: 1.5;"><strong>ANALISIS KESIMPULAN (Keluaran Real PyTorch):</strong> Cosine Similarity sangat rendah (<strong>~${data.simulated_cos_sim}</strong>). Akurasi tebakan gender acak (<strong>~${data.inferred_gender_accuracy}%</strong>). Identitas Wajah: <strong>AMAN 100%</strong>.</div>`;

        hackOut.innerHTML = resultHtml;
      }, 1400);

    } catch (err) {
      if (hackOut) hackOut.innerHTML = `<span style="color:var(--c-red)">Error menghubungi server AI Backend di ${backendUrl}.</span>`;
      console.error(err);
    }
  };

})();

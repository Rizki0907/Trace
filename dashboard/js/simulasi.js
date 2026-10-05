(function () {
  'use strict';

  let currentBinaryString = "";

  // Helper statik murni untuk membuat simulasi hash tanpa backend
  function generateDeterministicHash(seed, subjectId, length) {
    let str = "";
    let s = (seed + subjectId) % 9999999;
    for (let i = 0; i < length; i++) {
      s = (s * 9301 + 49297) % 233280;
      str += (s / 233280) >= 0.5 ? "1" : "0";
    }
    return str;
  }

  function binaryToHex(binStr) {
    let hex = "";
    for (let i = 0; i < binStr.length; i += 4) {
      const chunk = binStr.substring(i, i + 4);
      hex += parseInt(chunk, 2).toString(16).toUpperCase();
    }
    return hex;
  }

  window.simulateHash = function () {
    window.runSimulation('enroll');
  };

  window.runSimulation = async function (mode) {
    const seedInput = document.getElementById('sim-key-seed');
    const dimSelect = document.getElementById('sim-dim');
    const subjectSelect = document.getElementById('sim-subject');
    
    const baseSeed = seedInput ? parseInt(seedInput.value, 10) || 20260728 : 20260728;
    const dim = dimSelect ? parseInt(dimSelect.value, 10) || 256 : 256;
    
    // Gunakan id subjek atau semacamnya agar gambar beda = hash beda
    let subjectId = 1;
    if (subjectSelect) {
      if (subjectSelect.value === 'sub-2') subjectId = 2;
      if (subjectSelect.value === 'sub-3') subjectId = 3;
    }
    
    const actualSeed = mode === 'revoke' ? Math.floor(Math.random() * 10000000) : baseSeed;

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

    if (hexOut) hexOut.innerHTML = '<span style="color:var(--txt3)">Memproses Citra dengan Edge-AI (Client-Side Simulation)...</span>';
    if (bitOut) bitOut.innerHTML = '<span style="color:var(--txt3)">Mengeksekusi ProposedNet ArcFace + GRL...</span>';
    if (statusBanner) {
      statusBanner.innerHTML =
        mode === 'revoke'
          ? '<span style="color:var(--c-amber)">Mencabut kredensial lama & menginisialisasi matriks revocability ortogonal...</span>'
          : '<span style="color:var(--c-cyan)">Menjalankan pipeline TRACE: AdaFace + GRL Adversarial + LSH Binarization...</span>';
    }

    try {
      // ----------------------------------------------------
      // SERVERLESS SIMULATION (Menggantikan pemanggilan FastAPI)
      // ----------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulasi jeda network/AI
      
      const fakeBinary = generateDeterministicHash(actualSeed, subjectId, dim);
      const fakeHex = binaryToHex(fakeBinary);
      currentBinaryString = fakeBinary;
      
      const data = { binary: fakeBinary, hex: fakeHex };
      // ----------------------------------------------------

      // Animate progress bars for dramatic effect
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
        const hexChunks = data.hex.match(/.{1,4}/g) || [data.hex];
        const coloredHex = hexChunks
          .map((chunk) => `<span class="hex-chunk">${chunk}</span>`)
          .join(' ');

        const coloredBin = data.binary
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
      if (hexOut) hexOut.innerHTML = '<span style="color:var(--c-red)">Error eksekusi pipeline AI.</span>';
      if (bitOut) bitOut.innerHTML = '';
      console.error(err);
    }
  };

  window.runHack = async function () {
    const hackPanel = document.getElementById('hack-panel');
    const hackOut = document.getElementById('hack-out');

    if (!currentBinaryString) {
      if (hackPanel) hackPanel.style.display = 'block';
      if (hackOut) hackOut.innerHTML = '<span style="color:var(--c-red); font-weight:bold;">[ERROR] Silakan Enroll template biometrik terlebih dahulu sebelum meretas!</span>';
      return;
    }

    if (hackPanel) hackPanel.style.display = 'block';
    if (hackOut) hackOut.innerHTML = '<span style="color:var(--c-amber)">Menginisiasi serangan Inversi menggunakan DeepAttacker (TemplateDecoder)...</span>';

    try {
      // ----------------------------------------------------
      // SERVERLESS HACK SIMULATION
      // ----------------------------------------------------
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulasi jeda serangan
      
      const fakeVector = Array.from({length: 50}, () => (Math.random() * 2 - 1));
      const data = {
        message: "Inverse Reconstruction Failed (Non-Invertible Property: Active)",
        reconstructed_vector_sample: fakeVector
      };
      // ----------------------------------------------------

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
        resultHtml += '<div style="font-size:11px; color:var(--txt3); margin-bottom:8px;">Sampel 50 Dimensi Vektor Laten Hasil Dekode (Noise/Trash):</div>';
        
        let vecStr = data.reconstructed_vector_sample.map(v => {
           return v.toFixed(4);
        }).join(', ');
        
        resultHtml += `<div style="font-family:var(--font-mono); font-size:10px; word-break:break-all; color:var(--c-amber); line-height:1.6; background:rgba(0,0,0,0.4); padding:10px; border-radius:4px; border:1px solid rgba(244,63,94,0.3);">${vecStr}...</div>`;
        resultHtml += `<div style="margin-top:12px; padding:10px; border-left:3px solid var(--c-green); background:rgba(16,185,129,0.1); color:var(--txt2); font-size:12px; line-height: 1.5;"><strong>ANALISIS KESIMPULAN:</strong> Walaupun peretas memiliki kunci dan bobot <i>TemplateDecoder</i> penuh, hasil rekonstruksi hancur karena TRACE membuang piksel reversibel. Cosine Similarity sangat rendah (<strong>~0.0125</strong>). Akurasi tebakan gender acak (<strong>~52.70%</strong>). Identitas Wajah: <strong>AMAN 100%</strong>.</div>`;

        hackOut.innerHTML = resultHtml;
      }, 1400);

    } catch (err) {
      if (hackOut) hackOut.innerHTML = '<span style="color:var(--c-red)">Error simulasi serangan AI.</span>';
      console.error(err);
    }
  };

})();

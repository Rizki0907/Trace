(function () {
  'use strict';

  window.simulateHash = function () {
    window.runSimulation('enroll');
  };

  window.runSimulation = function (mode) {
    const seedInput = document.getElementById('sim-key-seed');
    const dimSelect = document.getElementById('sim-dim');
    const baseSeed = seedInput ? parseInt(seedInput.value, 10) || 20260728 : 20260728;
    const dim = dimSelect ? parseInt(dimSelect.value, 10) || 256 : 256;
    const actualSeed = mode === 'revoke' ? 20260999 : baseSeed;

    const stages = [
      { id: 'sstep-1', prog: 'prog-1', badge: 'sstep-1-badge', dur: 350 },
      { id: 'sstep-2', prog: 'prog-2', badge: 'sstep-2-badge', dur: 300 },
      { id: 'sstep-3', prog: 'prog-3', badge: 'sstep-3-badge', dur: 450 },
      { id: 'sstep-4', prog: 'prog-4', badge: 'sstep-4-badge', dur: 300 }
    ];

    stages.forEach((st) => {
      const el = document.getElementById(st.id);
      const p = document.getElementById(st.prog);
      const b = document.getElementById(st.badge);
      if (el) {
        el.classList.remove('active', 'done');
      }
      if (p) p.style.width = '0%';
      if (b) {
        b.textContent = 'STANDBY';
        b.className = 'sim-stage-badge status-badge';
      }
    });

    const hexOut = document.getElementById('sim-hex-out');
    const bitOut = document.getElementById('sim-bit-out');
    const statusBanner = document.getElementById('sim-status');

    if (hexOut) hexOut.innerHTML = '<span style="color:var(--txt3)">Memproses ekstraksi & transformasi...</span>';
    if (bitOut) bitOut.innerHTML = '<span style="color:var(--txt3)">Menghasilkan representasi biner...</span>';
    if (statusBanner) {
      statusBanner.innerHTML =
        mode === 'revoke'
          ? '<span style="color:var(--c-amber)">Mencabut kredensial lama & menginisialisasi matriks revocability ortogonal...</span>'
          : '<span style="color:var(--c-cyan)">Menjalankan pipeline TRACE: AdaFace + GRL Adversarial + LSH Binarization...</span>';
    }

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
          setTimeout(() => {
            p.style.width = '100%';
          }, 30);
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

    setTimeout(() => {
      const rng = (n) => {
        const x = Math.sin(actualSeed * n + dim) * 10000;
        return Math.abs(x - Math.floor(x));
      };

      const HEX_CHARS = '0123456789ABCDEF';
      let hexStr = '';
      const hexLen = Math.floor(dim / 2);
      for (let i = 0; i < hexLen; i++) {
        hexStr += HEX_CHARS[Math.floor(rng(i * 7 + 1) * 16)];
      }

      let binStr = '';
      for (let i = 0; i < dim; i++) {
        binStr += rng(i * 3 + actualSeed) > 0.5 ? '1' : '0';
      }

      const hexChunks = hexStr.match(/.{1,4}/g) || [hexStr];
      const coloredHex = hexChunks
        .map((chunk) => `<span class="hex-chunk">${chunk}</span>`)
        .join(' ');

      const coloredBin = binStr
        .split('')
        .map((b) => `<span class="${b === '1' ? 'bit-1' : 'bit-0'}">${b}</span>`)
        .join('');

      if (hexOut) hexOut.innerHTML = coloredHex;
      if (bitOut) bitOut.innerHTML = coloredBin;

      const actionText = mode === 'revoke' ? 'REVOKED & REGENERATED' : 'ENROLLED & SECURED';
      const keyText = mode === 'revoke' ? 'REVOCATION_KEY_SEED=20260999' : `INSTITUTION_KEY_SEED=${actualSeed}`;

      if (statusBanner) {
        statusBanner.innerHTML = `<strong style="color:var(--c-green)">Template ${actionText}</strong> | ${keyText} | Dimensi: ${dim} bits | Kepatuhan ISO/IEC 24745: <strong>VALID</strong>`;
      }
    }, elapsed + 80);
  };
})();

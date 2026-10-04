(function () {
  'use strict';

  let mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let currentRotX = 0;
  let currentRotY = 0;

  function initBootloader() {
    const bootScreen = document.getElementById('boot-screen');
    const bootLog = document.getElementById('boot-log');
    const bootFill = document.getElementById('boot-fill');
    const bootPct = document.getElementById('boot-pct');

    if (!bootScreen) return;

    const logs = [
      { text: 'Menginisialisasi TRACE Core OS v2.4...', delay: 150 },
      { text: 'Memuat bobot ProposedNet & AdaFace embedding...', delay: 400 },
      { text: 'Menghubungkan generator kunci matriks ortogonal...', delay: 700 },
      { text: 'TRACE CORE v2.4 // PROTOKOL KRIPTOGRAFIS DIAKTIFKAN // 100% [TERPROTEKSI]', delay: 1000, highlight: true }
    ];

    logs.forEach((item, index) => {
      setTimeout(() => {
        if (bootLog) {
          const line = document.createElement('div');
          line.className = 'boot-log-line';
          if (item.highlight) {
            line.innerHTML = `<span class="prefix">&gt;&gt;</span> <span class="success">${item.text}</span>`;
          } else {
            line.innerHTML = `<span class="prefix">&gt;</span> <span>${item.text}</span>`;
          }
          bootLog.appendChild(line);
        }

        const pct = Math.min(100, Math.round(((index + 1) / logs.length) * 100));
        if (bootFill) bootFill.style.width = pct + '%';
        if (bootPct) bootPct.textContent = pct + '%';
      }, item.delay);
    });

    setTimeout(() => {
      bootScreen.classList.add('boot-done');
      setTimeout(() => {
        bootScreen.style.display = 'none';
      }, 550);
    }, 1250);
  }

  function initCyberCanvas() {
    const canvas = document.getElementById('cyber-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const numPoints = Math.min(65, Math.floor((width * height) / 18000));
    const points = [];

    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 1.5 + 1
      });
    }

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    function animate() {
      ctx.clearRect(0, 0, width, height);
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const nodeColor = isDark ? 'rgba(0, 240, 255, 0.55)' : 'rgba(2, 132, 199, 0.4)';
      const lineColor = isDark ? '0, 240, 255' : '2, 132, 199';

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dx = mousePos.x - p.x;
        const dy = mousePos.y - p.y;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        if (distToMouse < 140) {
          p.x += (dx / distToMouse) * 0.5;
          p.y += (dy / distToMouse) * 0.5;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        for (let j = i + 1; j < points.length; j++) {
          const p2 = points[j];
          const d2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d2 < 120) {
            const alpha = (1 - d2 / 120) * (isDark ? 0.2 : 0.12);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${lineColor}, ${alpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(animate);
    }

    animate();
  }

  function init3DFaceMesh() {
    const canvas = document.getElementById('face-mesh-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = (canvas.width = canvas.height = 320);
    const center = size / 2;

    const baseVertices = [
      { x: 0, y: -90, z: 0 },
      { x: -35, y: -75, z: -15 }, { x: 35, y: -75, z: -15 },
      { x: -60, y: -50, z: -30 }, { x: 60, y: -50, z: -30 },
      { x: -30, y: -45, z: 10 }, { x: 30, y: -45, z: 10 },
      { x: 0, y: -40, z: 15 },
      { x: -45, y: -25, z: -15 }, { x: 45, y: -25, z: -15 },
      { x: -25, y: -20, z: 5 }, { x: 25, y: -20, z: 5 },
      { x: 0, y: -15, z: 25 },
      { x: -12, y: 5, z: 32 }, { x: 12, y: 5, z: 32 },
      { x: 0, y: 12, z: 38 },
      { x: -28, y: 15, z: 12 }, { x: 28, y: 15, z: 12 },
      { x: -65, y: -10, z: -35 }, { x: 65, y: -10, z: -35 },
      { x: -55, y: 20, z: -30 }, { x: 55, y: 20, z: -30 },
      { x: -20, y: 32, z: 24 }, { x: 20, y: 32, z: 24 },
      { x: 0, y: 30, z: 28 },
      { x: -16, y: 45, z: 22 }, { x: 16, y: 45, z: 22 },
      { x: 0, y: 50, z: 25 },
      { x: -40, y: 50, z: -15 }, { x: 40, y: 50, z: -15 },
      { x: -25, y: 72, z: 10 }, { x: 25, y: 72, z: 10 },
      { x: 0, y: 80, z: 18 },
      { x: -35, y: 88, z: -10 }, { x: 35, y: 88, z: -10 },
      { x: 0, y: 98, z: 5 }
    ];

    const edges = [
      [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 6], [5, 7], [6, 7],
      [3, 8], [4, 9], [8, 10], [9, 11], [10, 12], [11, 12], [7, 12],
      [12, 13], [12, 14], [13, 15], [14, 15], [10, 16], [11, 17],
      [8, 18], [9, 19], [18, 20], [19, 21], [16, 22], [17, 23],
      [15, 24], [22, 24], [23, 24], [22, 25], [23, 26], [24, 27],
      [25, 27], [26, 27], [20, 28], [21, 29], [25, 30], [26, 31],
      [27, 32], [30, 32], [31, 32], [28, 33], [29, 34], [30, 33],
      [31, 34], [32, 35], [33, 35], [34, 35], [5, 10], [6, 11],
      [16, 20], [17, 21], [28, 30], [29, 31]
    ];

    let laserY = -90;
    let laserDir = 1.2;

    function render() {
      ctx.clearRect(0, 0, size, size);

      const targetRotX = (mousePos.y - window.innerHeight / 2) * 0.0007;
      const targetRotY = (mousePos.x - window.innerWidth / 2) * 0.0009;
      currentRotX += (targetRotX - currentRotX) * 0.08;
      currentRotY += (targetRotY - currentRotY) * 0.08;

      laserY += laserDir;
      if (laserY > 95 || laserY < -95) laserDir *= -1;

      const cosX = Math.cos(currentRotX);
      const sinX = Math.sin(currentRotX);
      const cosY = Math.cos(currentRotY);
      const sinY = Math.sin(currentRotY);

      const projected = baseVertices.map((v) => {
        let x1 = v.x * cosY - v.z * sinY;
        let z1 = v.z * cosY + v.x * sinY;
        let y1 = v.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + v.y * sinX;

        const fov = 340;
        const scale = fov / (fov + z2);
        return {
          x: center + x1 * scale * 1.35,
          y: center + y1 * scale * 1.35,
          z: z2,
          origY: v.y
        };
      });

      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.strokeStyle = isDark ? 'rgba(0, 240, 255, 0.45)' : 'rgba(2, 132, 199, 0.45)';
      ctx.lineWidth = 1.1;

      edges.forEach(([i, j]) => {
        const p1 = projected[i];
        const p2 = projected[j];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      projected.forEach((p) => {
        const distLaser = Math.abs(p.origY - laserY);
        const isNearLaser = distLaser < 15;

        ctx.beginPath();
        ctx.arc(p.x, p.y, isNearLaser ? 3.2 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = isNearLaser
          ? (isDark ? '#ffb703' : '#d97706')
          : (isDark ? '#00f0ff' : '#0284c7');
        ctx.fill();

        if (isNearLaser) {
          ctx.strokeStyle = isDark ? 'rgba(255, 183, 3, 0.6)' : 'rgba(217, 119, 6, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      requestAnimationFrame(render);
    }

    render();
  }

  function initScrollReveal() {
    const targets = document.querySelectorAll('.scroll-reveal');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -25px 0px' }
    );

    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 40 && rect.bottom > 0) {
        el.classList.add('revealed');
      } else {
        observer.observe(el);
      }
    });
  }

  window.addEventListener('mousemove', (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
  });

  window.toggleTheme = function () {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('trace-theme', newTheme);

    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      if (newTheme === 'light') {
        themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
      } else {
        themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
      }
    }

    if (window.renderCharts) {
      setTimeout(() => {
        window.renderCharts();
      }, 50);
    }
  };

  window.nav = function (pageId, el) {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.add('active');

    document.querySelectorAll('.nav-tab-btn, .mobile-drawer-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-page') === pageId);
    });

    const mobileDrawer = document.getElementById('mobile-drawer');
    if (mobileDrawer) mobileDrawer.classList.remove('open');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      initScrollReveal();
      if (window.renderCharts) window.renderCharts();
    }, 60);
  };

  window.toggleMobileMenu = function () {
    const mobileDrawer = document.getElementById('mobile-drawer');
    if (mobileDrawer) mobileDrawer.classList.toggle('open');
  };

  document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('trace-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon && savedTheme === 'light') {
      themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }

    initBootloader();
    initCyberCanvas();
    init3DFaceMesh();
    initScrollReveal();
  });
})();

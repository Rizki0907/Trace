(function () {
  'use strict';

  function getThemeConfig() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const cBg = 'transparent';
    const cTxt = isDark ? '#94a3b8' : '#475569';
    const cHeading = isDark ? '#f1f5f9' : '#0f172a';
    const gridCol = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.07)';
    const hoverBg = isDark ? 'rgba(13, 18, 30, 0.95)' : '#ffffff';
    const hoverBorder = isDark ? 'rgba(0, 240, 255, 0.3)' : 'rgba(15, 23, 42, 0.12)';
    const hoverFontCol = isDark ? '#f1f5f9' : '#0f172a';

    const palette = isDark
      ? ['#00f0ff', '#ffb703', '#10b981', '#f43f5e', '#8b5cf6']
      : ['#0284c7', '#d97706', '#16a34a', '#e11d48', '#7c3aed'];

    const csHeat = isDark
      ? [[0, '#00f0ff'], [0.5, '#8b5cf6'], [1, '#f43f5e']]
      : [[0, '#e0f2fe'], [0.5, '#38bdf8'], [1, '#0284c7']];

    const hoverConf = {
      bgcolor: hoverBg,
      font: { family: 'Inter, sans-serif', size: 12, color: hoverFontCol },
      bordercolor: hoverBorder
    };

    const baseLayout = {
      paper_bgcolor: cBg,
      plot_bgcolor: cBg,
      font: { color: cTxt, family: 'Inter, sans-serif', size: 11 },
      margin: { t: 30, r: 25, l: 48, b: 45 },
      autosize: true,
      hoverlabel: hoverConf,
      xaxis: { gridcolor: gridCol, zerolinecolor: gridCol, tickfont: { color: cTxt } },
      yaxis: { gridcolor: gridCol, zerolinecolor: gridCol, tickfont: { color: cTxt } }
    };

    return { isDark, cBg, cTxt, cHeading, gridCol, palette, csHeat, hoverConf, baseLayout };
  }

  function renderHeatmap(cfg) {
    const el = document.getElementById('plt-heatmap');
    if (!el || typeof cancelfaceData === 'undefined' || !cancelfaceData.final_comparison) return;

    const pb = cancelfaceData.final_comparison;
    const zData = pb.map((d) => [
      d['Rank 1 Accuracy'],
      d['Rank 5 Accuracy'],
      d['Akurasi Tebakan Jenis Kelamin'],
      d['Akurasi Tebakan Kelompok Usia'],
      d['Rata Rata Kemiripan Kosinus'],
      d['Tingkat Keberhasilan Reidentifikasi']
    ]);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const layout = {
      ...cfg.baseLayout,
      margin: { t: 30, r: 25, l: isMobile ? 95 : 125, b: 65 },
      xaxis: { tickangle: -20, gridcolor: cfg.gridCol, tickfont: { color: cfg.cTxt, size: isMobile ? 9 : 10.5 } },
      yaxis: { tickfont: { weight: 'bold', color: cfg.cHeading, size: isMobile ? 9.5 : 11 }, gridcolor: cfg.gridCol }
    };

    Plotly.newPlot(
      'plt-heatmap',
      [
        {
          z: zData,
          x: ['Rank-1 Acc', 'Rank-5 Acc', 'Gender Acc', 'Age Acc', 'Cosine Sim', 'Re-ID'],
          y: pb.map((d) => d.Metode),
          type: 'heatmap',
          colorscale: cfg.csHeat,
          xgap: 2,
          ygap: 2,
          hoverongaps: false,
          hovertemplate: 'Metode: <b>%{y}</b><br>Metrik: %{x}<br>Nilai: <b>%{z:.4f}</b><extra></extra>',
          showscale: true,
          colorbar: { thickness: 10, len: 0.85, outlinecolor: 'rgba(0,0,0,0)', tickfont: { color: cfg.cTxt, size: 10 } }
        }
      ],
      layout,
      { displayModeBar: false, responsive: true }
    );
  }

  function renderRobustness(cfg) {
    const el = document.getElementById('plt-kualitas');
    if (!el || typeof cancelfaceData === 'undefined' || !cancelfaceData.robustness) return;

    const kq = cancelfaceData.robustness;
    const methods = [...new Set(kq.map((d) => d.Metode))];
    const traces = methods.map((m, i) => {
      const dataM = kq.filter((d) => d.Metode === m);
      return {
        name: m,
        x: dataM.map((d) => d['Tingkat Kualitas']),
        y: dataM.map((d) => d['Rank 1 Accuracy']),
        type: 'bar',
        marker: { color: cfg.palette[i % cfg.palette.length] }
      };
    });

    const layout = {
      ...cfg.baseLayout,
      barmode: 'group',
      margin: { t: 30, r: 35, l: 45, b: 65 },
      xaxis: { title: 'Resolusi Citra Wajah (BBox Area)', gridcolor: cfg.gridCol, tickfont: { color: cfg.cTxt, size: 10 } },
      yaxis: { title: 'Rank-1 Accuracy', gridcolor: cfg.gridCol, tickfont: { color: cfg.cTxt } },
      legend: { orientation: 'h', y: -0.28, x: 0.5, xanchor: 'center', font: { color: cfg.cTxt, size: 10.5 } }
    };

    Plotly.newPlot('plt-kualitas', traces, layout, { displayModeBar: false, responsive: true });
  }

  function renderEdaSubsets(cfg) {
    if (typeof cancelfaceData === 'undefined') return;
    const subColors = ['#00f0ff', '#6366f1', '#f43f5e', '#ffb703'];
    const lBase = { ...cfg.baseLayout, margin: { t: 30, r: 15, l: 50, b: 50 } };

    if (cancelfaceData.eda_subset_img && document.getElementById('plt-eda-subset-img')) {
      Plotly.newPlot(
        'plt-eda-subset-img',
        [
          {
            x: cancelfaceData.eda_subset_img.map((d) => d.subset),
            y: cancelfaceData.eda_subset_img.map((d) => d.count),
            type: 'bar',
            marker: { color: subColors },
            hovertemplate: '<b>%{x}</b><br>%{y:,} Citra<extra></extra>'
          }
        ],
        {
          ...lBase,
          title: { text: 'Jumlah Citra per Subset Data', font: { size: 12, color: cfg.cHeading } },
          xaxis: { title: 'Subset Data', tickangle: -15, gridcolor: cfg.gridCol },
          yaxis: { title: 'Jumlah Citra', gridcolor: cfg.gridCol }
        },
        { displayModeBar: false, responsive: true }
      );
    }

    if (cancelfaceData.eda_subset_id && document.getElementById('plt-eda-subset-id')) {
      Plotly.newPlot(
        'plt-eda-subset-id',
        [
          {
            x: cancelfaceData.eda_subset_id.map((d) => d.subset),
            y: cancelfaceData.eda_subset_id.map((d) => d.count),
            type: 'bar',
            marker: { color: subColors },
            hovertemplate: '<b>%{x}</b><br>%{y:,} Identitas<extra></extra>'
          }
        ],
        {
          ...lBase,
          title: { text: 'Jumlah Identitas Unik per Subset Data', font: { size: 12, color: cfg.cHeading } },
          xaxis: { title: 'Subset Data', tickangle: -15, gridcolor: cfg.gridCol },
          yaxis: { title: 'Identitas Unik', gridcolor: cfg.gridCol }
        },
        { displayModeBar: false, responsive: true }
      );
    }
  }

  function renderEdaCamera(cfg) {
    const el = document.getElementById('plt-eda-camera');
    if (!el || typeof cancelfaceData === 'undefined' || !cancelfaceData.eda_camera) return;

    const cam = cancelfaceData.eda_camera;
    const stats = cancelfaceData.eda_camera_stats;
    const titleText = stats
      ? `Distribusi Citra per Kamera (Top 15 + Lainnya | Median: ${stats.median}, IQR: ${stats.iqr})`
      : 'Distribusi Citra per Kamera CCTV';

    Plotly.newPlot(
      'plt-eda-camera',
      [
        {
          x: cam.map((d) => d.camera),
          y: cam.map((d) => d.count),
          type: 'bar',
          marker: {
            color: cam.map((d) => (d.camera === 'Lainnya' ? cfg.palette[1] : cfg.isDark ? '#334155' : '#94a3b8'))
          },
          hovertemplate: '<b>%{x}</b><br>%{y:,} Citra<extra></extra>'
        }
      ],
      {
        ...cfg.baseLayout,
        margin: { t: 40, r: 15, l: 55, b: 70 },
        title: { text: titleText, font: { size: 12, color: cfg.cHeading } },
        xaxis: { title: 'ID Kamera CCTV', tickangle: -45, tickfont: { size: 9 }, gridcolor: cfg.gridCol },
        yaxis: { title: 'Jumlah Citra', gridcolor: cfg.gridCol }
      },
      { displayModeBar: false, responsive: true }
    );
  }

  function renderEdaQuality(cfg) {
    if (typeof cancelfaceData === 'undefined' || !cancelfaceData.eda_quality) return;
    const ql = cancelfaceData.eda_quality;
    const hLayout = { ...cfg.baseLayout, margin: { t: 40, r: 15, l: 50, b: 50 } };

    if (document.getElementById('plt-eda-laplacian')) {
      Plotly.newPlot(
        'plt-eda-laplacian',
        [
          {
            x: ql.map((d) => d.laplacian),
            type: 'histogram',
            nbinsx: 40,
            marker: { color: cfg.palette[0], opacity: 0.85 }
          }
        ],
        {
          ...hLayout,
          title: { text: 'Distribusi Ketajaman (Laplacian)', font: { size: 11, color: cfg.cHeading } },
          xaxis: { title: 'Varians Laplacian', gridcolor: cfg.gridCol },
          yaxis: { title: 'Frekuensi', gridcolor: cfg.gridCol }
        },
        { displayModeBar: false, responsive: true }
      );
    }

    if (document.getElementById('plt-eda-width')) {
      Plotly.newPlot(
        'plt-eda-width',
        [
          {
            x: ql.map((d) => d.width),
            type: 'histogram',
            nbinsx: 40,
            marker: { color: cfg.palette[1], opacity: 0.85 }
          }
        ],
        {
          ...hLayout,
          title: { text: 'Distribusi Lebar Citra Piksel', font: { size: 11, color: cfg.cHeading } },
          xaxis: { title: 'Lebar Piksel', gridcolor: cfg.gridCol },
          yaxis: { title: 'Frekuensi', gridcolor: cfg.gridCol }
        },
        { displayModeBar: false, responsive: true }
      );
    }

    if (document.getElementById('plt-eda-brightness')) {
      Plotly.newPlot(
        'plt-eda-brightness',
        [
          {
            x: ql.map((d) => d.brightness),
            type: 'histogram',
            nbinsx: 40,
            marker: { color: cfg.palette[2], opacity: 0.85 }
          }
        ],
        {
          ...hLayout,
          title: { text: 'Distribusi Kecerahan Citra', font: { size: 11, color: cfg.cHeading } },
          xaxis: { title: 'Intensitas Rata-rata', gridcolor: cfg.gridCol },
          yaxis: { title: 'Frekuensi', gridcolor: cfg.gridCol }
        },
        { displayModeBar: false, responsive: true }
      );
    }
  }

  function renderAblation(cfg) {
    const el = document.getElementById('plt-ablasi');
    if (!el || typeof cancelfaceData === 'undefined' || !cancelfaceData.ablation) return;

    const ab = cancelfaceData.ablation;
    Plotly.newPlot(
      'plt-ablasi',
      [
        {
          x: ab.map((d) => d['TEMPLATE_DIM']),
          y: ab.map((d) => d['Rank 1 Accuracy']),
          type: 'scatter',
          mode: 'lines+markers',
          line: { color: cfg.palette[0], width: 3 },
          marker: { size: 8, color: cfg.palette[1] }
        }
      ],
      {
        ...cfg.baseLayout,
        margin: { t: 30, r: 20, l: 50, b: 50 },
        xaxis: { title: 'Dimensi Template (Bits)', gridcolor: cfg.gridCol },
        yaxis: { title: 'Rank-1 Accuracy', gridcolor: cfg.gridCol }
      },
      { displayModeBar: false, responsive: true }
    );
  }

  function renderCmc(cfg) {
    const el = document.getElementById('plt-cmc');
    if (!el || typeof cancelfaceData === 'undefined' || !cancelfaceData.cmc_curves) return;

    const cmc = cancelfaceData.cmc_curves;
    const methods = Object.keys(cmc);
    const traces = methods.map((m, i) => ({
      x: Array.from({ length: cmc[m].length }, (_, j) => j + 1),
      y: cmc[m],
      name: m,
      mode: 'lines',
      line: { width: 3, shape: 'spline', smoothing: 1.3, color: cfg.palette[i % cfg.palette.length] }
    }));

    Plotly.newPlot(
      'plt-cmc',
      traces,
      {
        ...cfg.baseLayout,
        margin: { t: 30, r: 30, b: 60, l: 45 },
        xaxis: { title: 'Rank-K', gridcolor: cfg.gridCol },
        yaxis: { title: 'Identification Rate', range: [0, 1.05], gridcolor: cfg.gridCol },
        legend: { orientation: 'h', y: -0.26, x: 0.5, xanchor: 'center', font: { color: cfg.cTxt, size: 10.5 } }
      },
      { displayModeBar: false, responsive: true }
    );
  }

  window.renderScoreDist = function (method) {
    if (typeof cancelfaceData === 'undefined' || !cancelfaceData.score_distribution) return;
    const el = document.getElementById('plt-score-dist');
    if (!el) return;

    const chosen = method || document.getElementById('sel-score-method')?.value || 'Metode Usulan';
    const sd = cancelfaceData.score_distribution[chosen];
    if (!sd) return;

    const cfg = getThemeConfig();
    const traceMated = {
      x: sd.bins,
      y: sd.mated,
      name: 'Mated (Asli)',
      fill: 'tozeroy',
      type: 'scatter',
      mode: 'none',
      fillcolor: cfg.isDark ? 'rgba(16, 185, 129, 0.45)' : 'rgba(22, 163, 74, 0.45)'
    };

    const traceUnmated = {
      x: sd.bins,
      y: sd.unmated,
      name: 'Unmated (Penyusup)',
      fill: 'tozeroy',
      type: 'scatter',
      mode: 'none',
      fillcolor: cfg.isDark ? 'rgba(244, 63, 94, 0.45)' : 'rgba(225, 29, 72, 0.45)'
    };

    Plotly.newPlot(
      'plt-score-dist',
      [traceUnmated, traceMated],
      {
        ...cfg.baseLayout,
        margin: { t: 30, r: 30, b: 50, l: 45 },
        xaxis: { title: 'Cosine Similarity Score', gridcolor: cfg.gridCol },
        yaxis: { title: 'Kepadatan (Density)', gridcolor: cfg.gridCol, showgrid: false },
        legend: { orientation: 'h', y: 1.15, x: 0.5, xanchor: 'center', font: { color: cfg.cTxt, size: 10.5 } },
        barmode: 'overlay'
      },
      { displayModeBar: false, responsive: true }
    );
  };

  function renderRecon(cfg) {
    const el = document.getElementById('plt-recon');
    if (!el || typeof cancelfaceData === 'undefined' || !cancelfaceData.reconstruction_summary) return;

    const sr = cancelfaceData.reconstruction_summary;
    Plotly.newPlot(
      'plt-recon',
      [
        {
          x: sr.map((d) => d.Metode),
          y: sr.map((d) => d['Rata Rata Kemiripan Kosinus']),
          type: 'bar',
          marker: { color: [cfg.palette[3], cfg.palette[3], cfg.palette[2]] }
        }
      ],
      {
        ...cfg.baseLayout,
        title: { text: 'Cosine Similarity Template vs Citra Wajah Asli', font: { size: 12, color: cfg.cHeading } },
        xaxis: { gridcolor: cfg.gridCol },
        yaxis: { title: 'Cosine Similarity', gridcolor: cfg.gridCol }
      },
      { displayModeBar: false, responsive: true }
    );
  }

  function renderAttr(cfg) {
    const el = document.getElementById('plt-attr');
    if (!el || typeof cancelfaceData === 'undefined' || !cancelfaceData.attack_summary) return;

    const sa = cancelfaceData.attack_summary;
    Plotly.newPlot(
      'plt-attr',
      [
        {
          name: 'Akurasi Gender',
          x: sa.map((d) => d.Metode),
          y: sa.map((d) => d['Akurasi Tebakan Jenis Kelamin']),
          type: 'bar',
          marker: { color: cfg.palette[0] }
        },
        {
          name: 'Akurasi Usia',
          x: sa.map((d) => d.Metode),
          y: sa.map((d) => d['Akurasi Tebakan Kelompok Usia']),
          type: 'bar',
          marker: { color: cfg.palette[1] }
        }
      ],
      {
        ...cfg.baseLayout,
        barmode: 'group',
        title: { text: 'Akurasi Penebakan Atribut Sensitif (Attacker)', font: { size: 12, color: cfg.cHeading } },
        xaxis: { gridcolor: cfg.gridCol },
        yaxis: { title: 'Akurasi Penebakan', gridcolor: cfg.gridCol },
        legend: { orientation: 'h', y: -0.22, x: 0.5, xanchor: 'center', font: { color: cfg.cTxt, size: 11 } }
      },
      { displayModeBar: false, responsive: true }
    );
  }

  window.renderCharts = function () {
    const cfg = getThemeConfig();
    renderHeatmap(cfg);
    renderRobustness(cfg);
    renderEdaSubsets(cfg);
    renderEdaCamera(cfg);
    renderEdaQuality(cfg);
    renderAblation(cfg);
    renderCmc(cfg);
    window.renderScoreDist();
    renderRecon(cfg);
    renderAttr(cfg);
  };

  window.addEventListener('resize', () => {
    const charts = [
      'plt-heatmap',
      'plt-kualitas',
      'plt-eda-subset-img',
      'plt-eda-subset-id',
      'plt-eda-camera',
      'plt-eda-laplacian',
      'plt-eda-width',
      'plt-eda-brightness',
      'plt-ablasi',
      'plt-cmc',
      'plt-score-dist',
      'plt-recon',
      'plt-attr'
    ];
    charts.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.data) {
        Plotly.Plots.resize(el);
      }
    });
  });

  if (typeof window !== 'undefined' && window.ResizeObserver) {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (el && el.data && el.classList.contains('js-plotly-plot')) {
          Plotly.Plots.resize(el);
        }
      }
    });
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.chart-inner-container').forEach((c) => ro.observe(c));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.renderCharts, 350);
  });
})();

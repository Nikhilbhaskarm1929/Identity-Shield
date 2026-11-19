/**
 * IdentityShield v3 — Chart.js Unified Theme & Presets
 * Sets global Chart.js defaults to match "Neon Shield" (DESIGN_SPEC.md §6)
 * Provides high-level chart builders: area(), spark(), bar(), donut()
 */

(() => {
  const token = (name) => {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  const getThemeColors = () => ({
    green: token('--green-500') || 'rgb(0, 230, 118)',
    greenLight: token('--green-400') || 'rgb(34, 255, 154)',
    red: token('--red-500') || 'rgb(255, 59, 59)',
    amber: token('--amber-500') || 'rgb(245, 165, 36)',
    text1: token('--text-1') || 'rgb(238, 246, 241)',
    text2: token('--text-2') || 'rgb(169, 184, 175)',
    text3: token('--text-3') || 'rgb(107, 124, 114)',
    surface2: token('--surface-2') || 'rgb(14, 23, 18)',
    border1: token('--border-1') || 'rgba(0, 255, 136, 0.10)',
    border2: token('--border-2') || 'rgba(0, 255, 136, 0.22)',
    grid: token('--chart-grid') || 'rgba(255, 255, 255, 0.05)',
  });

  // Apply Chart.js global defaults
  function configureChartDefaults() {
    if (typeof window === 'undefined' || typeof window.Chart === 'undefined') return;

    const colors = getThemeColors();
    const Chart = window.Chart;

    Chart.defaults.color = colors.text3;
    Chart.defaults.font.family = '"Inter", system-ui, -apple-system, sans-serif';
    Chart.defaults.font.size = 12;

    // Responsive & maintain aspect ratio
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;

    // Tooltip theme
    if (Chart.defaults.plugins && Chart.defaults.plugins.tooltip) {
      Chart.defaults.plugins.tooltip.backgroundColor = colors.surface2;
      Chart.defaults.plugins.tooltip.borderColor = colors.border2;
      Chart.defaults.plugins.tooltip.borderWidth = 1;
      Chart.defaults.plugins.tooltip.titleColor = colors.text1;
      Chart.defaults.plugins.tooltip.bodyColor = colors.text2;
      Chart.defaults.plugins.tooltip.titleFont = { family: '"Inter", sans-serif', weight: '700' };
      Chart.defaults.plugins.tooltip.bodyFont = { family: '"JetBrains Mono", monospace', size: 12 };
      Chart.defaults.plugins.tooltip.padding = 10;
      Chart.defaults.plugins.tooltip.cornerRadius = 8;
      Chart.defaults.plugins.tooltip.boxPadding = 4;
      Chart.defaults.plugins.tooltip.displayColors = true;
    }

    // Legend defaults
    if (Chart.defaults.plugins && Chart.defaults.plugins.legend) {
      Chart.defaults.plugins.legend.display = false;
      Chart.defaults.plugins.legend.labels.color = colors.text2;
      Chart.defaults.plugins.legend.labels.font = { family: '"Inter", sans-serif', size: 12 };
    }
  }

  // Create vertical gradient area fill helper
  function gradientFill(ctx, colorHex, alphaTop = 0.35, alphaBottom = 0.0, height = 240) {
    try {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      if (colorHex.startsWith('#')) {
        const r = parseInt(colorHex.slice(1, 3), 16) || 0;
        const g = parseInt(colorHex.slice(3, 5), 16) || 230;
        const b = parseInt(colorHex.slice(5, 7), 16) || 118;
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alphaTop})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${alphaBottom})`);
      } else {
        grad.addColorStop(0, colorHex);
        grad.addColorStop(1, 'transparent');
      }
      return grad;
    } catch {
      return 'transparent';
    }
  }

  // Global namespace helpers
  window.IS = window.IS || {};
  window.IS.charts = {
    gradientFill,
    getThemeColors,

    /**
     * Area chart with normal (green) + suspicious (red) series
     */
    area(target, { labels, normal, suspicious, options = {} }) {
      if (typeof window.Chart === 'undefined') return null;
      const canvas = typeof target === 'string' ? document.getElementById(target) : target;
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      const colors = getThemeColors();

      const datasets = [];

      if (normal) {
        datasets.push({
          label: 'Normal Logins',
          data: normal,
          borderColor: colors.green,
          backgroundColor: gradientFill(ctx, colors.green, 0.32, 0.0, 220),
          borderWidth: 2.5,
          tension: 0.38,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: colors.green,
          pointHoverBorderColor: colors.surface2,
          pointHoverBorderWidth: 2,
        });
      }

      if (suspicious) {
        datasets.push({
          label: 'Suspicious Logins',
          data: suspicious,
          borderColor: colors.red,
          backgroundColor: gradientFill(ctx, colors.red, 0.28, 0.0, 220),
          borderWidth: 2.5,
          tension: 0.38,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: colors.red,
          pointHoverBorderColor: colors.surface2,
          pointHoverBorderWidth: 2,
        });
      }

      return new window.Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: {
              grid: { color: colors.grid, drawBorder: false },
              ticks: { color: colors.text3, font: { family: '"JetBrains Mono", monospace', size: 11 } },
              border: { display: false },
            },
            y: {
              grid: { color: colors.grid, drawBorder: false },
              ticks: { color: colors.text3, font: { family: '"JetBrains Mono", monospace', size: 11 } },
              border: { display: false },
            },
          },
          ...options,
        },
      });
    },

    /**
     * Bar chart preset
     */
    bar(target, { labels, datasets, options = {} }) {
      if (typeof window.Chart === 'undefined') return null;
      const canvas = typeof target === 'string' ? document.getElementById(target) : target;
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      const colors = getThemeColors();

      const styledDatasets = datasets.map((d, i) => ({
        borderRadius: 4,
        backgroundColor: d.color || (i === 0 ? colors.green : i === 1 ? colors.amber : colors.red),
        ...d,
      }));

      return new window.Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: styledDatasets },
        options: {
          scales: {
            x: { grid: { display: false }, border: { display: false } },
            y: { grid: { color: colors.grid }, border: { display: false } },
          },
          ...options,
        },
      });
    },

    /**
     * Donut chart preset
     */
    donut(target, { labels, data, colors: customColors, options = {} }) {
      if (typeof window.Chart === 'undefined') return null;
      const canvas = typeof target === 'string' ? document.getElementById(target) : target;
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      const colors = getThemeColors();

      const defaultColors = [colors.green, colors.amber, colors.red, colors.text3];

      return new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data,
              backgroundColor: customColors || defaultColors,
              borderColor: colors.surface2,
              borderWidth: 2,
              hoverOffset: 4,
            },
          ],
        },
        options: {
          cutout: '72%',
          plugins: {
            legend: { display: false },
          },
          ...options,
        },
      });
    },

    /**
     * Sparkline helper (Canvas or SVG generation)
     */
    spark(target, data = [], { color, isDanger = false } = {}) {
      const colors = getThemeColors();
      const strokeColor = color || (isDanger ? colors.red : colors.green);

      if (typeof target === 'string') target = document.getElementById(target);
      if (!target) return;

      if (target.tagName.toLowerCase() === 'canvas') {
        const ctx = target.getContext('2d');
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const w = target.width;
        const h = target.height;
        const step = w / (data.length - 1);

        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();
        data.forEach((val, i) => {
          const x = i * step;
          const y = h - ((val - min) / range) * (h - 8) - 4;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    },
  };

  // Configure on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', configureChartDefaults);
  } else {
    configureChartDefaults();
  }
})();

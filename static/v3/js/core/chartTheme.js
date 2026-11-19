/**
 * IdentityShield v3 — Chart.js Theme for Cream Light
 * Specification: UI_DESIGN.md Section 2 (chart palette)
 */

export const CHART_PALETTE = [
  'var(--green-500)',
  'var(--amber-500)',
  'var(--red-500)',
  'var(--green-400)',
  'var(--text-2)',
  'var(--red-700)',
];

export const HEATMAP_SCALE = {
  min: 'var(--surface-2)',
  mid: 'var(--amber-500)',
  max: 'var(--red-500)',
};

export const BAND_COLORS = {
  monitor: 'var(--text-3)',
  step_up: 'var(--amber-500)',
  'step-up': 'var(--amber-500)',
  restrict: 'var(--red-500)',
  revoke: 'var(--red-500)',
};

export function applyChartTheme(Chart) {
  if (!Chart || !Chart.defaults) return;

  const textColor = 'var(--text-3)';
  const gridColor = 'var(--chart-grid)';

  Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = textColor;

  // Global scale defaults
  if (Chart.defaults.scales) {
    if (Chart.defaults.scales.linear) {
      if (Chart.defaults.scales.linear.grid) Chart.defaults.scales.linear.grid.color = gridColor;
      if (Chart.defaults.scales.linear.ticks) Chart.defaults.scales.linear.ticks.color = textColor;
    }
    if (Chart.defaults.scales.category) {
      if (Chart.defaults.scales.category.grid) Chart.defaults.scales.category.grid.color = gridColor;
      if (Chart.defaults.scales.category.ticks) Chart.defaults.scales.category.ticks.color = textColor;
    }
  }

  // Tooltip defaults
  if (Chart.defaults.plugins && Chart.defaults.plugins.tooltip) {
    Chart.defaults.plugins.tooltip.backgroundColor = 'var(--surface-1)';
    Chart.defaults.plugins.tooltip.titleColor = 'var(--text-1)';
    Chart.defaults.plugins.tooltip.bodyColor = 'var(--text-1)';
    Chart.defaults.plugins.tooltip.borderColor = 'var(--border-1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  }
}

// Auto-apply if global Chart exists and listen for theme toggles
if (typeof window !== 'undefined') {
  if (window.Chart) applyChartTheme(window.Chart);

  window.addEventListener('is:theme-change', () => {
    if (window.Chart) {
      applyChartTheme(window.Chart);
      if (window.Chart.instances) {
        Object.values(window.Chart.instances).forEach((inst) => {
          if (inst && typeof inst.update === 'function') {
            inst.update();
          }
        });
      }
    }
  });
}


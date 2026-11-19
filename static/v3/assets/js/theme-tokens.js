/**
 * IdentityShield v3 — Design Token Accessor
 * Reads live CSS variables from theme.css so charts, Three.js scenes, and maps
 * never hard-code color values.
 */

export const token = (name) => {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

export const palette = () => ({
  normal: token('--chart-normal'),
  suspicious: token('--chart-suspicious'),
  amber: token('--amber-500'),
  green500: token('--green-500'),
  green400: token('--green-400'),
  green700: token('--green-700'),
  red500: token('--red-500'),
  red700: token('--red-700'),
  grid: token('--chart-grid'),
  axis: token('--chart-axis'),
  text1: token('--text-1'),
  text2: token('--text-2'),
  text3: token('--text-3'),
  surface1: token('--surface-1'),
  surface2: token('--surface-2'),
  surface3: token('--surface-3'),
  bg0: token('--bg-0'),
  mapOcean: token('--map-ocean'),
  mapLand: token('--map-land'),
  mapLandBorder: token('--map-land-border'),
  graphLink: token('--graph-link'),
  graphLinkThreat: token('--graph-link-threat'),
});

// Also expose on window for non-ES-module contexts
if (typeof window !== 'undefined') {
  window.ISTheme = {
    token,
    palette,
  };
}

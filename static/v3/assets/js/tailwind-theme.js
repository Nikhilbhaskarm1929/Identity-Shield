/**
 * IdentityShield v3 — Tailwind Theme Config Extension
 * Maps Tailwind utility classes to CSS design tokens.
 */
(() => {
  if (typeof window === 'undefined') return;

  window.tailwind = window.tailwind || {};
  window.tailwind.config = window.tailwind.config || {};
  window.tailwind.config.theme = window.tailwind.config.theme || {};
  window.tailwind.config.theme.extend = window.tailwind.config.theme.extend || {};

  const existingColors = window.tailwind.config.theme.extend.colors || {};

  window.tailwind.config.theme.extend.colors = {
    ...existingColors,
    bg0: 'var(--bg-0)',
    bg1: 'var(--bg-1)',
    surface1: 'var(--surface-1)',
    surface2: 'var(--surface-2)',
    surface3: 'var(--surface-3)',
    border1: 'var(--border-1)',
    border2: 'var(--border-2)',
    accent: 'var(--green-500)',
    'accent-hover': 'var(--green-400)',
    'accent-base': 'var(--green-700)',
    danger: 'var(--red-500)',
    'danger-base': 'var(--red-700)',
    warn: 'var(--amber-500)',
    'warn-base': 'var(--amber-700)',
    text1: 'var(--text-1)',
    text2: 'var(--text-2)',
    text3: 'var(--text-3)',
  };

  window.tailwind.config.theme.extend.fontFamily = {
    ...(window.tailwind.config.theme.extend.fontFamily || {}),
    ui: ['var(--font-ui)'],
    mono: ['var(--font-mono)'],
  };
})();

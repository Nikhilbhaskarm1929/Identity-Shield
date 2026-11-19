/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./static/**/*.html",
    "./static/**/*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'neon-green': '#00FF88',
        'emerald-dark': '#064E3B',
        'alert-red': '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}

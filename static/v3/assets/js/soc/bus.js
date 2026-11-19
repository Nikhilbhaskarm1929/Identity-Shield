/**
 * IdentityShield v3 — SOC Event Bus
 * Decouples pipeline engine execution from UI subscribers (board, packets, console, trace, matrix).
 */

const listeners = {};

export const bus = {
  on(type, fn) {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push(fn);
    return () => this.off(type, fn);
  },

  off(type, fn) {
    if (!listeners[type]) return;
    listeners[type] = listeners[type].filter(f => f !== fn);
  },

  emit(type, payload) {
    if (!listeners[type]) return;
    listeners[type].forEach(fn => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`Error in bus listener for "${type}":`, err);
      }
    });
  },

  clear() {
    Object.keys(listeners).forEach(k => delete listeners[k]);
  }
};

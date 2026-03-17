/**
 * Shared z-index system for consistent layering across the EvoComp platform.
 * These values are referenced in Tailwind classes or inline styles.
 */
export const LAYERS = {
  BASE: 0,
  TICKER: 10,
  STICKY_TABLE: 20,
  STICKY_HEADER: 30,
  SIDEBAR: 50,
  HEADER: 50,
  DROPDOWN: 60,
  TOOLTIP: 100,
  MODAL_OVERLAY: 1000,
  MODAL_CONTENT: 1001,
  NOTIFICATIONS: 2000,
} as const;

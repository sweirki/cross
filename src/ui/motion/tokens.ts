export const MOTION_TOKENS = Object.freeze({
  duration: Object.freeze({
    instant: 0,
    fast: 120,
    standard: 220,
    slow: 360,
    celebration: 700,
  }),
  easing: Object.freeze({
    standard: Object.freeze([0.2, 0, 0, 1] as const),
    emphasized: Object.freeze([0.2, 0, 0, 1.2] as const),
    exit: Object.freeze([0.4, 0, 1, 1] as const),
  }),
  distance: Object.freeze({
    subtle: 4,
    standard: 12,
    pronounced: 24,
  }),
  scale: Object.freeze({
    press: 0.97,
    pop: 1.08,
  }),
});

export type MotionTokens = typeof MOTION_TOKENS;

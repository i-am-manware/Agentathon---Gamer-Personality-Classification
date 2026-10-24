// Field validators. Kept deliberately tiny: one concern, zero dependencies.

export const isUsername = (v) =>
  typeof v === 'string' && /^[A-Za-z0-9_.-]{3,24}$/.test(v);

export const isPassword = (v) =>
  typeof v === 'string' && v.length >= 8 && v.length <= 128;

export const isPlainObject = (v) =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function isInt(v, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

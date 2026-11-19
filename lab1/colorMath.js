/* Pure colour conversion functions. All internal RGB components are [0, 1]. */

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const round = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function rgb255ToUnit({ r, g, b }) {
  return { r: clamp(r, 0, 255) / 255, g: clamp(g, 0, 255) / 255, b: clamp(b, 0, 255) / 255 };
}

export function unitToRgb255({ r, g, b }) {
  return { r: Math.round(clamp(r, 0, 1) * 255), g: Math.round(clamp(g, 0, 1) * 255), b: Math.round(clamp(b, 0, 1) * 255) };
}

// RGB -> CMYK. For black, 1 - K is zero, so C = M = Y = 0 by definition.
export function rgbToCmyk({ r, g, b }) {
  const k = 1 - Math.max(r, g, b);
  if (k >= 1 - 1e-12) return { c: 0, m: 0, y: 0, k: 1 };
  const divisor = 1 - k;
  return { c: (1 - r - k) / divisor, m: (1 - g - k) / divisor, y: (1 - b - k) / divisor, k };
}

export function cmykToRgb({ c, m, y, k }) {
  return { r: (1 - c) * (1 - k), g: (1 - m) * (1 - k), b: (1 - y) * (1 - k) };
}

// RGB -> HLS. Hue is in [0, 1); L and S are in [0, 1].
export function rgbToHls({ r, g, b }) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta < 1e-12) return { h: null, l, s: 0 }; // hue is undefined for grey
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h = (h * 60 + 360) % 360;
  return { h: h / 360, l, s };
}

function hueToRgb(p, q, t) {
  let x = (t % 1 + 1) % 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

// HLS -> RGB. For S = 0 (also L = 0 or 1), the result is achromatic.
export function hlsToRgb({ h, l, s }) {
  if (s < 1e-12) return { r: l, g: l, b: l };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: hueToRgb(p, q, h + 1 / 3), g: hueToRgb(p, q, h), b: hueToRgb(p, q, h - 1 / 3) };
}

export const toHex = (rgb) => {
  const { r, g, b } = unitToRgb255(rgb);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};

/* Pure pixel transformations. No DOM or Canvas calls are made in this file. */

export const clip = (value) => Math.min(255, Math.max(0, Math.round(value)));
export const luminance = (r, g, b) => Math.round(0.299 * r + 0.587 * g + 0.114 * b);

export function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToRgb(h, s, v) {
  const sector = ((h % 1 + 1) % 1) * 6;
  const x = v * (1 - s * Math.abs(sector % 2 - 1));
  const m = v - v * s;
  let r = 0, g = 0, b = 0;
  if (sector < 1) [r, g, b] = [v, x, 0];
  else if (sector < 2) [r, g, b] = [x, v, 0];
  else if (sector < 3) [r, g, b] = [0, v, x];
  else if (sector < 4) [r, g, b] = [0, x, v];
  else if (sector < 5) [r, g, b] = [x, 0, v];
  else [r, g, b] = [v, 0, x];
  return [clip((r + m) * 255), clip((g + m) * 255), clip((b + m) * 255)];
}

export function copyImage(source) { return new ImageData(new Uint8ClampedArray(source.data), source.width, source.height); }

function transformChannels(source, transform) {
  const out = copyImage(source);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = transform(source.data[i]);
    out.data[i + 1] = transform(source.data[i + 1]);
    out.data[i + 2] = transform(source.data[i + 2]);
  }
  return out;
}

export function addConstant(source, c) { return transformChannels(source, (f) => clip(f + c)); }
export function multiplyConstant(source, k) { return transformChannels(source, (f) => clip(f * k)); }
export function negative(source) { return transformChannels(source, (f) => 255 - f); }

// c = 255 / ln(1 + max_f) maps the greatest input level to 255.
export function logarithmic(source, c) { return transformChannels(source, (f) => clip(c * Math.log(1 + f))); }
export function gammaCorrection(source, gamma) { return transformChannels(source, (f) => clip(255 * (f / 255) ** gamma)); }

function findRange(source, getter) {
  let min = 255, max = 0;
  for (let i = 0; i < source.data.length; i += 4) { const value = getter(i); min = Math.min(min, value); max = Math.max(max, value); }
  return { min, max };
}
const linearMap = (value, min, max) => min === max ? value : clip(255 * (value - min) / (max - min));

// mode: gray gives an explicit grayscale result; hsv stretches V but retains H and S.
export function linearContrast(source, mode = "hsv") {
  const out = copyImage(source), data = source.data;
  if (mode === "rgb") {
    const ranges = [0, 1, 2].map((channel) => findRange(source, (i) => data[i + channel]));
    for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) out.data[i + c] = linearMap(data[i + c], ranges[c].min, ranges[c].max);
  } else if (mode === "gray") {
    const range = findRange(source, (i) => luminance(data[i], data[i + 1], data[i + 2]));
    for (let i = 0; i < data.length; i += 4) { const v = linearMap(luminance(data[i], data[i + 1], data[i + 2]), range.min, range.max); out.data[i] = out.data[i + 1] = out.data[i + 2] = v; }
  } else {
    const range = findRange(source, (i) => Math.max(data[i], data[i + 1], data[i + 2]));
    for (let i = 0; i < data.length; i += 4) { const hsv = rgbToHsv(data[i], data[i + 1], data[i + 2]); const [r, g, b] = hsvToRgb(hsv.h, hsv.s, linearMap(hsv.v * 255, range.min, range.max) / 255); out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; }
  }
  return out;
}

function equalizationTable(histogram, count) {
  const occupied = histogram.reduce((sum, value) => sum + (value > 0 ? 1 : 0), 0);
  if (occupied <= 1) return null; // a one-level histogram must remain unchanged
  const table = new Uint8Array(256); let cumulative = 0;
  for (let i = 0; i < 256; i++) { cumulative += histogram[i]; table[i] = clip(255 * cumulative / count); }
  return table;
}
function histogramOf(source, getter) {
  const h = new Uint32Array(256); for (let i = 0; i < source.data.length; i += 4) h[getter(i)]++; return h;
}

// T(i)=round(255*C(i)/N). RGB uses three independent tables; HSV uses V only.
export function equalize(source, mode = "hsv") {
  const out = copyImage(source), data = source.data, n = source.width * source.height;
  if (mode === "rgb") {
    const tables = [0, 1, 2].map((channel) => equalizationTable(histogramOf(source, (i) => data[i + channel]), n));
    for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) if (tables[c]) out.data[i + c] = tables[c][data[i + c]];
  } else if (mode === "gray") {
    const table = equalizationTable(histogramOf(source, (i) => luminance(data[i], data[i + 1], data[i + 2])), n);
    if (table) for (let i = 0; i < data.length; i += 4) { const v = table[luminance(data[i], data[i + 1], data[i + 2])]; out.data[i] = out.data[i + 1] = out.data[i + 2] = v; }
  } else {
    const table = equalizationTable(histogramOf(source, (i) => Math.max(data[i], data[i + 1], data[i + 2])), n);
    if (table) for (let i = 0; i < data.length; i += 4) { const hsv = rgbToHsv(data[i], data[i + 1], data[i + 2]); const [r, g, b] = hsv.v === 0 ? [0, 0, 0] : hsvToRgb(hsv.h, hsv.s, table[Math.round(hsv.v * 255)] / 255); out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; }
  }
  return out;
}

export function maxChannel(source) { let max = 0; for (let i = 0; i < source.data.length; i += 4) max = Math.max(max, source.data[i], source.data[i + 1], source.data[i + 2]); return max; }

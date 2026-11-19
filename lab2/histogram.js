import { luminance } from "./imageMath.js";

export function makeHistogram(image, channel) {
  const bins = new Uint32Array(256), data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    let value;
    if (channel === "r") value = data[i];
    else if (channel === "g") value = data[i + 1];
    else if (channel === "b") value = data[i + 2];
    else if (channel === "v") value = Math.max(data[i], data[i + 1], data[i + 2]);
    else value = luminance(data[i], data[i + 1], data[i + 2]);
    bins[value]++;
  }
  return bins;
}

export function commonMaximum(first, second) { return Math.max(1, ...first, ...second); }

// Both charts receive the same maximum so their bar heights are comparable.
export function drawHistogram(canvas, bins, maximum, colour, caption) {
  const ctx = canvas.getContext("2d"), { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcff"; ctx.fillRect(0, 0, width, height);
  const left = 30, right = 8, top = 19, bottom = 21, w = width - left - right, h = height - top - bottom;
  ctx.strokeStyle = "#dce2ec"; ctx.lineWidth = 1;
  for (let row = 0; row <= 4; row++) { const y = top + h * row / 4; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke(); }
  ctx.fillStyle = colour;
  for (let x = 0; x < 256; x++) { const barHeight = h * bins[x] / maximum; ctx.fillRect(left + x * w / 256, top + h - barHeight, Math.max(1, w / 256), barHeight); }
  ctx.fillStyle = "#5d697b"; ctx.font = "12px system-ui"; ctx.fillText(caption, left, 13); ctx.fillText("0", left - 4, height - 5); ctx.fillText("255", width - right - 20, height - 5);
  ctx.fillText(String(maximum), 1, top + 4); ctx.strokeStyle = "#aeb8c7"; ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top + h); ctx.lineTo(width - right, top + h); ctx.stroke();
}

import { clamp, round, rgb255ToUnit, unitToRgb255, rgbToCmyk, cmykToRgb, rgbToHls, hlsToRgb, toHex } from "./colorMath.js";

const MODELS = {
  cmyk: { title: "CMYK", note: "субтрактивная", channels: [["c", "C", 100, "%", .1], ["m", "M", 100, "%", .1], ["y", "Y", 100, "%", .1], ["k", "K", 100, "%", .1]] },
  rgb: { title: "RGB", note: "аддитивная", channels: [["r", "R", 255, "", 1], ["g", "G", 255, "", 1], ["b", "B", 255, "", 1]] },
  hls: { title: "HLS", note: "перцептивная", channels: [["h", "H", 360, "°", 1], ["l", "L", 100, "%", .1], ["s", "S", 100, "%", .1]] }
};
const PRESETS = [["Красный",[255,0,0]],["Зелёный",[0,255,0]],["Синий",[0,0,255]],["Циан",[0,255,255]],["Маджента",[255,0,255]],["Жёлтый",[255,255,0]],["Белый",[255,255,255]],["Чёрный",[0,0,0]],["Серый",[128,128,128]]];
let rgb = rgb255ToUnit({ r: 255, g: 100, b: 31 });
let rememberedHue = 18 / 360; // hue is retained when the current colour becomes achromatic

const $ = (selector) => document.querySelector(selector);
const modelHost = $("#models"), colourField = $("#colourField"), hueBar = $("#hueBar");

function renderModels() {
  modelHost.innerHTML = Object.entries(MODELS).map(([id, model]) => `
    <article class="model" data-model="${id}"><div class="model-header"><h2>${model.title}</h2><span>${model.note}</span></div>
    <div class="controls">${model.channels.map(([key, label, max, unit, step]) => `<div class="control"><label for="${id}-${key}">${label}</label><input id="${id}-${key}" data-role="range" data-key="${key}" type="range" min="0" max="${max}" step="${step}"><div><input data-role="number" data-key="${key}" type="number" min="0" max="${max}" step="${step}" aria-label="${model.title} ${label}"><span class="unit">${unit}</span></div></div>`).join("")}</div></article>`).join("");
}

function displayValues(id) {
  if (id === "rgb") return unitToRgb255(rgb);
  if (id === "cmyk") { const c = rgbToCmyk(rgb); return { c: round(c.c * 100), m: round(c.m * 100), y: round(c.y * 100), k: round(c.k * 100) }; }
  const h = rgbToHls(rgb);
  if (h.h !== null) rememberedHue = h.h;
  return { h: Math.round((h.h ?? rememberedHue) * 360) % 360, l: round(h.l * 100), s: round(h.s * 100) };
}

function rgbFromModel(id, values) {
  if (id === "rgb") return rgb255ToUnit(values);
  if (id === "cmyk") return cmykToRgb({ c: values.c / 100, m: values.m / 100, y: values.y / 100, k: values.k / 100 });
  rememberedHue = (values.h % 360) / 360;
  return hlsToRgb({ h: rememberedHue, l: values.l / 100, s: values.s / 100 });
}

function setSliderBackground(range, id, key, values) {
  const max = Number(range.max), stops = [];
  for (let i = 0; i <= 10; i++) {
    const test = { ...values, [key]: max * i / 10 };
    const c = unitToRgb255(rgbFromPreview(id, test));
    stops.push(`rgb(${c.r} ${c.g} ${c.b}) ${i * 10}%`);
  }
  range.style.background = `linear-gradient(90deg, ${stops.join(",")})`;
}

// Like rgbFromModel, but never changes rememberedHue while paint gradients are calculated.
function rgbFromPreview(id, v) {
  if (id === "rgb") return rgb255ToUnit(v);
  if (id === "cmyk") return cmykToRgb({ c: v.c / 100, m: v.m / 100, y: v.y / 100, k: v.k / 100 });
  return hlsToRgb({ h: v.h / 360, l: v.l / 100, s: v.s / 100 });
}

function refresh() {
  Object.keys(MODELS).forEach((id) => {
    const values = displayValues(id);
    document.querySelectorAll(`[data-model="${id}"] input`).forEach((input) => {
      const key = input.dataset.key;
      input.value = values[key];
      if (input.dataset.role === "range") setSliderBackground(input, id, key, values);
    });
  });
  const css = toHex(rgb);
  $("#swatch").style.background = css;
  $("#hexValue").textContent = css;
  drawPicker();
}

function currentInputs(id) {
  const values = {};
  document.querySelectorAll(`[data-model="${id}"] input[data-role="number"]`).forEach((input) => values[input.dataset.key] = Number(input.value));
  return values;
}

function editComponent(input, isTyping) {
  const model = input.closest(".model").dataset.model;
  const max = Number(input.max), typed = Number(input.value);
  if (!Number.isFinite(typed)) return;
  const value = clamp(typed, 0, max);
  const corrected = value !== typed;
  const values = currentInputs(model);
  values[input.dataset.key] = value;
  rgb = rgbFromModel(model, values);
  if (corrected) showNotice(`Значение ограничено диапазоном 0…${max}.`, true);
  else if (!isTyping) showNotice("Цвет синхронизирован во всех моделях.");
  refresh();
}

function showNotice(message, warning = false) {
  const notice = $("#notice"); notice.textContent = message; notice.classList.toggle("is-warning", warning);
}

function drawPicker() {
  const ctx = colourField.getContext("2d"), hls = rgbToHls(rgb), h = hls.h ?? rememberedHue;
  const image = ctx.createImageData(colourField.width, colourField.height);
  for (let y = 0; y < colourField.height; y++) for (let x = 0; x < colourField.width; x++) {
    const c = unitToRgb255(hlsToRgb({ h, s: x / (colourField.width - 1), l: 1 - y / (colourField.height - 1) }));
    const i = (y * colourField.width + x) * 4; image.data[i] = c.r; image.data[i + 1] = c.g; image.data[i + 2] = c.b; image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const x = hls.s * (colourField.width - 1), y = (1 - hls.l) * (colourField.height - 1);
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.strokeStyle = "white"; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = "#172033"; ctx.lineWidth = 1; ctx.stroke();
  const hue = hueBar.getContext("2d"), gradient = hue.createLinearGradient(0, 0, 0, hueBar.height);
  for (let i = 0; i <= 6; i++) gradient.addColorStop(i / 6, `hsl(${i * 60} 100% 50%)`);
  hue.fillStyle = gradient; hue.fillRect(0, 0, hueBar.width, hueBar.height);
  const hy = h * (hueBar.height - 1); hue.strokeStyle = "white"; hue.lineWidth = 3; hue.beginPath(); hue.moveTo(0, hy); hue.lineTo(hueBar.width, hy); hue.stroke(); hue.strokeStyle = "#172033"; hue.lineWidth = 1; hue.stroke();
}

function pointIn(canvas, event) {
  const box = canvas.getBoundingClientRect();
  return { x: clamp((event.clientX - box.left) / box.width, 0, 1), y: clamp((event.clientY - box.top) / box.height, 0, 1) };
}
function installCanvasInput(canvas, action) {
  let dragging = false;
  canvas.addEventListener("pointerdown", (e) => { dragging = true; canvas.setPointerCapture(e.pointerId); action(e); });
  canvas.addEventListener("pointermove", (e) => { if (dragging) action(e); });
  canvas.addEventListener("pointerup", () => dragging = false);
}

renderModels();
// A range is continuous; a number field is applied only after editing is committed.
// This lets a user type e.g. 200 without the first digit being re-rendered as 2.
modelHost.addEventListener("input", (event) => { if (event.target.matches('input[data-role="range"]')) editComponent(event.target, true); });
modelHost.addEventListener("change", (event) => { if (event.target.matches("input")) editComponent(event.target, false); });
installCanvasInput(colourField, (e) => { const p = pointIn(colourField, e), hls = rgbToHls(rgb); rgb = hlsToRgb({ h: hls.h ?? rememberedHue, s: p.x, l: 1 - p.y }); refresh(); });
installCanvasInput(hueBar, (e) => { rememberedHue = pointIn(hueBar, e).y; const hls = rgbToHls(rgb); rgb = hlsToRgb({ h: rememberedHue, l: hls.l, s: hls.s }); refresh(); });
$("#presets").innerHTML = PRESETS.map(([name, colour]) => `<button class="preset" type="button" title="${name}" aria-label="${name}" style="background:rgb(${colour.join(" ")})" data-rgb="${colour.join(",")}"></button>`).join("");
$("#presets").addEventListener("click", (e) => { const button = e.target.closest("button[data-rgb]"); if (!button) return; const [r,g,b] = button.dataset.rgb.split(",").map(Number); rgb = rgb255ToUnit({r,g,b}); showNotice(`Выбран цвет: ${button.title}.`); refresh(); });
$("#copyHex").addEventListener("click", async () => { try { await navigator.clipboard.writeText(toHex(rgb)); showNotice("HEX скопирован в буфер обмена."); } catch { showNotice("Не удалось скопировать HEX: выделите значение вручную.", true); } });
refresh();

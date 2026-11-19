import { addConstant, multiplyConstant, negative, logarithmic, gammaCorrection, linearContrast, equalize, maxChannel } from "./imageMath.js";
import { TESTS, createTestImage } from "./testGenerator.js";
import { makeHistogram, commonMaximum, drawHistogram } from "./histogram.js";

const $ = (s) => document.querySelector(s);
const sourceCanvas = $("#sourceCanvas"), resultCanvas = $("#resultCanvas");
let source = createTestImage("01_color_low_contrast"), result = source;
let state = { method: "add", value: 20, mode: "hsv", autoLog: true, zoom: "fit" };

const METHODS = {
  add: { min: -150, max: 150, step: 1, default: 20, label: "c", formula: (v) => `g = clip(f + ${v}, 0, 255)` },
  multiply: { min: .1, max: 3, step: .1, default: 1.5, label: "k", formula: (v) => `g = clip(round(f · ${v}), 0, 255)` },
  negative: { formula: () => "g = 255 − f" },
  log: { min: 1, max: 100, step: .1, default: 45, label: "c", formula: (v) => `g = clip(round(${v} · ln(1 + f)), 0, 255)` },
  gamma: { min: .1, max: 5, step: .1, default: .6, label: "γ", formula: (v) => `g = clip(round(255 · (f / 255)^${v}), 0, 255)` },
  stretch: { formula: () => "T(i) = round(255 · (i − min) / (max − min)); при min = max изображение не меняется" },
  equalize: { formula: () => "T(i) = round(255 · C(i) / N); одноуровневая гистограмма сохраняется" }
};

function selectedTestName() { return $("#testSelect").value; }
function setStatus(message) { $("#status").textContent = message; }
function configureControls() {
  const config = METHODS[state.method], hasValue = "min" in config, isColourMethod = state.method === "stretch" || state.method === "equalize";
  $("#valueControl").hidden = !hasValue;
  $("#autoLog").hidden = state.method !== "log";
  $("#modeControl").hidden = !isColourMethod;
  if (hasValue) { const range = $("#valueRange"); range.min = config.min; range.max = config.max; range.step = config.step; range.value = state.value; }
  $("#valueOutput").textContent = hasValue ? `${config.label} = ${Number(state.value).toFixed(config.step < 1 ? 1 : 0)}` : "";
  $("#autoLogCheckbox").checked = state.autoLog;
  $("#valueRange").disabled = state.method === "log" && state.autoLog;
  $("#formula").textContent = config.formula(state.value);
}

function processFromOriginal() {
  const cAuto = 255 / Math.log(1 + maxChannel(source));
  if (state.method === "add") result = addConstant(source, state.value);
  else if (state.method === "multiply") result = multiplyConstant(source, state.value);
  else if (state.method === "negative") result = negative(source);
  else if (state.method === "log") result = logarithmic(source, state.autoLog ? cAuto : state.value);
  else if (state.method === "gamma") result = gammaCorrection(source, state.value);
  else if (state.method === "stretch") result = linearContrast(source, state.mode);
  else result = equalize(source, state.mode);
  if (state.method === "log" && state.autoLog) { $("#valueOutput").textContent = `c = ${cAuto.toFixed(2)} (авто)`; $("#formula").textContent = METHODS.log.formula(cAuto.toFixed(2)); }
  drawAll();
}

function drawImage(image, canvas) {
  const ctx = canvas.getContext("2d"), wrap = canvas.parentElement;
  const fit = Math.min((wrap.clientWidth - 18) / image.width, (wrap.clientHeight - 18) / image.height, 1);
  const scale = state.zoom === "100" ? 1 : fit;
  canvas.width = image.width; canvas.height = image.height;
  canvas.style.width = `${Math.round(image.width * scale)}px`; canvas.style.height = `${Math.round(image.height * scale)}px`;
  ctx.putImageData(image, 0, 0);
}

function drawAll() {
  drawImage(source, sourceCanvas); drawImage(result, resultCanvas);
  $("#sourceInfo").textContent = `${source.width} × ${source.height}`;
  const channel = $("#histChannel").value, before = makeHistogram(source, channel), after = makeHistogram(result, channel), max = commonMaximum(before, after);
  drawHistogram($("#beforeHistogram"), before, max, "#7785a0", "До обработки");
  drawHistogram($("#afterHistogram"), after, max, "#496ce2", "После обработки");
}

function resetParameters() { state.value = METHODS[state.method].default ?? 0; state.mode = "hsv"; state.autoLog = true; configureControls(); processFromOriginal(); }
function loadTest() { source = createTestImage(selectedTestName()); resetParameters(); setStatus(`Загружен: ${selectedTestName()}`); }
function canvasForImage(image) { const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height; canvas.getContext("2d").putImageData(image, 0, 0); return canvas; }
function download(canvas, name) { const a = document.createElement("a"); a.download = name; a.href = canvas.toDataURL("image/png"); a.click(); }

$("#testSelect").innerHTML = TESTS.map(([id, title]) => `<option value="${id}">${id} — ${title}</option>`).join("");
$("#loadTest").addEventListener("click", loadTest);
$("#method").addEventListener("change", (e) => { state.method = e.target.value; state.value = METHODS[state.method].default ?? 0; configureControls(); processFromOriginal(); });
$("#valueRange").addEventListener("input", (e) => { state.value = Number(e.target.value); configureControls(); processFromOriginal(); });
$("#colourMode").addEventListener("change", (e) => { state.mode = e.target.value; processFromOriginal(); });
$("#autoLogCheckbox").addEventListener("change", (e) => { state.autoLog = e.target.checked; configureControls(); processFromOriginal(); });
$("#histChannel").addEventListener("change", drawAll);
$("#zoom").addEventListener("change", (e) => { state.zoom = e.target.value; drawAll(); });
$("#reset").addEventListener("click", resetParameters);
$("#saveResult").addEventListener("click", () => { download(canvasForImage(result), "lab2_result.png"); setStatus("Результат подготовлен к сохранению в PNG."); });
$("#downloadSet").addEventListener("click", () => { TESTS.forEach(([id], index) => setTimeout(() => download(canvasForImage(createTestImage(id)), `${id}.png`), index * 180)); setStatus("Шесть PNG отправлены в загрузки браузера."); });
$("#fileInput").addEventListener("change", (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => { const c = document.createElement("canvas"); c.width = image.naturalWidth; c.height = image.naturalHeight; c.getContext("2d").drawImage(image, 0, 0); source = c.getContext("2d").getImageData(0, 0, c.width, c.height); resetParameters(); setStatus(`Загружен файл: ${file.name}`); }; image.src = reader.result; }; reader.readAsDataURL(file); });
window.addEventListener("resize", drawAll);
configureControls(); processFromOriginal();

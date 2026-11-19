(function () {
  const A = window.RasterAlgorithms, $ = (s) => document.querySelector(s);
  const ids = ["x0", "y0", "x1", "y1", "xc", "yc", "radius", "rangeX", "rangeY"];
  const value = (id) => Number($("#" + id).value) || 0;
  let last = null;
  const grid = new GridCanvas($("#grid"), (p) => { $("#hover").textContent = `Клетка (${p.x}, ${p.y})`; });

  function current() {
    const algorithm = $("#algorithm").value, circle = algorithm === "circle";
    return { algorithm, type: circle ? "circle" : "line", x0: circle ? value("xc") : value("x0"), y0: circle ? value("yc") : value("y0"), x1: value("x1"), y1: value("y1"), radius: Math.max(0, value("radius")), showIdeal: $("#ideal").checked };
  }
  function execute(input, steps = true) {
    if (input.algorithm === "step") return A.stepLine(input.x0, input.y0, input.x1, input.y1, steps);
    if (input.algorithm === "dda") return A.ddaLine(input.x0, input.y0, input.x1, input.y1, steps);
    if (input.algorithm === "bres") return A.bresenhamLine(input.x0, input.y0, input.x1, input.y1, steps);
    if (input.algorithm === "circle") return A.bresenhamCircle(input.x0, input.y0, input.radius, steps);
    if (input.algorithm === "wu") return A.wuLine(input.x0, input.y0, input.x1, input.y1);
    return A.castlePitwayLine(input.x0, input.y0, input.x1, input.y1, steps);
  }
  function nice(n) { return Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 2 }); }
  function renderSteps(result, input) {
    const head = $("#stepsHead"), body = $("#stepsBody"), hint = $("#stepsHint"); body.innerHTML = "";
    if (result.points.length > 200 || !result.steps?.length) { head.innerHTML = ""; hint.textContent = result.points.length > 200 ? "Более 200 клеток: таблица скрыта." : "Для данного алгоритма пошаговая таблица не выводится."; return; }
    hint.textContent = "Значения до записи следующей клетки.";
    let fields = input.algorithm === "step" || input.algorithm === "dda" ? [["i", "i"], ["exactX", "x*"], ["exactY", "y*"], ["x", "x"], ["y", "y"]] : input.algorithm === "circle" ? [["i", "i"], ["x", "x"], ["y", "y"], ["e", "e"], ["d", "2e"]] : input.algorithm === "castle" ? [["i", "i"], ["move", "ход"], ["e", "остаток"], ["x", "x"], ["y", "y"]] : [["i", "i"], ["e", "e"], ["d", "2e"], ["x", "x"], ["y", "y"]];
    head.innerHTML = `<tr>${fields.map(([, title]) => `<th>${title}</th>`).join("")}</tr>`;
    body.innerHTML = result.steps.map((row) => `<tr>${fields.map(([key]) => `<td>${typeof row[key] === "number" && !Number.isInteger(row[key]) ? row[key].toFixed(3) : row[key] ?? ""}</td>`).join("")}</tr>`).join("");
  }
  function draw() {
    const input = current(), t0 = performance.now(), result = execute(input, true), micro = (performance.now() - t0) * 1000;
    last = { input, result }; grid.setView(Math.max(1, value("rangeX")), Math.max(1, value("rangeY"))); grid.draw({ ...input, points: result.points });
    $("#pointCount").textContent = result.points.length; $("#runTime").textContent = `${nice(micro)} мкс`; const showWord = input.algorithm === "castle"; $("#wordRow").classList.toggle("hidden", !showWord); if (showWord) $("#stepWord").textContent = result.word || "—";
    renderSteps(result, input);
  }
  function configure() { const isCircle = $("#algorithm").value === "circle"; $("#lineFields").classList.toggle("hidden", isCircle); $("#circleFields").classList.toggle("hidden", !isCircle); draw(); }
  function quickBenchmark() {
    const input = current(), funcs = [["Пошаговый", A.stepLine], ["ЦДА", A.ddaLine], ["Брезенхем", A.bresenhamLine]], n = 1000, out = [];
    for (const [name, fn] of funcs) { for (let i = 0; i < 20; i++) fn(0, 0, n - 1, Math.round(.4 * (n - 1))); const t = performance.now(); for (let i = 0; i < 50; i++) fn(0, 0, n - 1, Math.round(.4 * (n - 1))); out.push(`${name.padEnd(11)} ${(((performance.now() - t) * 1000) / 50).toFixed(1)} мкс`); }
    const t = performance.now(); for (let i = 0; i < 50; i++) A.bresenhamCircle(0, 0, 177); out.push(`${"Окружность".padEnd(11)} ${(((performance.now() - t) * 1000) / 50).toFixed(1)} мкс`); $("#benchOutput").textContent = `1000 клеток, 50 прогонов\n${out.join("\n")}`;
  }
  $("#draw").addEventListener("click", draw); $("#algorithm").addEventListener("change", configure); $("#ideal").addEventListener("change", draw); ["rangeX", "rangeY"].forEach((id) => $("#" + id).addEventListener("change", draw));
  $("#preset").addEventListener("click", () => { [["x0", 0], ["y0", 0], ["x1", 5], ["y1", 2], ["algorithm", "step"]].forEach(([id, v]) => $("#" + id).value = v); configure(); });
  $("#resetView").addEventListener("click", () => { $("#rangeX").value = 8; $("#rangeY").value = 6; draw(); }); $("#quickBench").addEventListener("click", quickBenchmark); window.addEventListener("resize", () => { if (last) draw(); });
  ids.forEach((id) => $("#" + id).addEventListener("keydown", (e) => { if (e.key === "Enter") draw(); })); draw();
})();

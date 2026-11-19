(() => {
  const $ = (id) => document.getElementById(id);
  const SAMPLES = {
    segments: `# n — число отрезков\n5\n-7 -2 7 3\n-6 4 -2 6\n-2 -5 2 5\n1 1 6 1\n-9 0 9 0\n# xmin ymin xmax ymax\n-4 -3 4 3`,
    polygon: `# m — число вершин выпуклого многоугольника\n6\n-6 -1\n-2 -5\n5 -3\n7 2\n2 6\n-5 4\n# xmin ymin xmax ymax\n-4 -3 4 3`
  };
  const formatText = {
    segments: "Формат: n; затем n строк x₁ y₁ x₂ y₂; последняя строка xmin ymin xmax ymax. Строки с # — комментарии.",
    polygon: "Формат: m; затем m строк x y вершин выпуклого многоугольника; последняя строка xmin ymin xmax ymax."
  };
  let mode = "segments", state = null;
  const canvas = new ClippingCanvas($("grid"), p => $("hover").textContent = `Клетка: (${p.x}; ${p.y})`);
  const num = (text) => {
    const n = Number(text); if (!Number.isFinite(n)) throw new Error(`«${text}» не является числом.`); return n;
  };
  function usefulLines(text) { return text.split(/\r?\n/).map(x => x.replace(/#.*/, "").trim()).filter(Boolean); }
  function values(line, count, where) { const a = line.trim().split(/\s+/); if (a.length !== count) throw new Error(`${where}: нужно ${count} чисел, найдено ${a.length}.`); return a.map(num); }
  function parse() {
    const lines = usefulLines($("source").value); if (lines.length < 2) throw new Error("Недостаточно строк во входных данных.");
    const n = Number(lines[0]); if (!Number.isInteger(n) || n < (mode === "polygon" ? 3 : 1)) throw new Error(mode === "polygon" ? "m должно быть целым числом не меньше 3." : "n должно быть целым числом не меньше 1.");
    if (lines.length !== n + 2) throw new Error(`Ожидалось ${n + 2} содержательных строк, найдено ${lines.length}.`);
    const raw = lines.slice(1, n + 1);
    const r = values(lines[n + 1], 4, "Окно");
    const rect = ClippingAlgorithms.normaliseRect({ xmin:r[0], ymin:r[1], xmax:r[2], ymax:r[3] });
    if (rect.xmin === rect.xmax || rect.ymin === rect.ymax) throw new Error("Отсекающее окно должно иметь ненулевую ширину и высоту.");
    if (mode === "segments") return { rect, segments: raw.map((line, i) => { const a=values(line,4,`Отрезок ${i+1}`); return { a:{x:a[0],y:a[1]}, b:{x:a[2],y:a[3]} }; }) };
    const polygon = raw.map((line, i) => { const a=values(line,2,`Вершина ${i+1}`); return { x:a[0], y:a[1] }; });
    if (!ClippingAlgorithms.isConvexPolygon(polygon)) throw new Error("Для части 2 нужен выпуклый невырожденный многоугольник: обход вершин должен идти по контуру.");
    return { rect, polygon };
  }
  function point(p) { return `(${ClippingAlgorithms.fmt(p.x)}; ${ClippingAlgorithms.fmt(p.y)})`; }
  function setTable(headers, rows) { $("stepsHead").innerHTML = `<tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr>`; $("stepsBody").innerHTML = rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join("")}</tr>`).join(""); }
  function showSegmentSteps(index) {
    const item = state.results[index], headers = ["i", "P0", "код P0", "P1", "код P1", "действие"];
    setTable(headers, item.steps.map(s => [s.iteration, point(s.a), ClippingAlgorithms.codeText(s.ca), point(s.b), ClippingAlgorithms.codeText(s.cb), `${s.action}${s.hit ? ` → ${point(s.hit)}` : ""}`]));
  }
  function showPolygonSteps() {
    const names = { left:"x ≥ xmin", right:"x ≤ xmax", bottom:"y ≥ ymin", top:"y ≤ ymax" };
    setTable(["Отсекающая граница", "Вершины после обработки"], state.result.stages.map(s => [names[s.edge], s.vertices.length ? s.vertices.map(point).join(" ") : "∅"]));
  }
  function draw() {
    if (!state) return;
    if (mode === "segments") canvas.draw({ mode, rect:state.rect, sources:state.segments, visible:state.results.filter(x=>x.accepted).map(x=>x.segment) });
    else canvas.draw({ mode, rect:state.rect, sourcePolygon:state.polygon, visiblePolygon:state.result.polygon });
  }
  function run() {
    try {
      const parsed = parse(); $("message").classList.remove("show");
      if (mode === "segments") {
        const results = ClippingAlgorithms.clipSegments(parsed.segments, parsed.rect);
        state = { ...parsed, results }; $("statLabel").textContent = "Видимых отрезков"; $("stat").textContent = `${results.filter(x=>x.accepted).length} из ${results.length}`;
        $("resultOut").textContent = results.map(x => `${x.index+1}: ${x.accepted ? `${point(x.segment.a)} — ${point(x.segment.b)}` : "не виден"}`).join("\n");
        $("stepsTitle").textContent = "Шаги Сазерленда—Коэна"; $("pickLabel").hidden = false;
        $("pick").innerHTML = results.map(x=>`<option value="${x.index}">Отрезок ${x.index+1}: ${x.accepted ? "принят" : "отклонён"}</option>`).join(""); showSegmentSteps(0);
      } else {
        const result = ClippingAlgorithms.sutherlandHodgman(parsed.polygon, parsed.rect);
        state = { ...parsed, result }; $("statLabel").textContent = "Вершин после отсечения"; $("stat").textContent = result.polygon.length;
        $("resultOut").textContent = result.polygon.length ? result.polygon.map((p,i)=>`${i+1}: ${point(p)}`).join("\n") : "Видимая часть отсутствует.";
        $("stepsTitle").textContent = "Шаги Сазерленда—Ходжмена"; $("pickLabel").hidden = true; showPolygonSteps();
      }
      $("rectOut").textContent = `[${state.rect.xmin}; ${state.rect.ymin}] — [${state.rect.xmax}; ${state.rect.ymax}]`; draw();
    } catch (error) { $("message").textContent = error.message; $("message").classList.add("show"); }
  }
  function choose(newMode) {
    mode = newMode; document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode)); $("source").value=SAMPLES[mode]; $("format").textContent=formatText[mode]; state=null; $("stat").textContent="—"; $("rectOut").textContent="—"; $("resultOut").textContent=""; setTable([],[]); run();
  }
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>choose(b.dataset.mode)));
  $("preset").addEventListener("click",()=>{ $("source").value=SAMPLES[mode]; run(); }); $("apply").addEventListener("click",run);
  $("pick").addEventListener("change",e=>showSegmentSteps(Number(e.target.value)));
  $("resetView").addEventListener("click",()=>{ canvas.setView($("rangeX").value,$("rangeY").value); draw(); });
  window.addEventListener("resize",draw); choose("segments");
})();

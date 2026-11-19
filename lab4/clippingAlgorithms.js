(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ClippingAlgorithms = api;
})(globalThis, function () {
  const LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
  const EPS = 1e-9;
  const copy = (p) => ({ x: Number(p.x), y: Number(p.y) });
  const same = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;

  function normaliseRect(rect) {
    return { xmin: Math.min(Number(rect.xmin), Number(rect.xmax)), xmax: Math.max(Number(rect.xmin), Number(rect.xmax)), ymin: Math.min(Number(rect.ymin), Number(rect.ymax)), ymax: Math.max(Number(rect.ymin), Number(rect.ymax)) };
  }
  function outCode(point, rawRect) {
    const r = normaliseRect(rawRect); let code = 0;
    if (point.x < r.xmin) code |= LEFT; else if (point.x > r.xmax) code |= RIGHT;
    if (point.y < r.ymin) code |= BOTTOM; else if (point.y > r.ymax) code |= TOP;
    return code;
  }
  function codeText(code) {
    if (!code) return "0000 (внутри)";
    const names = [];
    if (code & LEFT) names.push("L"); if (code & RIGHT) names.push("R"); if (code & BOTTOM) names.push("B"); if (code & TOP) names.push("T");
    return `${code.toString(2).padStart(4, "0")} (${names.join("+")})`;
  }
  function fmt(n) { return Math.abs(n) < EPS ? 0 : Number(n.toFixed(3)); }

  // Сазерленд—Коэн: пересечение ищется с явной прямой P(t)=P0+t(P1-P0).
  function cohenSutherland(rawA, rawB, rawRect) {
    const r = normaliseRect(rawRect); let a = copy(rawA), b = copy(rawB), iteration = 0;
    const steps = [];
    while (iteration++ < 20) {
      const ca = outCode(a, r), cb = outCode(b, r);
      if ((ca | cb) === 0) {
        steps.push({ iteration, a: copy(a), b: copy(b), ca, cb, action: "Принять: оба кода равны 0" });
        return { accepted: true, segment: { a, b }, steps };
      }
      if ((ca & cb) !== 0) {
        steps.push({ iteration, a: copy(a), b: copy(b), ca, cb, action: "Отклонить: общий внешний бит" });
        return { accepted: false, segment: null, steps };
      }
      const replaceA = ca !== 0, code = replaceA ? ca : cb, p = replaceA ? a : b, q = replaceA ? b : a;
      let hit, edge;
      if (code & TOP) { edge = "y = ymax"; hit = { x: p.x + (q.x - p.x) * (r.ymax - p.y) / (q.y - p.y), y: r.ymax }; }
      else if (code & BOTTOM) { edge = "y = ymin"; hit = { x: p.x + (q.x - p.x) * (r.ymin - p.y) / (q.y - p.y), y: r.ymin }; }
      else if (code & RIGHT) { edge = "x = xmax"; hit = { x: r.xmax, y: p.y + (q.y - p.y) * (r.xmax - p.x) / (q.x - p.x) }; }
      else { edge = "x = xmin"; hit = { x: r.xmin, y: p.y + (q.y - p.y) * (r.xmin - p.x) / (q.x - p.x) }; }
      steps.push({ iteration, a: copy(a), b: copy(b), ca, cb, action: `Заменить ${replaceA ? "P0" : "P1"}: пересечение с ${edge}`, hit: copy(hit) });
      if (replaceA) a = hit; else b = hit;
    }
    throw new Error("Слишком много итераций: проверьте входные координаты.");
  }
  function clipSegments(segments, rect) { return segments.map((s, index) => ({ index, source: { a: copy(s.a), b: copy(s.b) }, ...cohenSutherland(s.a, s.b, rect) })); }

  function inside(p, edge, r) {
    if (edge === "left") return p.x >= r.xmin - EPS;
    if (edge === "right") return p.x <= r.xmax + EPS;
    if (edge === "bottom") return p.y >= r.ymin - EPS;
    return p.y <= r.ymax + EPS;
  }
  function intersection(a, b, edge, r) {
    let p;
    if (edge === "left" || edge === "right") { const x = edge === "left" ? r.xmin : r.xmax; p = { x, y: a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x) }; }
    else { const y = edge === "bottom" ? r.ymin : r.ymax; p = { x: a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y), y }; }
    // Точку не округляем: она может участвовать в следующем пересечении.
    // Округление делается только при отображении результата.
    return p;
  }
  function clipByEdge(vertices, edge, rect) {
    const r = normaliseRect(rect), result = [];
    if (!vertices.length) return result;
    let s = vertices[vertices.length - 1];
    for (const e of vertices) {
      const sIn = inside(s, edge, r), eIn = inside(e, edge, r);
      if (eIn) { if (!sIn) result.push(intersection(s, e, edge, r)); result.push(copy(e)); }
      else if (sIn) result.push(intersection(s, e, edge, r));
      s = e;
    }
    return result.filter((p, i, arr) => i === 0 || !same(p, arr[i - 1]));
  }
  // Сазерленд—Ходжмен: окно выпуклое; многоугольник последовательно режется 4 полуплоскостями.
  function sutherlandHodgman(vertices, rect) {
    let current = vertices.map(copy); const stages = [];
    for (const edge of ["left", "right", "bottom", "top"]) { current = clipByEdge(current, edge, rect); stages.push({ edge, vertices: current.map(copy) }); }
    return { polygon: current, stages };
  }
  function isConvexPolygon(points) {
    if (points.length < 3) return false; let sign = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length], c = points[(i + 2) % points.length];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) < EPS) continue; const current = Math.sign(cross); if (sign && sign !== current) return false; sign = current;
    }
    return sign !== 0;
  }
  return { LEFT, RIGHT, BOTTOM, TOP, normaliseRect, outCode, codeText, cohenSutherland, clipSegments, sutherlandHodgman, isConvexPolygon, fmt };
});

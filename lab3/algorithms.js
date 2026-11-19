/* UMD: works as window.RasterAlgorithms in a browser and require('./algorithms.js') in Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.RasterAlgorithms = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const sign = (n) => n < 0 ? -1 : n > 0 ? 1 : 0;
  const key = (x, y) => `${x},${y}`;
  const point = (x, y, alpha = 1) => ({ x, y, alpha });

  // N=max(|dx|,|dy|); every point is calculated independently from i.
  function stepLine(x0, y0, x1, y1, withSteps = false) {
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy));
    if (n === 0) return { points: [point(x0, y0)], steps: withSteps ? [{ i: 0, exactX: x0, exactY: y0, x: x0, y: y0 }] : [] };
    const points = [], steps = [];
    for (let i = 0; i <= n; i++) {
      const exactX = x0 + i * dx / n, exactY = y0 + i * dy / n;
      const p = point(Math.round(exactX), Math.round(exactY)); points.push(p);
      if (withSteps) steps.push({ i, exactX, exactY, x: p.x, y: p.y });
    }
    return { points, steps };
  }

  // DDA calculates dx and dy once, then adds them to the unrounded values.
  function ddaLine(x0, y0, x1, y1, withSteps = false) {
    const deltaX = x1 - x0, deltaY = y1 - y0, n = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    if (n === 0) return { points: [point(x0, y0)], steps: withSteps ? [{ i: 0, exactX: x0, exactY: y0, x: x0, y: y0 }] : [] };
    const incX = deltaX / n, incY = deltaY / n, points = [], steps = [];
    let exactX = x0, exactY = y0;
    for (let i = 0; i <= n; i++) {
      const p = point(Math.round(exactX), Math.round(exactY)); points.push(p);
      if (withSteps) steps.push({ i, exactX, exactY, x: p.x, y: p.y });
      exactX += incX; exactY += incY;
    }
    // Explicit endpoint protects the required result from accumulated floating error.
    points[points.length - 1] = point(x1, y1);
    if (withSteps) { steps[steps.length - 1].x = x1; steps[steps.length - 1].y = y1; }
    return { points, steps };
  }

  // Integer Bresenham for every octant and direction. No division or float in the loop.
  function bresenhamLine(x0, y0, x1, y1, withSteps = false) {
    const points = [], steps = [];
    const a = Math.abs(x1 - x0), b = Math.abs(y1 - y0), sx = sign(x1 - x0), sy = sign(y1 - y0);
    let x = x0, y = y0, e = a - b, i = 0;
    while (true) {
      points.push(point(x, y));
      const d = 2 * e;
      if (withSteps) steps.push({ i: i++, x, y, e, d });
      if (x === x1 && y === y1) break;
      if (d > -b) { e -= b; x += sx; }
      if (d < a) { e += a; y += sy; }
    }
    return { points, steps };
  }

  function addUnique(list, seen, x, y) { const id = key(x, y); if (!seen.has(id)) { seen.add(id); list.push(point(x, y)); } }

  // Integer midpoint/Bresenham circle. Eight symmetric points are deduplicated on axes/diagonals.
  function bresenhamCircle(xc, yc, radius, withSteps = false) {
    const r = Math.max(0, Math.round(Math.abs(radius))), points = [], steps = [], seen = new Set();
    let x = 0, y = r, e = 3 - 2 * r, i = 0;
    while (x <= y) {
      [[x, y], [y, x], [-x, y], [-y, x], [x, -y], [y, -x], [-x, -y], [-y, -x]].forEach(([dx, dy]) => addUnique(points, seen, xc + dx, yc + dy));
      if (withSteps) steps.push({ i: i++, x, y, e, d: 2 * e });
      if (e < 0) e += 4 * x + 6;
      else { e += 4 * (x - y) + 10; y--; }
      x++;
    }
    return { points, steps };
  }

  // Bonus: Xiaolin Wu. Alpha is the coverage of the cell, not a colour component.
  function wuLine(x0, y0, x1, y1) {
    const points = [], add = (x, y, alpha) => { if (alpha > 0) points.push(point(x, y, Math.max(0, Math.min(1, alpha)))); };
    const ipart = Math.floor, fpart = (x) => x - Math.floor(x), rfpart = (x) => 1 - fpart(x);
    const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
    if (steep) [x0, y0, x1, y1] = [y0, x0, y1, x1];
    if (x0 > x1) [x0, x1, y0, y1] = [x1, x0, y1, y0];
    const dx = x1 - x0, dy = y1 - y0;
    if (dx === 0) return { points: bresenhamLine(steep ? y0 : x0, steep ? x0 : y0, steep ? y1 : x1, steep ? x1 : y1).points, steps: [] };
    const gradient = dy / dx;
    let xEnd = Math.round(x0), yEnd = y0 + gradient * (xEnd - x0), xGap = rfpart(x0 + .5), xPixel1 = xEnd, yPixel1 = ipart(yEnd);
    const plot = (x, y, a) => steep ? add(y, x, a) : add(x, y, a);
    plot(xPixel1, yPixel1, rfpart(yEnd) * xGap); plot(xPixel1, yPixel1 + 1, fpart(yEnd) * xGap);
    let interY = yEnd + gradient;
    xEnd = Math.round(x1); yEnd = y1 + gradient * (xEnd - x1); xGap = fpart(x1 + .5); const xPixel2 = xEnd, yPixel2 = ipart(yEnd);
    for (let x = xPixel1 + 1; x < xPixel2; x++) { plot(x, ipart(interY), rfpart(interY)); plot(x, ipart(interY) + 1, fpart(interY)); interY += gradient; }
    plot(xPixel2, yPixel2, rfpart(yEnd) * xGap); plot(xPixel2, yPixel2 + 1, fpart(yEnd) * xGap);
    return { points, steps: [] };
  }

  // Bonus: the Euclidean (major/minor) step word, then transformed to the needed octant.
  function castlePitwayLine(x0, y0, x1, y1, withSteps = false) {
    const dx = x1 - x0, dy = y1 - y0, ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax === 0 && ay === 0) return { points: [point(x0, y0)], steps: [], word: "" };
    const majorX = ax >= ay, major = majorX ? ax : ay, minor = majorX ? ay : ax;
    const sx = sign(dx), sy = sign(dy), points = [point(x0, y0)], steps = [], word = [];
    let x = x0, y = y0, error = 0;
    // This is the integer Euclidean distribution of minor diagonal moves over major moves.
    for (let i = 0; i < major; i++) {
      error += minor; let diagonal = false;
      if (2 * error >= major) { error -= major; diagonal = true; }
      if (majorX) { x += sx; if (diagonal) y += sy; } else { y += sy; if (diagonal) x += sx; }
      word.push(diagonal ? "d" : "s"); points.push(point(x, y));
      if (withSteps) steps.push({ i, x, y, e: error, move: word[word.length - 1] });
    }
    points[points.length - 1] = point(x1, y1);
    return { points, steps, word: word.join("") };
  }

  return { stepLine, ddaLine, bresenhamLine, bresenhamCircle, wuLine, castlePitwayLine };
});

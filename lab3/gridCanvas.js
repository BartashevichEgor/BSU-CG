(function (root) {
  class GridCanvas {
    constructor(canvas, onHover) { this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.onHover = onHover; this.view = { x: 8, y: 6 }; this.hover = null; canvas.addEventListener("mousemove", (e) => this.mouse(e)); canvas.addEventListener("mouseleave", () => { this.hover = null; this.draw(this.last || {}); }); }
    setView(x, y) { this.view = { x: Math.max(1, x), y: Math.max(1, y) }; }
    resize() { const r = this.canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.width = r.width; this.height = r.height; }
    geometry() { const cell = Math.min(this.width / (2 * this.view.x + 1), this.height / (2 * this.view.y + 1)); return { cell, cx: this.width / 2, cy: this.height / 2 }; }
    mouse(event) { const r = this.canvas.getBoundingClientRect(), g = this.geometry(); this.hover = { x: Math.round((event.clientX - r.left - g.cx) / g.cell), y: Math.round((g.cy - (event.clientY - r.top)) / g.cell) }; if (this.onHover) this.onHover(this.hover); this.draw(this.last || {}); }
    line(ctx, x1, y1, x2, y2, colour, width = 1) { ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    draw(input) {
      this.last = input; this.resize(); const ctx = this.ctx, { cell, cx, cy } = this.geometry(), { x: rx, y: ry } = this.view;
      ctx.clearRect(0, 0, this.width, this.height); ctx.fillStyle = "#fcfdff"; ctx.fillRect(0, 0, this.width, this.height);
      const toS = (x, y) => [cx + x * cell, cy - y * cell];
      ctx.strokeStyle = "#dce4ef"; ctx.lineWidth = 1;
      for (let x = -rx - .5; x <= rx + .5; x++) { const sx = cx + x * cell; this.line(ctx, sx, 0, sx, this.height, "#dce4ef"); }
      for (let y = -ry - .5; y <= ry + .5; y++) { const sy = cy - y * cell; this.line(ctx, 0, sy, this.width, sy, "#dce4ef"); }
      this.line(ctx, 0, cy, this.width, cy, "#526078", 1.4); this.line(ctx, cx, 0, cx, this.height, "#526078", 1.4);
      // Axis arrows.
      ctx.fillStyle = "#526078"; ctx.beginPath(); ctx.moveTo(this.width - 3, cy); ctx.lineTo(this.width - 11, cy - 4); ctx.lineTo(this.width - 11, cy + 4); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx, 3); ctx.lineTo(cx - 4, 11); ctx.lineTo(cx + 4, 11); ctx.fill();
      const labelStep = Math.max(1, Math.ceil(36 / cell)); ctx.font = "12px system-ui"; ctx.fillStyle = "#58677e";
      for (let x = -rx; x <= rx; x++) if (x && x % labelStep === 0) { const [sx] = toS(x, 0); ctx.fillText(x, sx - 4, cy + 15); }
      for (let y = -ry; y <= ry; y++) if (y && y % labelStep === 0) { const [, sy] = toS(0, y); ctx.fillText(y, cx + 5, sy + 4); }
      ctx.fillText("X", this.width - 16, cy - 7); ctx.fillText("Y", cx + 7, 14);
      if (input.showIdeal && input.type === "line") { const [a, b] = toS(input.x0, input.y0), [c, d] = toS(input.x1, input.y1); this.line(ctx, a, b, c, d, "#ed5d5d", 1.3); }
      if (input.showIdeal && input.type === "circle") { const [x, y] = toS(input.x0, input.y0); ctx.strokeStyle = "#ed5d5d"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(x, y, input.radius * cell, 0, Math.PI * 2); ctx.stroke(); }
      for (const p of input.points || []) { const [x, y] = toS(p.x, p.y); const alpha = p.alpha ?? 1; ctx.fillStyle = `rgba(53, 100, 220, ${alpha})`; ctx.fillRect(x - cell / 2 + 1, y - cell / 2 + 1, Math.max(1, cell - 2), Math.max(1, cell - 2)); }
      if (this.hover && Math.abs(this.hover.x) <= rx && Math.abs(this.hover.y) <= ry) { const [x, y] = toS(this.hover.x, this.hover.y); ctx.strokeStyle = "#f29c38"; ctx.lineWidth = 2; ctx.strokeRect(x - cell / 2 + 1, y - cell / 2 + 1, Math.max(1, cell - 2), Math.max(1, cell - 2)); }
    }
  }
  root.GridCanvas = GridCanvas;
})(globalThis);

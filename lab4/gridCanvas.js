(function (root) {
  class ClippingCanvas {
    constructor(canvas, onHover) { this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.view = { x: 10, y: 7 }; this.onHover = onHover; canvas.addEventListener("mousemove", e => this.mouse(e)); canvas.addEventListener("mouseleave", () => { this.hover = null; this.draw(this.last || {}); }); }
    setView(x, y) { this.view = { x: Math.max(1, Number(x)), y: Math.max(1, Number(y)) }; }
    resize() { const r = this.canvas.getBoundingClientRect(), d = devicePixelRatio || 1; this.canvas.width = Math.round(r.width * d); this.canvas.height = Math.round(r.height * d); this.ctx.setTransform(d, 0, 0, d, 0, 0); this.w = r.width; this.h = r.height; }
    geometry() { const cell = Math.min(this.w / (2 * this.view.x + 1), this.h / (2 * this.view.y + 1)); return { cell, cx: this.w / 2, cy: this.h / 2 }; }
    mouse(e) { const r = this.canvas.getBoundingClientRect(), g = this.geometry(); this.hover = { x: Math.round((e.clientX - r.left - g.cx) / g.cell), y: Math.round((g.cy - (e.clientY - r.top)) / g.cell) }; this.onHover?.(this.hover); this.draw(this.last || {}); }
    line(a, b, colour, width = 2, dash = []) { const g = this.geometry(), c = this.ctx, p = [g.cx + a.x * g.cell, g.cy - a.y * g.cell], q = [g.cx + b.x * g.cell, g.cy - b.y * g.cell]; c.strokeStyle = colour; c.lineWidth = width; c.setLineDash(dash); c.beginPath(); c.moveTo(...p); c.lineTo(...q); c.stroke(); c.setLineDash([]); }
    polygon(points, stroke, fill, width = 2, dash = []) { if (!points?.length) return; const g = this.geometry(), c = this.ctx; c.beginPath(); points.forEach((p, i) => { const x = g.cx + p.x * g.cell, y = g.cy - p.y * g.cell; if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } c.strokeStyle = stroke; c.lineWidth = width; c.setLineDash(dash); c.stroke(); c.setLineDash([]); }
    rect(r) { this.polygon([{ x:r.xmin,y:r.ymin },{ x:r.xmax,y:r.ymin },{ x:r.xmax,y:r.ymax },{ x:r.xmin,y:r.ymax }], "#ee8b22", "rgba(242,156,56,.10)", 2.5); }
    dot(p, colour, text) { const g = this.geometry(), c = this.ctx, x = g.cx + p.x * g.cell, y = g.cy - p.y * g.cell; c.fillStyle = colour; c.beginPath(); c.arc(x, y, 4.2, 0, Math.PI * 2); c.fill(); if (text) { c.font = "12px system-ui"; c.fillText(text, x + 6, y - 6); } }
    draw(data) { this.last = data; this.resize(); const c = this.ctx, g = this.geometry(), {x:rx,y:ry} = this.view;
      c.fillStyle = "#fcfdff"; c.fillRect(0,0,this.w,this.h);
      for (let x=-rx-.5;x<=rx+.5;x++) this.rawLine(g.cx+x*g.cell,0,g.cx+x*g.cell,this.h,"#dce4ef");
      for (let y=-ry-.5;y<=ry+.5;y++) this.rawLine(0,g.cy-y*g.cell,this.w,g.cy-y*g.cell,"#dce4ef");
      this.rawLine(0,g.cy,this.w,g.cy,"#526078",1.4); this.rawLine(g.cx,0,g.cx,this.h,"#526078",1.4);
      const step=Math.max(1,Math.ceil(36/g.cell)); c.font="12px system-ui"; c.fillStyle="#58677e";
      for(let x=-rx;x<=rx;x++)if(x&&x%step===0)c.fillText(x,g.cx+x*g.cell-4,g.cy+15);
      for(let y=-ry;y<=ry;y++)if(y&&y%step===0)c.fillText(y,g.cx+5,g.cy-y*g.cell+4);
      c.fillText("X",this.w-16,g.cy-7); c.fillText("Y",g.cx+7,14);
      if (data.rect) this.rect(data.rect);
      if (data.mode === "segments") { for (const s of data.sources || []) this.line(s.a,s.b,"#6b7a90",1.8,[5,4]); for (const s of data.visible || []) { this.line(s.a,s.b,"#197a53",4); this.dot(s.a,"#197a53"); this.dot(s.b,"#197a53"); } }
      else { this.polygon(data.sourcePolygon,"#63738a","rgba(99,115,138,.08)",2,[6,4]); this.polygon(data.visiblePolygon,"#197a53","rgba(25,122,83,.18)",3); (data.visiblePolygon || []).forEach((p,i)=>this.dot(p,"#197a53",i+1)); }
      if (this.hover && Math.abs(this.hover.x)<=rx && Math.abs(this.hover.y)<=ry) { const x=g.cx+this.hover.x*g.cell,y=g.cy-this.hover.y*g.cell; c.strokeStyle="#f29c38";c.lineWidth=2;c.strokeRect(x-g.cell/2+1,y-g.cell/2+1,Math.max(1,g.cell-2),Math.max(1,g.cell-2)); }
    }
    rawLine(x1,y1,x2,y2,color,width=1){const c=this.ctx;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
  }
  root.ClippingCanvas = ClippingCanvas;
})(globalThis);

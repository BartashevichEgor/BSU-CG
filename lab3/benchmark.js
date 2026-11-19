/* node benchmark.js — core loops only: no Canvas and no allocation of point objects. */
"use strict";

const sizes = [{ n: 1000, r: 177, repeats: 1000, unit: "мкс" }, { n: 100000, r: 17678, repeats: 15, unit: "мс" }, { n: 10000000, r: 1767767, repeats: 3, unit: "мс" }];
let sink = 0;
function stepCore(x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy)); for (let i = 0; i <= n; i++) sink += Math.round(x0 + i * dx / n) + Math.round(y0 + i * dy / n); }
function ddaCore(x0, y0, x1, y1) { const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy)); let x = x0, y = y0; for (let i = 0; i <= n; i++) { sink += Math.round(x) + Math.round(y); x += dx / n; y += dy / n; } }
function bresCore(x0, y0, x1, y1) { const a = Math.abs(x1-x0), b = Math.abs(y1-y0), sx = x1>x0?1:x1<x0?-1:0, sy = y1>y0?1:y1<y0?-1:0; let e=a-b,x=x0,y=y0; while(true){sink+=x+y;if(x===x1&&y===y1)break;const d=2*e;if(d>-b){e-=b;x+=sx}if(d<a){e+=a;y+=sy}} }
function circleCore(r) { let x=0,y=r,e=3-2*r; while(x<=y){sink+=x+y;if(e<0)e+=4*x+6;else{e+=4*(x-y)+10;y--}x++} }
function measure(fn, args, repeats, unit) { for (let i=0;i<3;i++) fn(...args); const start=process.hrtime.bigint(); for (let i=0;i<repeats;i++) fn(...args); const ms=Number(process.hrtime.bigint()-start)/1e6/repeats; return unit==="мкс" ? ms*1000 : ms; }
for (const test of sizes) { const end = test.n-1, y = Math.round(.4*end); console.log(`\n${test.n.toLocaleString("ru-RU")} клеток · среднее ${test.repeats} прогонов · ${test.unit}`); for (const [name, fn, args] of [["Пошаговый",stepCore,[0,0,end,y]],["ЦДА",ddaCore,[0,0,end,y]],["Брезенхем: отрезок",bresCore,[0,0,end,y]],["Брезенхем: окружность",circleCore,[test.r]]]) console.log(`${name.padEnd(24)} ${measure(fn,args,test.repeats,test.unit).toFixed(test.unit==="мкс"?1:3)}`); }
if (sink === Number.MIN_SAFE_INTEGER) console.log(sink);

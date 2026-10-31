global.window = {};
require("../public/gens.js");
const G = window.GENS;
let bad = 0;
for (const g of G.list) {
  for (let i = 0; i < 300; i++) {
    let it;
    try { it = g.make(); } catch (e) { console.log("THROW", g.id, e.message); bad++; break; }
    if (!it.q || !it.type || !it.pre || !it.why) { console.log("MISSING", g.id, Object.keys(it)); bad++; break; }
    if (it.type === "short" && (!it.a || !it.a.length || it.a.some(x => x === undefined || x === "NaN"))) { console.log("BADANS", g.id, it.a); bad++; break; }
    if (it.type === "fill" && (!it.b || it.b.length !== (it.q.match(/\{\{#\d+\}\}/g) || []).length)) { console.log("BADFILL", g.id); bad++; break; }
  }
}
console.log("gens", G.list.length, "bad", bad);
// δείγματα
const T = G._test;
const r = T.schedule("RR", [{name:"P1",arr:0,burst:5},{name:"P2",arr:1,burst:3},{name:"P3",arr:2,burst:1}], 2);
console.log("RR", r.gantt.join(" "), r.avgW);
const s = T.schedule("SRTF", [{name:"P1",arr:0,burst:8},{name:"P2",arr:1,burst:4},{name:"P3",arr:2,burst:9},{name:"P4",arr:3,burst:5}], 0);
console.log("SRTF", s.gantt.join(" "), s.avgW, "(textbook 6.5)");
console.log("FIFO", T.pageFaults("FIFO",[7,0,1,2,0,3,0,4,2,3,0,3,2,1,2,0,1,7,0,1],3).faults, "(15)");
console.log("LRU", T.pageFaults("LRU",[7,0,1,2,0,3,0,4,2,3,0,3,2,1,2,0,1,7,0,1],3).faults, "(12)");
console.log("OPT", T.pageFaults("OPT",[7,0,1,2,0,3,0,4,2,3,0,3,2,1,2,0,1,7,0,1],3).faults, "(9)");
for (const id of ["base","sched","closure","sql","sort"]) { const it = G.byId[id].make(); console.log("----", id, "\n", it.q, "\n=>", JSON.stringify(it.a ?? it.b), "\n", it.why.slice(0, 300)); }

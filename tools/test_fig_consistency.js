const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto("http://localhost:8765/#/"); await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    let bad = [], n = 0;
    for (let k = 0; k < 3000; k++) {
      const it = GENS.byId.paging.make(); const f = it.fig;
      const sim = FIG.simulate(f.refs, f.n, f.algo).filter(s => s.fault).length;
      n++; if (String(sim) !== it.a[0]) bad.push([f.algo, f.n, f.refs.join(" "), sim, it.a[0]]);
    }
    for (let k = 0; k < 1500; k++) {
      const it = GENS.byId.sched.make(); const segs = it.fig.segs;
      for (let i = 1; i < segs.length; i++) if (segs[i][1] !== segs[i - 1][2]) bad.push(["gap", JSON.stringify(segs)]);
    }
    // παραδείγματα μαθήματος
    const ex = ["FIFO", "LRU", "OPT"].map(a => FIG.simulate([7, 0, 1, 2, 0, 3, 0, 4], 3, a).filter(s => s.fault).length);
    const belady = FIG.simulate([1,2,3,4,1,2,5,1,2,3,4,5], 3, "FIFO").filter(s => s.fault).length;
    return { n, bad: bad.slice(0, 5), nbad: bad.length, ex, belady };
  });
  console.log(JSON.stringify(r)); await b.close();
})();

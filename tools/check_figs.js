// Ελέγχει ΟΛΑ τα διαγράμματα: θεωρία/παράδειγμα, ερωτήσεις (πριν/μετά την απάντηση), γεννήτριες.
// Χρήση: node tools/check_figs.js [φίλτρο-lesson] [--shots DIR]
const { chromium } = require("playwright");
const fs = require("fs");
const args = process.argv.slice(2);
const shotDir = args.includes("--shots") ? args[args.indexOf("--shots") + 1] : null;
const filter = args.find(a => !a.startsWith("--") && a !== shotDir) || "";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto("http://localhost:8765/#/"); await p.waitForTimeout(700);
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });
  // όλα τα specs
  const jobs = await p.evaluate(() => {
    const C = window.PLH.C(), out = [];
    const re = /```fig\s*\n([\s\S]*?)\n```/g;
    for (const c of C.courses) for (const u of c.units) for (const l of u.lessons) {
      for (const part of ["theory", "example"]) { let m, i = 0; re.lastIndex = 0; while ((m = re.exec(l[part]))) out.push({ id: `${l.id}.${part}.${i++}`, spec: m[1] }); }
      for (const it of l.items) if (it.fig) out.push({ id: it.id, spec: JSON.stringify(it.fig), q: true });
    }
    for (const g of GENS.list) for (let k = 0; k < 30; k++) { const it = g.make(); if (it.fig) out.push({ id: `gen:${g.id}:${k}`, spec: JSON.stringify(it.fig), q: true, gen: true }); }
    return out;
  });
  const sel = jobs.filter(j => j.id.includes(filter));
  let bad = 0, steps = 0;
  for (const j of sel) {
    const r = await p.evaluate(async ({ spec, q }) => {
      const host = document.createElement("div"); host.style.width = "360px"; host.id = "figtest";
      document.getElementById("view").innerHTML = ""; document.getElementById("view").appendChild(host);
      const sp = JSON.parse(spec); const probs = [];
      FIG.mount(host, sp, {});
      const check = tag => {
        const h = host.innerHTML;
        if (/NaN|undefined|Infinity/.test(h.replace(/aria-label="[^"]*"/g, ""))) probs.push(tag + ": NaN/undefined");
        if (/σφάλμα διαγράμματος|άγνωστος τύπος/.test(h)) probs.push(tag + ": " + host.textContent.slice(0, 120));
        // επικαλύψεις κειμένων
        const ts = [...host.querySelectorAll("svg text")].map(t => t.getBoundingClientRect()).filter(r => r.width > 0);
        let ov = 0;
        for (let a = 0; a < ts.length; a++) for (let c = a + 1; c < ts.length; c++) {
          const A = ts[a], B = ts[c], ix = Math.min(A.right, B.right) - Math.max(A.left, B.left), iy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
          if (ix > 3 && iy > 3) ov++;
        }
        if (ov) probs.push(tag + `: ${ov} επικαλύψεις κειμένου`);
      };
      check("k0");
      const nx = host.querySelector('[data-a="next"]'); let n = 0;
      if (nx) { const tot = host.querySelectorAll(".fdots i").length || 30; for (let k = 1; k < tot; k++) { nx.click(); n++; check("k" + k); } nx.click(); }
      if (q && host._fig) { host._fig.reveal(); check("reveal"); }
      return { probs, n };
    }, j);
    steps += r.n;
    if (r.probs.length) { bad++; console.log("✗", j.id, r.probs.slice(0, 4).join(" | ")); }
    if (shotDir && (!j.gen || /:0$/.test(j.id))) {
      const el = await p.$("#figtest"); if (el) await el.screenshot({ path: `${shotDir}/${j.id.replace(/[^\w.-]/g, "_")}.png` });
    }
  }
  console.log(JSON.stringify({ figs: sel.length, gens: sel.filter(j => j.gen).length, steps, bad, pageErrors: [...new Set(errs)].slice(0, 5) }));
  await b.close();
})();

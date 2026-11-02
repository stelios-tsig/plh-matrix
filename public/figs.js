/* PLH//MATRIX · διαγράμματα SVG
   Τύποι: graph (ΔΜΚ, ΔΟΣ, ΔΡΔ, ΔΡΠ, κλάσεις, δείκτες, λίστες), tree, gantt, frames, arr, stack, logic.
   Βήμα-βήμα με steps[], μάσκες ερωτήσεων με [[τιμή]] (εμφανίζεται «?» μέχρι την απάντηση). */
(() => {
"use strict";
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const MASK = /\[\[(.+?)\]\]/g;
const masked = s => /\[\[/.test(String(s ?? ""));
const unmask = (s, rv) => String(s ?? "").replace(MASK, (_, v) => rv ? v : "?");
const r1 = x => Math.round(x * 10) / 10;
const inl = s => (window.marked ? marked.parseInline(String(s || ""), { mangle: false }) : esc(s));
const CW = 6.9;   // πλάτος χαρακτήρα mono στα 11.5px

/* κείμενο με πολλές γραμμές, κεντραρισμένο κάθετα */
function T(x, y, s, st, cls = "", anchor = "middle", lh = 13) {
  const raw = String(s ?? ""), m = masked(raw);
  const lines = unmask(raw, st.reveal).split("\n");
  const y0 = y - (lines.length - 1) * lh / 2;
  const c = (cls + (m ? (st.reveal ? " ans" : " ask") : "")).trim();
  return `<text class="${c}" x="${r1(x)}" y="${r1(y0)}" text-anchor="${anchor}" dominant-baseline="central">` +
    lines.map((l, i) => `<tspan x="${r1(x)}"${i ? ` dy="${lh}"` : ""}>${esc(l)}</tspan>`).join("") + `</text>`;
}
const longest = s => Math.max(...String(s ?? "").replace(MASK, "$1").split("\n").map(l => [...l].length));
const nlines = s => String(s ?? "").split("\n").length;

/* ================================================================ GRAPH */
function gsize(n) {
  const s = n.s || "rect";
  if (s === "circle" || s === "dcircle") { const r = n.r || Math.max(20, longest(n.t) * 3.6 + 6); return { w: 2 * r, h: 2 * r, r }; }
  if (s === "dot") return { w: 12, h: 12, r: 6 };
  if (s === "end") return { w: 20, h: 20, r: 10 };
  if (s === "conn") return { w: 24, h: 24, r: 12 };
  if (s === "txt") return { w: n.w || longest(n.t) * CW, h: n.h || nlines(n.t) * 13 };
  if (s === "var") return { w: n.w || Math.max(54, longest(n.t) * CW + 18), h: n.h || 30 };
  if (s === "lnode") return { w: n.w || Math.max(70, longest(n.t) * CW + 46), h: n.h || 30 };
  if (s === "class") {
    const rows = [n.t, ...(n.a || []), ...(n.m || [])];
    const w = n.w || Math.max(...rows.map(r => longest(r))) * CW + 22;
    const h = 24 + ((n.a || []).length || 0.6) * 14 + ((n.m || []).length || 0.6) * 14 + 10;
    return { w, h };
  }
  const lw = longest(n.t) * CW, lh = nlines(n.t) * 13;
  if (s === "diamond" || s === "dec" || s === "wdiamond") return { w: n.w || Math.max(96, lw * 1.6 + 26), h: n.h || Math.max(48, lh * 1.7 + 18) };
  if (s === "ellipse") return { w: n.w || Math.max(70, lw + 26), h: n.h || Math.max(28, lh + 14) };
  if (s === "io") return { w: n.w || lw + 44, h: n.h || lh + 16 };
  if (s === "store") return { w: n.w || lw + 24, h: n.h || 28 };
  return { w: n.w || Math.max(64, lw + 22), h: n.h || Math.max(30, lh + 14) };
}
function clip(n, px, py) {   // σημείο στο περίγραμμα του n προς την κατεύθυνση (px,py)
  const dx = px - n.x, dy = py - n.y, s = n.s || "rect";
  if (!dx && !dy) return [n.x, n.y];
  const a = n.w / 2, b = n.h / 2;
  let t;
  if (["circle", "dcircle", "dot", "end", "conn"].includes(s)) t = (n.r + 1) / Math.hypot(dx, dy);
  else if (s === "ellipse") t = 1 / Math.sqrt((dx / a) ** 2 + (dy / b) ** 2);
  else if (s === "diamond" || s === "dec" || s === "wdiamond") t = 1 / (Math.abs(dx) / a + Math.abs(dy) / b);
  else if (s === "txt") t = Math.min(Math.abs((a + 3) / dx) || 1e9, Math.abs((b + 3) / dy) || 1e9);
  else if (s === "var") { const bx = n.w / 2, by = 15; t = Math.min(Math.abs(bx / dx) || 1e9, Math.abs(by / dy) || 1e9); }
  else t = Math.min(Math.abs(a / dx) || 1e9, Math.abs(b / dy) || 1e9);
  return [n.x + dx * t, n.y + dy * t];
}
function port(n, p) {
  const a = n.w / 2, b = (n.s === "var" ? 15 : n.h / 2);
  if (p === "r") return [n.x + a, n.y];
  if (p === "l") return [n.x - a, n.y];
  if (p === "t") return [n.x, n.y - b];
  if (p === "b") return [n.x, n.y + b];
  if (p === "next") return [n.x + a - 13, n.y];          // κουτάκι next σε κόμβο λίστας
  if (Array.isArray(p)) return [n.x + p[0], n.y + p[1]];
  return null;
}
function edgeGeom(e, N) {
  const a = N[e.f], b = N[e.t];
  if (!a || !b) throw new Error(`ακμή ${e.f}→${e.t}: άγνωστος κόμβος`);
  if (e.f === e.t) {     // αυτο-βρόχος
    const side = e.loop || "r", ang = { r: 0, b: 90, l: 180, t: -90 }[side] * Math.PI / 180;
    let p1, p2;
    if (["circle", "dcircle", "conn"].includes(a.s)) {
      p1 = clip(a, a.x + Math.cos(ang - .45) * 100, a.y + Math.sin(ang - .45) * 100);
      p2 = clip(a, a.x + Math.cos(ang + .45) * 100, a.y + Math.sin(ang + .45) * 100);
    } else {   // ορθογώνια: δύο σημεία πάνω στην ίδια πλευρά
      const hx = a.w / 2, hy = a.h / 2, o = side === "r" || side === "l" ? Math.min(9, hy * .55) : Math.min(14, hx * .4);
      const c = { r: [a.x + hx, a.y], l: [a.x - hx, a.y], t: [a.x, a.y - hy], b: [a.x, a.y + hy] }[side];
      const t = side === "r" || side === "l" ? [0, 1] : [1, 0];
      p1 = [c[0] - t[0] * o, c[1] - t[1] * o]; p2 = [c[0] + t[0] * o, c[1] + t[1] * o];
    }
    const out = 46, sp = .75, c1 = [p1[0] + Math.cos(ang - sp) * out, p1[1] + Math.sin(ang - sp) * out], c2 = [p2[0] + Math.cos(ang + sp) * out, p2[1] + Math.sin(ang + sp) * out];
    const lp = [(p1[0] + p2[0]) / 2 + Math.cos(ang) * (out * .78), (p1[1] + p2[1]) / 2 + Math.sin(ang) * (out * .78)];
    return { d: `M${r1(p1[0])} ${r1(p1[1])} C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`, lp, s: p1, e: p2, dir0: [Math.cos(ang), Math.sin(ang)], side };
  }
  if (e.via && e.via.length) {
    const v = e.via;
    const s = port(a, e.fp) || clip(a, v[0][0], v[0][1]);
    const en = port(b, e.tp) || clip(b, v[v.length - 1][0], v[v.length - 1][1]);
    const pts = [s, ...v, en];
    let best = 0, bl = -1;
    for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); if (l > bl) { bl = l; best = i; } }
    const lp = [(pts[best][0] + pts[best + 1][0]) / 2, (pts[best][1] + pts[best + 1][1]) / 2];
    return { d: "M" + pts.map(p => `${r1(p[0])} ${r1(p[1])}`).join(" L"), lp, s, e: en, p1: pts[1], pn: pts[pts.length - 2] };
  }
  if (e.b) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
    const M = [mx + nx * e.b, my + ny * e.b];
    const s = port(a, e.fp) || clip(a, M[0], M[1]), en = port(b, e.tp) || clip(b, M[0], M[1]);
    const Q = [2 * M[0] - (s[0] + en[0]) / 2, 2 * M[1] - (s[1] + en[1]) / 2];
    return { d: `M${r1(s[0])} ${r1(s[1])} Q${r1(Q[0])} ${r1(Q[1])} ${r1(en[0])} ${r1(en[1])}`, lp: M, s, e: en, p1: Q, pn: Q };
  }
  const s = port(a, e.fp) || clip(a, ...(port(b, e.tp) || [b.x, b.y]));
  const en = port(b, e.tp) || clip(b, ...(port(a, e.fp) || [a.x, a.y]));
  return { d: `M${r1(s[0])} ${r1(s[1])} L${r1(en[0])} ${r1(en[1])}`, lp: [(s[0] + en[0]) / 2, (s[1] + en[1]) / 2], s, e: en, p1: en, pn: s };
}
function shape(n, st, cls) {
  const { x, y, w, h } = n, X = x - w / 2, Y = y - h / 2, s = n.s || "rect";
  const lbl = (st.lbl && st.lbl[n.id] !== undefined) ? st.lbl[n.id] : n.t;
  let g = "";
  switch (s) {
    case "circle": g = `<circle cx="${x}" cy="${y}" r="${n.r}"/>` + T(x, y, lbl, st); break;
    case "dcircle": g = `<circle cx="${x}" cy="${y}" r="${n.r}"/><circle cx="${x}" cy="${y}" r="${n.r - 4}"/>` + T(x, y, lbl, st); break;
    case "conn": g = `<circle cx="${x}" cy="${y}" r="12"/>` + T(x, y, lbl, st, "sm"); break;
    case "dot": g = `<circle class="fill" cx="${x}" cy="${y}" r="6"/>`; break;
    case "end": g = `<circle cx="${x}" cy="${y}" r="10"/><circle class="fill" cx="${x}" cy="${y}" r="5.5"/>`; break;
    case "diamond": case "dec": g = `<polygon points="${x},${Y} ${X + w},${y} ${x},${Y + h} ${X},${y}"/>` + T(x, y, lbl, st); break;
    case "wdiamond": g = `<polygon points="${x},${Y} ${X + w},${y} ${x},${Y + h} ${X},${y}"/><polygon points="${x},${Y + 6} ${X + w - 9},${y} ${x},${Y + h - 6} ${X + 9},${y}"/>` + T(x, y, lbl, st); break;
    case "ellipse":
      g = `<ellipse ${n.der ? 'class="dash" ' : ""}cx="${x}" cy="${y}" rx="${w / 2}" ry="${h / 2}"/>` + (n.multi ? `<ellipse cx="${x}" cy="${y}" rx="${w / 2 - 4}" ry="${h / 2 - 4}"/>` : "") +
        T(x, y, lbl, st, n.key ? "key" : n.pkey ? "pkey" : "");
      break;
    case "io": g = `<polygon points="${X + 10},${Y} ${X + w},${Y} ${X + w - 10},${Y + h} ${X},${Y + h}"/>` + T(x, y, lbl, st); break;
    case "term": g = `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="${h / 2}"/>` + T(x, y, lbl, st); break;
    case "round": g = `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="10"/>` + T(x, y, lbl, st); break;
    case "wrect": g = `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="2"/><rect x="${X + 4}" y="${Y + 4}" width="${w - 8}" height="${h - 8}" rx="1"/>` + T(x, y, lbl, st, "b"); break;
    case "ext": g = `<rect class="ext" x="${X}" y="${Y}" width="${w}" height="${h}" rx="2"/>` + T(x, y, lbl, st, "b"); break;
    case "store":
      g = `<rect class="nofill" x="${X}" y="${Y}" width="${w}" height="${h}" style="stroke:none"/><path d="M${X} ${Y} H${X + w} M${X} ${Y + h} H${X + w}"/>` + T(x, y, lbl, st);
      break;
    case "txt": g = T(x, y, lbl, st, n.cls || ""); break;
    case "var":
      g = (n.name ? T(x, y - 23, n.name, st, "sm muted") : "") + `<rect x="${X}" y="${y - 15}" width="${w}" height="30" rx="3"/>` + T(x, y, lbl, st) + (n.addr ? T(x, y + 24, n.addr, st, "xs muted") : "");
      break;
    case "lnode":
      g = `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="3"/><path d="M${X + w - 26} ${Y} V${Y + h}"/>` + T(X + (w - 26) / 2, y, lbl, st) +
        (n.nul ? `<path class="thin" d="M${X + w - 26} ${Y + h} L${X + w} ${Y}"/>` : `<circle class="fill" cx="${X + w - 13}" cy="${y}" r="3"/>`) +
        (n.name ? T(x, Y - 11, n.name, st, "sm muted") : "");
      break;
    case "class": {
      const at = n.a || [], me = n.m || [];
      let yy = Y + 17, out = `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="2"/>` + T(x, yy, lbl, st, "b");
      yy = Y + 28; out += `<path d="M${X} ${yy} H${X + w}"/>`;
      at.forEach((t, i) => out += T(X + 8, yy + 11 + i * 14, t, st, "sm", "start"));
      yy += Math.max(1, at.length) * 14 + 6; if (!at.length) yy -= 5;
      out += `<path d="M${X} ${yy} H${X + w}"/>`;
      me.forEach((t, i) => out += T(X + 8, yy + 11 + i * 14, t, st, "sm", "start"));
      g = out; break;
    }
    default: g = `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="3"/>` + T(x, y, lbl, st, s === "rect" && n.b ? "b" : "");
  }
  if (n.sub) g += T(x, Y + h + 10, n.sub, st, "xs muted");
  return `<g class="nd s-${s}${cls}" data-id="${esc(n.id)}">${g}</g>`;
}
const G = {
  steps: sp => sp.steps || [],
  draw(sp, st) {
    const step = (sp.steps || [])[st.k] || {};
    const hot = new Set([...(step.hot || []), ...(st.reveal ? sp.revealHot || [] : [])]);
    const show = step.show ? new Set(step.show) : null, hide = new Set(step.hide || []);
    st.lbl = Object.assign({}, sp.lbl || {}, step.lbl || {});
    const N = {};
    for (const n of sp.nodes) { const z = gsize(n); N[n.id] = Object.assign({}, n, z); }
    const visN = Object.values(N).filter(n => !hide.has(n.id));
    const cl = id => (hot.has(id) ? " hot" : "") + (show && !show.has(id) ? " ghost" : "");
    let ed = "", nd = "", bx = "";
    const LB = [];
    for (const b of (sp.boxes || []).filter(b => !hide.has(b.id))) bx += `<g class="box${cl(b.id || "")}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8"/>${b.t ? T(b.x + 8, b.y + 11, b.t, st, "xs muted", "start") : ""}</g>`;
    for (const e of sp.edges || []) {
      const id = e.id || `${e.f}-${e.t}`;
      if (hide.has(id) || hide.has(e.f) || hide.has(e.t)) continue;
      const g = edgeGeom(e, N);
      const lab = (step.elbl && step.elbl[id] !== undefined) ? step.elbl[id] : e.l;
      let lt = "";
      if (lab !== undefined && lab !== "") {
        const lo = e.lo || [0, 0];
        const lx = (e.lp ? e.lp[0] : g.lp[0] + lo[0]), ly = (e.lp ? e.lp[1] : g.lp[1] + lo[1]);
        lt = T(lx, ly, lab, st, "el halo", e.la || "middle", 12);
        if (e.rot) lt = `<g transform="rotate(-90 ${r1(lx)} ${r1(ly)})">${lt}</g>`;
        const tw = longest(unmask(lab, st.reveal)) * 6.4, th = nlines(lab) * 12;
        let bx0 = e.la === "start" ? lx : e.la === "end" ? lx - tw : lx - tw / 2, by0 = ly - th / 2;
        if (e.rot) LB.push([lx - th / 2, ly - tw / 2, lx + th / 2, ly + tw / 2]); else LB.push([bx0, by0, bx0 + tw, by0 + th]);
      }
      let cards = "";
      if (e.c) {   // πληθικότητα κοντά στα άκρα
        const put = (P, Q, txt, k) => {
          if (txt === undefined || txt === null || txt === "") return "";
          const L = Math.hypot(Q[0] - P[0], Q[1] - P[1]) || 1, ux = (Q[0] - P[0]) / L, uy = (Q[1] - P[1]) / L;
          const sd = (e.cs || 1) * (k ? -1 : 1);
          return T(P[0] + ux * 15 - uy * 10 * sd, P[1] + uy * 15 + ux * 10 * sd, txt, st, "card halo");
        };
        cards = put(g.s, g.p1 || g.e, e.c[0], 0) + put(g.e, g.pn || g.s, e.c[1], 1);
      }
      const arrow = e.m ? ` marker-end="url(#${st.uid}-${e.m})"` : e.a === "none" ? "" : ` marker-end="url(#${st.uid}-ah${hot.has(id) ? "h" : ""})"`;
      const arr2 = e.a === "both" ? ` marker-start="url(#${st.uid}-ah${hot.has(id) ? "h" : ""})"` : "";
      ed += `<g class="ed${e.dbl ? " dbl" : ""}${e.d ? " dash" : ""}${cl(id)}" data-id="${esc(id)}"><path id="${st.uid}-${esc(id)}" d="${g.d}"${arrow}${arr2}/>${e.dbl ? `<path class="dbl2" d="${g.d}"/>` : ""}${lt}${cards}</g>`;
    }
    for (const n of visN) nd += shape(n, st, cl(n.id));
    let vb = sp.vb;
    if (!vb) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const n of Object.values(N)) { x0 = Math.min(x0, n.x - n.w / 2); x1 = Math.max(x1, n.x + n.w / 2); y0 = Math.min(y0, n.y - n.h / 2 - (n.name ? 22 : 0)); y1 = Math.max(y1, n.y + n.h / 2 + (n.sub || n.addr ? 18 : 0)); }
      for (const b of sp.boxes || []) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
      for (const e of sp.edges || []) for (const p of e.via || []) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      for (const r of LB) { x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[2]); y1 = Math.max(y1, r[3]); }
      for (const e of sp.edges || []) if (e.f === e.t) { const n = N[e.f], sd = e.loop || "r"; if (sd === "r") x1 = Math.max(x1, n.x + n.w / 2 + 40); if (sd === "l") x0 = Math.min(x0, n.x - n.w / 2 - 40); if (sd === "t") y0 = Math.min(y0, n.y - n.h / 2 - 40); if (sd === "b") y1 = Math.max(y1, n.y + n.h / 2 + 40); }
      const pd = sp.pad ?? 18;
      vb = [x0 - pd, y0 - pd, x1 - x0 + 2 * pd, y1 - y0 + 2 * pd];
    }
    return { vb, body: bx + ed + nd, go: step.go, cap: step.cap };
  }
};

/* ================================================================ TREE */
function normTree(t) {
  // δυαδικό: [v, αριστερό, δεξί] · n-αδικό: {v, c:[...]} · heap: πίνακας level-order
  const mk = (v, kids, id, extra = {}) => Object.assign({ v, kids, id }, extra);
  if (t && t.heap) {
    const a = t.heap, base = t.base ?? 0;
    const go = i => i < a.length && a[i] !== null && a[i] !== undefined ? mk(a[i], [go(2 * i + 1), go(2 * i + 2)], "i" + (i + base), { idx: i + base, bin: true }) : null;
    return go(0);
  }
  if (Array.isArray(t)) {
    const go = (n, id) => n === null || n === undefined ? null : Array.isArray(n) ? mk(n[0], [go(n[1], id + "L"), go(n[2], id + "R")], id || "root", { bin: true }) : mk(n, [null, null], id || "root", { bin: true });
    return go(t, "");
  }
  const go = (n, id) => mk(n.v, (n.c || []).map((c, i) => go(c, id + "." + i)), n.id || id, { sub: n.s, cls: n.k });
  return go(t, "0");
}
const TR = {
  steps: sp => sp.steps || [],
  draw(sp, st) {
    const step = (sp.steps || [])[st.k] || {};
    const root = normTree(step.tree || sp.tree);
    const fin = step.tree ? normTree(sp.tree) : null;
    const hot = new Set([...(step.hot || []), ...(st.reveal ? sp.revealHot || [] : [])].map(String));
    const show = step.show ? new Set(step.show.map(String)) : null;
    st.lbl = Object.assign({}, sp.lbl || {}, step.lbl || {});
    const box = !!sp.box, dy = sp.dy || (box ? 58 : 52);
    const nodes = [];
    let xi = 0;
    const W = n => box ? Math.max(46, longest(st.lbl[n.id] ?? n.v) * CW + 18) : 32;
    if (root && root.bin) {
      const walk = (n, d) => { if (!n) return; walk(n.kids[0], d + 1); n.x = xi++ * (sp.dx || 38); n.y = d * dy; nodes.push(n); walk(n.kids[1], d + 1); };
      walk(root, 0);
    } else if (root) {
      let cur = 0;
      const walk = (n, d) => {
        n.y = d * dy; n.w = W(n);
        if (!n.kids.length) { n.x = cur + n.w / 2; cur += n.w + (sp.gap || 14); }
        else { n.kids.forEach(k => walk(k, d + 1)); n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2; if (n.x - n.w / 2 < cur - n.w - 14 && false) n.x = cur; }
        nodes.push(n);
      };
      walk(root, 0);
    }
    // σταθερές θέσεις: παίρνουμε τη διάταξη του τελικού δέντρου (για BST/σωρούς οι κόμβοι δεν «πηδάνε»)
    let finNodes = null;
    if (fin && root && root.bin) {
      finNodes = []; let k = 0;
      const walk = (n, d) => { if (!n) return; walk(n.kids[0], d + 1); n.x = k++ * (sp.dx || 38); n.y = d * dy; finNodes.push(n); walk(n.kids[1], d + 1); };
      walk(fin, 0);
      const P = Object.fromEntries(finNodes.map(n => [n.id, n]));
      if (nodes.every(n => P[n.id])) nodes.forEach(n => { n.x = P[n.id].x; n.y = P[n.id].y; }); else finNodes = null;
    }
    const key = n => [n.id, String(n.v)];
    const isHot = n => key(n).some(k => hot.has(k)), isShown = n => !show || key(n).some(k => show.has(k));
    let ed = "", nd = "";
    for (const n of nodes) for (const k of n.kids) {
      if (!k) continue;
      const c = (isHot(n) && isHot(k) ? " hot" : "") + (!isShown(k) ? " ghost" : "");
      const y1 = n.y + (box ? 13 : 16), y2 = k.y - (box ? 13 : 16);
      ed += `<g class="ed${c}"><path d="M${r1(n.x)} ${r1(y1)} L${r1(k.x)} ${r1(y2)}"/></g>`;
    }
    for (const n of nodes) {
      const c = (isHot(n) ? " hot" : "") + (!isShown(n) ? " ghost" : "") + (n.cls ? " " + n.cls : "");
      const lbl = st.lbl[n.id] ?? st.lbl[String(n.v)] ?? n.v;
      let g = box ? `<rect x="${r1(n.x - n.w / 2)}" y="${n.y - 13}" width="${r1(n.w)}" height="26" rx="4"/>` : `<circle cx="${r1(n.x)}" cy="${n.y}" r="16"/>`;
      g += T(n.x, n.y, lbl, st, box ? "" : "b");
      if (sp.idx && n.idx !== undefined) g += T(n.x + 19, n.y + 15, "[" + n.idx + "]", st, "xs muted", "start");
      const sub = (step.sub && step.sub[n.id]) ?? n.sub;
      if (sub !== undefined) g += box ? T(n.x + 4, n.y - 23, sub, st, "xs amb", "start", 11) : T(n.x, n.y + 25, sub, st, "xs amb");
      nd += `<g class="nd${c}" data-id="${esc(n.id)}">${g}</g>`;
    }
    // πίνακας κάτω από σωρό
    let ar = "", extraH = 0;
    if (sp.arr && sp.tree.heap !== undefined) {
      const a = (step.tree || sp.tree).heap, base = (step.tree || sp.tree).base ?? 0;
      const cw = 30, x0 = Math.min(...(finNodes || nodes).map(n => n.x)) - 16, y0 = Math.max(...(finNodes || nodes).map(n => n.y)) + 46;
      a.forEach((v, i) => {
        const id = "i" + (i + base), h = hot.has(id) || hot.has(String(v));
        ar += `<g class="nd${h ? " hot" : ""}"><rect x="${x0 + i * cw}" y="${y0}" width="${cw}" height="26"/>${T(x0 + i * cw + cw / 2, y0 + 13, v ?? "", st, "b")}${T(x0 + i * cw + cw / 2, y0 + 36, i + base, st, "xs muted")}</g>`;
      });
      extraH = 64;
    }
    const B = finNodes || nodes;
    const xs = B.map(n => n.x), hw = box ? Math.max(...nodes.map(n => n.w / 2)) : 20;
    const x0 = Math.min(...xs) - hw - 14, x1 = Math.max(...xs, sp.arr ? Math.min(...xs) - 16 + (sp.tree.heap || []).length * 30 : -1e9) + hw + 18;
    const y1 = Math.max(...B.map(n => n.y)) + 34 + extraH;
    return { vb: [x0, -26, x1 - x0, y1 + 26], body: ed + nd + ar, cap: step.cap };
  }
};

/* ================================================================ GANTT */
const PAL = n => "p" + (n % 6);
const GA = {
  steps: sp => sp.step ? [{}, ...sp.segs.map(() => ({}))] : [],
  draw(sp, st) {
    const segs = sp.segs, T1 = Math.max(...segs.map(s => s[2]));
    const u = sp.u || Math.max(12, Math.min(34, 330 / T1));
    const procs = [...new Set(segs.map(s => s[0]).filter(p => p !== "-"))];
    const nShow = sp.step ? st.k : segs.length;
    const hide = sp.hide && !st.reveal;
    const top = sp.arr ? 50 : 8, H = 32;
    let g = "";
    // άφιξη
    if (sp.arr) {
      const byT = {};
      for (const [p, t] of Object.entries(sp.arr)) (byT[t] = byT[t] || []).push(p);
      let lastX = -1e9, lastW = 0, lvl = 0;
      for (const [t, ps] of Object.entries(byT).sort((a, b) => a[0] - b[0])) {
        const x = +t * u, w = ps.join(",").length * 5.8;
        lvl = x - lastX < (w + lastW) / 2 + 4 ? 1 - lvl : 0; lastX = x; lastW = w;
        g += `<path class="tick" d="M${r1(x)} ${top - 10} L${r1(x - 4)} ${top - 17} H${r1(x + 4)} Z"/>` + T(x, top - 24 - lvl * 14, ps.join(","), st, "xs muted");
      }
    }
    g += `<rect class="track" x="0" y="${top}" width="${r1(T1 * u)}" height="${H}"/>`;
    const ticks = new Set([0]);
    segs.forEach((s, i) => {
      if (hide || i >= nShow) return;
      const [p, a, b] = s, x = a * u, w = (b - a) * u;
      const cur = sp.step && i === nShow - 1;
      g += `<g class="seg ${p === "-" ? "idle" : PAL(procs.indexOf(p))}${cur ? " hot" : ""}"><rect x="${r1(x)}" y="${top}" width="${r1(w)}" height="${H}"/>${w >= 18 ? T(x + w / 2, top + H / 2, p === "-" ? "" : p, st, "b") : ""}</g>`;
      ticks.add(a); ticks.add(b);
    });
    if (hide) g += T(T1 * u / 2, top + H / 2, "?", st, "ask");
    for (const t of ticks) g += `<path class="tick" d="M${r1(t * u)} ${top + H} v5"/>` + T(t * u, top + H + 14, t, st, "xs");
    let cap;
    if (sp.step) {
      if (st.k === 0) cap = sp.cap0 || "Πάτα ▸ για να δεις ποια διεργασία παίρνει τη CPU σε κάθε διάστημα.";
      else { const [p, a, b] = segs[st.k - 1]; cap = (sp.caps && sp.caps[st.k - 1]) || (p === "-" ? `**${a}–${b}:** η CPU μένει αδρανής (καμία διεργασία έτοιμη).` : `**${a}–${b}:** εκτελείται η **${p}**.`); }
    }
    return { vb: [-12, 0, T1 * u + 24, top + H + 26], body: g, cap };
  }
};

/* ================================================================ FRAMES (σελιδοποίηση) */
function simulate(refs, n, algo) {
  const fr = Array(n).fill(null), load = Array(n).fill(-1), used = Array(n).fill(-1), out = [];
  refs.forEach((p, i) => {
    let slot = fr.indexOf(p), fault = false, vict = null, why = "";
    if (slot >= 0) { used[slot] = i; why = `Η σελίδα **${p}** είναι ήδη στη μνήμη → **επιτυχία** (όχι σφάλμα).`; }
    else {
      fault = true; slot = fr.indexOf(null);
      if (slot < 0) {
        if (algo === "FIFO") { slot = load.indexOf(Math.min(...load)); why = `η **${fr[slot]}** μπήκε πρώτη από όσες είναι μέσα`; }
        else if (algo === "LRU") { slot = used.indexOf(Math.min(...used)); why = `η **${fr[slot]}** χρησιμοποιήθηκε πιο παλιά από όλες`; }
        else {
          let best = -1, bd = -1;
          fr.forEach((q, k) => { const nx = refs.indexOf(q, i + 1), d = nx < 0 ? 1e9 : nx; if (d > bd || (d === bd && load[k] < load[best])) { bd = d; best = k; } });
          slot = best; why = bd === 1e9 ? `η **${fr[slot]}** δεν θα ξαναχρειαστεί` : `η **${fr[slot]}** θα ξαναχρειαστεί πιο αργά από τις άλλες`;
        }
        vict = fr[slot]; why = `Σφάλμα σελίδας για την **${p}**. Βγαίνει ${why}.`;
      } else why = `Σφάλμα σελίδας για την **${p}**: υπάρχει άδειο πλαίσιο, μπαίνει εκεί.`;
      fr[slot] = p; load[slot] = i; used[slot] = i;
    }
    out.push({ fr: fr.slice(), fault, slot, vict, why });
  });
  return out;
}
const FR = {
  steps: sp => sp.step ? [{}, ...sp.refs.map(() => ({}))] : [],
  draw(sp, st) {
    const sim = simulate(sp.refs, sp.n, sp.algo || "FIFO"), cw = 26, rh = 24, lx = 34;
    const nShow = sp.step ? st.k : (sp.upto && !st.reveal ? sp.upto : sp.refs.length), hideF = sp.hideF && !st.reveal;
    let g = T(lx - 8, rh / 2, "αναφ.", st, "xs muted", "end");
    for (let r = 0; r < sp.n; r++) g += T(lx - 8, rh * (r + 1) + rh / 2, "Π" + (r + 1), st, "xs muted", "end");
    g += T(lx - 8, rh * (sp.n + 1) + rh / 2, "σφάλμα", st, "xs muted", "end");
    sp.refs.forEach((p, i) => {
      const x = lx + i * cw, s = sim[i], vis = i < nShow, cur = sp.step && i === nShow - 1;
      g += `<g class="col${cur ? " hot" : ""}">` + T(x + cw / 2, rh / 2, p, st, vis ? "b" : "muted");
      for (let r = 0; r < sp.n; r++) {
        const v = vis ? s.fr[r] : null, nw = vis && s.fault && s.slot === r;
        g += `<rect class="cell${nw ? " new" : ""}" x="${x}" y="${rh * (r + 1)}" width="${cw}" height="${rh}"/>` + (v !== null ? T(x + cw / 2, rh * (r + 1) + rh / 2, v, st, nw ? "b amb" : "") : "");
      }
      if (vis && !hideF) g += T(x + cw / 2, rh * (sp.n + 1) + rh / 2, s.fault ? "✗" : "·", st, s.fault ? "bad" : "muted");
      g += `</g>`;
    });
    const tot = sim.slice(0, nShow).filter(s => s.fault).length;
    if (!hideF) g += T(lx + sp.refs.length * cw + 8, rh * (sp.n + 1) + rh / 2, "= " + tot, st, "b amb", "start");
    else g += T(lx + sp.refs.length * cw + 8, rh * (sp.n + 1) + rh / 2, "= ?", st, "ask", "start");
    let cap;
    if (sp.step) cap = st.k === 0 ? `**${sp.algo}** με ${sp.n} πλαίσια. Πάτα ▸ για κάθε αναφορά.` : sim[st.k - 1].why + (st.k === sp.refs.length ? ` Σύνολο: **${tot}** σφάλματα.` : "");
    return { vb: [-8, -4, lx + sp.refs.length * cw + 52, rh * (sp.n + 2) + 10], body: g, cap };
  }
};

/* ================================================================ ARR (πίνακες, βήματα αλγορίθμων) */
const AR = {
  steps: sp => sp.step ? sp.rows.map(() => ({})) : [],
  draw(sp, st) {
    const cw = sp.cw || 32, rh = 30, gap = sp.idx !== undefined && sp.idx !== false ? 50 : 42;
    const labW = sp.rows.some(r => r.l) ? Math.max(...sp.rows.map(r => longest(r.l || "")) ) * 6.3 + 12 : 0;
    const nShow = sp.step ? st.k + 1 : sp.rows.length;
    let g = "", maxN = 0, y = 0;
    sp.rows.forEach((row, ri) => {
      if (ri >= nShow) return;
      if (row.ix !== undefined && ri > 0) y += 14;
      const cur = sp.step && ri === nShow - 1, x0 = labW + (row.dx || 0) * cw;
      maxN = Math.max(maxN, row.v.length);
      if (row.l) g += T(labW - 10, y + rh / 2, row.l, st, "xs muted" + (cur ? " amb" : ""), "end");
      row.v.forEach((v, i) => {
        const c = (row.hl || []).includes(i) ? " hot" : (row.ok || []).includes(i) ? " ok" : (row.dim || []).includes(i) ? " ghost" : "";
        g += `<g class="cellg${c}"><rect class="cell" x="${x0 + i * cw}" y="${y}" width="${cw}" height="${rh}"/>${T(x0 + i * cw + cw / 2, y + rh / 2, v, st, "b")}</g>`;
        if ((sp.idx !== undefined && sp.idx !== false && (ri === 0 || sp.idxAll)) || row.ix !== undefined) {
          const base = typeof row.ix === "number" ? row.ix : typeof sp.idx === "number" ? sp.idx : 0;
          g += T(x0 + i * cw + cw / 2, y - 8, i + base, st, "xs muted");
        }
        if (sp.addr && ri === 0) g += T(x0 + i * cw + cw / 2, y + rh + 10, sp.addr.base + i * sp.addr.size, st, "xs muted");
      });
      const ptr = row.p || {}, at = {};
      for (const [k, i] of Object.entries(ptr)) (at[i] = at[i] || []).push(k);
      for (const [i, ks] of Object.entries(at)) {
        const x = x0 + (+i) * cw + cw / 2, yy = y + rh + (sp.addr && ri === 0 ? 18 : 3);
        g += `<path class="tick" d="M${x} ${yy} l-4 7 h8 z"/>` + T(x, yy + 15, ks.join(","), st, "xs amb");
      }
      y += rh + (Object.keys(ptr).length || (sp.addr && ri === 0) ? 26 : 12) + (sp.idxAll ? 12 : 0);
    });
    const top = (sp.idx !== undefined && sp.idx !== false) || (sp.rows[0] && sp.rows[0].ix !== undefined) ? -18 : -6;
    let cap = sp.step ? sp.rows[nShow - 1].c : undefined;
    return { vb: [-6, top, labW + Math.max(maxN, ...sp.rows.map(r => r.v.length)) * cw + 12, y - top + 4], body: g, cap };
  }
};

/* ================================================================ STACK / QUEUE */
const SQ = {
  steps: sp => sp.states.length > 1 ? sp.states.map(() => ({})) : [],
  draw(sp, st) {
    const s = sp.states[st.k] || sp.states[0], cap = s.c;
    const maxN = Math.max(...sp.states.map(x => x.v.length), sp.size || 0, 1);
    let g = "";
    if (sp.kind === "queue") {
      const cw = 34, y = 30;
      for (let i = 0; i < Math.max(maxN, sp.size || 0); i++) {
        const v = s.v[i], c = (s.hl || []).includes(i) ? " hot" : "";
        g += `<g class="cellg${c}"><rect class="cell" x="${i * cw}" y="${y}" width="${cw}" height="30"/>${v !== undefined ? T(i * cw + cw / 2, y + 15, v, st, "b") : ""}</g>`;
      }
      if (s.v.length) {
        g += `<path class="tick" d="M${cw / 2} ${y - 4} l-4 -7 h8 z"/>` + T(cw / 2, y - 18, "front", st, "xs amb");
        const r = s.v.length - 1;
        g += `<path class="tick" d="M${r * cw + cw / 2} ${y + 34} l-4 7 h8 z"/>` + T(r * cw + cw / 2, y + 50, "rear", st, "xs amb");
      }
      if (s.op) g += T(Math.max(maxN, 3) * cw + 14, y + 15, s.op, st, "sm amb", "start");
      return { vb: [-8, 0, Math.max(maxN, 3) * cw + 130, 96], body: g, cap };
    }
    const cw = 64, rh = 26, H = maxN * rh;
    g += `<path class="wall" d="M0 0 V${H + 2} H${cw} V0"/>`;
    s.v.forEach((v, i) => {
      const y = H - (i + 1) * rh, c = (s.hl || []).includes(i) || (s.hl === undefined && i === s.v.length - 1 && st.k > 0) ? " hot" : "";
      g += `<g class="cellg${c}"><rect class="cell" x="2" y="${y + 1}" width="${cw - 4}" height="${rh - 2}" rx="2"/>${T(cw / 2, y + rh / 2, v, st, "b")}</g>`;
    });
    if (s.v.length) { const y = H - s.v.length * rh + rh / 2; g += `<path class="tick" d="M${cw + 6} ${y} l7 -4 v8 z"/>` + T(cw + 18, y, "top", st, "xs amb", "start"); }
    if (s.op) g += T(cw + 58, Math.min(H - 8, 14), s.op, st, "sm amb", "start");
    if (s.out !== undefined) g += T(cw + 58, Math.min(H - 8, 14) + 18, "→ " + s.out, st, "sm b", "start");
    return { vb: [-10, -10, cw + 180, Math.max(H, 40) + 22], body: g, cap };
  }
};

/* ================================================================ LOGIC (πύλες) */
const GATE = {
  AND: { d: "M0 0 H23 A17 17 0 0 1 23 34 H0 Z", o: 40 },
  OR: { d: "M0 0 Q14 17 0 34 Q30 34 46 17 Q30 0 0 0 Z", o: 46, inx: 6 },
  XOR: { d: "M6 0 Q20 17 6 34 Q36 34 52 17 Q36 0 6 0 Z M0 0 Q14 17 0 34", o: 52, inx: 6 },
  NOT: { d: "M0 2 L34 17 L0 32 Z", o: 42, bub: 38 },
  NAND: { d: "M0 0 H23 A17 17 0 0 1 23 34 H0 Z", o: 48, bub: 44 },
  NOR: { d: "M0 0 Q14 17 0 34 Q30 34 46 17 Q30 0 0 0 Z", o: 54, bub: 50, inx: 6 },
  XNOR: { d: "M6 0 Q20 17 6 34 Q36 34 52 17 Q36 0 6 0 Z M0 0 Q14 17 0 34", o: 60, bub: 56, inx: 6 }
};
const LG = {
  steps: sp => sp.steps || [],
  draw(sp, st) {
    const step = (sp.steps || [])[st.k] || {};
    const vals = Object.assign({}, sp.vals || {}, step.vals || {});
    const hot = new Set(step.hot || []);
    const P = {};    // σημείο εξόδου κάθε πηγής
    let g = "", w = "";
    for (const i of sp.ins) { const x = i.x || 0; P[i.id] = [x + 26, i.y]; g += T(x + 8, i.y, i.l ?? i.id, st, "b", "middle"); }
    const gp = {};
    for (const q of sp.g) { const d = GATE[q.g]; gp[q.id] = q; P[q.id] = [q.x + d.o, q.y]; }
    const val = id => vals[id] === undefined ? null : vals[id];
    const vtxt = v => v === null ? "" : String(v);
    const labeled = new Set(), WS = {};
    const wire = (from, to, k) => {
      const [x1, y1] = P[from], [x2, y2] = to, mx = k ?? (x1 + x2) / 2;
      (WS[from] = WS[from] || []).push({ mx, y1, y2 });
      const v = val(from), cls = v === 1 || v === "1" ? " on" : v === 0 || v === "0" ? " off" : "";
      const lab = v !== null && !labeled.has(from) ? T(x1 + 7, y1 - 8, vtxt(v), st, "xs" + (cls === " on" ? " gon" : " muted"), "start") : "";
      labeled.add(from);
      return `<path class="wire${cls}${hot.has(from) ? " hot" : ""}" d="M${r1(x1)} ${r1(y1)} H${r1(mx)} V${r1(y2)} H${r1(x2)}"/>` + lab;
    };
    for (const q of sp.g) {
      const d = GATE[q.g], n = q.in.length, X = q.x, Y = q.y - 17;
      q.in.forEach((src, k) => {
        const yy = n === 1 ? q.y : Y + 34 * (k + 1) / (n + 1);
        const midx = q.mx && q.mx[k] !== undefined ? q.mx[k] : undefined;
        w += wire(src, [X + (d.inx || 0), yy], midx);
      });
      const v = val(q.id);
      g += `<g class="gate${hot.has(q.id) ? " hot" : ""}${v === 1 ? " on" : ""}" data-id="${q.id}"><path transform="translate(${X} ${Y})" d="${d.d}"/>${d.bub ? `<circle cx="${X + d.bub}" cy="${q.y}" r="4"/>` : ""}` +
        (sp.names !== false ? T(X + d.o / 2 - 2, Y + 44, q.g, st, "xs muted") : "") + `</g>`;
    }
    // τελείες διακλάδωσης
    for (const [src, ws] of Object.entries(WS)) {
      if (ws.length < 2) continue;
      const v = val(src), on = v === 1 || v === "1";
      const pts = new Set();
      for (const w of ws) {
        if (ws.some(o => o !== w && o.mx > w.mx + .5)) pts.add(`${w.mx},${w.y1}`);
        if (ws.some(o => o !== w && Math.abs(o.mx - w.mx) < .5 && (w.y2 - w.y1) * (o.y2 - o.y1) > 0 && Math.abs(o.y2 - o.y1) > Math.abs(w.y2 - w.y1) + .5)) pts.add(`${w.mx},${w.y2}`);
      }
      for (const p of pts) { const [x, y] = p.split(",").map(Number); w += `<circle class="jdot${on ? " on" : ""}" cx="${r1(x)}" cy="${r1(y)}" r="2.6"/>`; }
    }
    for (const o of sp.outs || []) {
      const [x1, y1] = P[o.f], x2 = o.x || x1 + 30;
      const v = o.v !== undefined ? o.v : val(o.f);
      w += `<path class="wire${v === 1 ? " on" : ""}" d="M${x1} ${y1} H${x2}"/>`;
      g += T(x2 + 6, y1, (o.l || "F") + (v !== null && v !== undefined ? " = " + v : ""), st, "b", "start");
    }
    const xs = [...Object.values(P).map(p => p[0]), ...(sp.outs || []).map(o => (o.x || P[o.f][0] + 30) + 70)];
    const ys = [...sp.ins.map(i => i.y), ...sp.g.map(q => q.y)];
    return { vb: [-6, Math.min(...ys) - 30, Math.max(...xs) + 12, Math.max(...ys) - Math.min(...ys) + 70], body: w + g, cap: step.cap };
  }
};

const R = { graph: G, tree: TR, gantt: GA, frames: FR, arr: AR, stack: SQ, logic: LG };

/* ================================================================ mount */
let UID = 0;
const defs = uid => `<defs><marker id="${uid}-ah" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="mk" d="M0 0 L10 5 L0 10 z"/></marker>` +
  `<marker id="${uid}-ahh" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="mkh" d="M0 0 L10 5 L0 10 z"/></marker>` +
  `<marker id="${uid}-tri" viewBox="0 0 14 14" refX="13" refY="7" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto"><path class="mko" d="M1 1 L13 7 L1 13 z"/></marker>` +
  `<marker id="${uid}-dia" viewBox="0 0 20 12" refX="19" refY="6" markerWidth="20" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path class="mko" d="M1 6 L10 1 L19 6 L10 11 z"/></marker></defs>`;

function mount(el, spec, opt = {}) {
  const r = R[spec.t];
  if (!r) { el.innerHTML = `<p class="small muted">[διάγραμμα: άγνωστος τύπος ${esc(spec.t)}]</p>`; return; }
  const st = { k: opt.k || 0, reveal: !!opt.reveal, uid: "f" + (++UID) };
  const steps = r.steps(spec), n = steps.length;
  el.classList.add("figbox");
  el.innerHTML = `${spec.title ? `<div class="figt">${inl(spec.title)}</div>` : ""}<div class="figsv"></div>` +
    `<div class="figcap"${n ? ' aria-live="polite"' : ""}></div>` +
    (n > 1 ? `<div class="figctl"><button class="fbtn ghost" data-a="prev" aria-label="Προηγούμενο βήμα">◂</button><div class="fdots">${n <= 24 ? steps.map(() => "<i></i>").join("") : `<span class="xs">${1}/${n}</span>`}</div><button class="fbtn" data-a="next">▸</button></div>` : "");
  const sv = el.querySelector(".figsv"), cap = el.querySelector(".figcap");
  const draw = animate => {
    let out;
    try { out = r.draw(spec, st); }
    catch (e) { sv.innerHTML = `<p class="small muted">[σφάλμα διαγράμματος: ${esc(e.message)}]</p>`; console.error(e); return; }
    const [x, y, w, h] = out.vb;
    const wide = w > (spec.maxw || 470);
    sv.innerHTML = `<svg viewBox="${r1(x)} ${r1(y)} ${r1(w)} ${r1(h)}" ${wide ? `style="width:${Math.round(w * 0.92)}px;max-width:none"` : `style="max-width:${Math.round(Math.max(w, 160) * 1.25)}px"`} role="img" aria-label="${esc(spec.alt || spec.title || "διάγραμμα")}">${defs(st.uid)}${out.body}</svg>`;
    const c = out.cap ?? spec.cap;
    cap.innerHTML = c ? inl(unmask(c, st.reveal)) : "";
    cap.style.display = c ? "" : "none";
    if (n > 1) {
      el.querySelectorAll(".fdots i").forEach((d, i) => d.classList.toggle("on", i === st.k));
      const sp = el.querySelector(".fdots span"); if (sp) sp.textContent = `${st.k + 1}/${n}`;
      el.querySelector('[data-a="prev"]').disabled = st.k === 0;
      el.querySelector('[data-a="next"]').textContent = st.k === n - 1 ? "↻" : "▸";
    }
    if (out.go && animate) token(sv.querySelector("svg"), st.uid + "-" + out.go);
  };
  el.querySelectorAll(".fbtn").forEach(b => b.onclick = () => {
    if (b.dataset.a === "next") st.k = st.k === n - 1 ? 0 : st.k + 1; else if (st.k) st.k--;
    draw(b.dataset.a === "next");
  });
  el._fig = { reveal() { st.reveal = true; draw(false); } };
  draw(false);
}
function token(svg, pid) {
  const p = svg && svg.querySelector(`[id="${pid}"]`); if (!p) return;
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("r", "4.5"); c.setAttribute("class", "token"); svg.appendChild(c);
  const L = p.getTotalLength(), t0 = performance.now(), dur = RM ? 1 : Math.min(1300, 350 + L * 2.2);
  const f = now => {
    const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, q = p.getPointAtLength(L * e);
    c.setAttribute("cx", q.x); c.setAttribute("cy", q.y);
    if (k < 1) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}
function hydrate(root) {
  (root || document).querySelectorAll(".fig[data-spec]:not([data-done])").forEach(el => {
    el.dataset.done = "1";
    let spec;
    try { spec = JSON.parse(decodeURIComponent(el.dataset.spec)); }
    catch (e) { el.innerHTML = `<p class="small muted">[μη έγκυρο διάγραμμα]</p>`; return; }
    mount(el, spec, { reveal: el.dataset.reveal === "1" });
  });
}
const html = (spec, attrs = "") => `<div class="fig" data-spec="${encodeURIComponent(JSON.stringify(spec))}" ${attrs}></div>`;
const hasMask = spec => /\[\[/.test(JSON.stringify(spec)) || !!spec.hideF || !!spec.hide;
window.FIG = { mount, hydrate, html, hasMask, simulate, renderers: R };
})();

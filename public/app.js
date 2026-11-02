/* PLH//MATRIX — προσωπικός δάσκαλος ΠΛΗ10 / ΠΛΗ11 */
(() => {
"use strict";

/* ---------------------------------------------------------------- βοηθητικά */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const figPre = s => String(s || "").replace(/```fig\s*\n([\s\S]*?)\n```/g, (_, j) => `\n\n<div class="fig" data-spec="${encodeURIComponent(j.trim())}"></div>\n\n`);
const md = s => (window.marked ? marked.parse(figPre(s), { mangle: false, headerIds: false }) : esc(s));
const mdi = s => (window.marked ? marked.parseInline(String(s || ""), { mangle: false }) : esc(s));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pad = n => String(n).padStart(2, "0");
const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayNum = (d = new Date()) => Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 864e5);
const toast = (msg, ms = 2200) => { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), ms); };

/* ---------------------------------------------------------------- κατάσταση */
const KEY = "plh_matrix_state_v1";
const DEFAULTS = { v: 1, srs: {}, log: {}, read: {}, genStats: {}, lastLesson: null, deviceId: null,
  settings: { goal: 20, rain: true, teach: true, remindOn: false, remindTime: "20:00", sessionLen: 12 } };
let S;
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
  S = Object.assign(structuredClone(DEFAULTS), S);
  S.settings = Object.assign(structuredClone(DEFAULTS.settings), S.settings || {});
  if (!S.deviceId) S.deviceId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  save();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

/* ---------------------------------------------------------------- περιεχόμενο */
let C = null;                 // content.json
const IDX = { item: {}, lesson: {}, unit: {}, course: {} };
async function loadContent() {
  const r = await fetch("/content.json?v=" + (window.APP_VERSION || ""));
  C = await r.json();
  for (const c of C.courses) {
    IDX.course[c.id] = c;
    for (const u of c.units) {
      u.course = c.id; IDX.unit[u.id] = u;
      for (const l of u.lessons) {
        l.unit = u.id; l.course = c.id; IDX.lesson[l.id] = l;
        for (const it of l.items) { it.lesson = l.id; IDX.item[it.id] = it; }
      }
    }
  }
}
const allLessons = () => C.courses.flatMap(c => c.units.flatMap(u => u.lessons));
function itemsOf(scope) {
  if (!scope || scope === "all") return Object.values(IDX.item);
  if (IDX.course[scope]) return IDX.course[scope].units.flatMap(u => u.lessons.flatMap(l => l.items));
  if (IDX.unit[scope]) return IDX.unit[scope].lessons.flatMap(l => l.items);
  if (IDX.lesson[scope]) return IDX.lesson[scope].items;
  return [];
}

/* ---------------------------------------------------------------- SRS (Leitner) */
const INTERVAL = [0, 1, 2, 4, 8, 16, 32, 64];
function grade(id, ok) {
  const r = S.srs[id] || { b: 0, due: 0, c: 0, w: 0 };
  if (ok) { r.c++; r.b = Math.min(r.b + 1, INTERVAL.length - 1); } else { r.w++; r.b = 0; }
  r.due = dayNum() + (ok ? INTERVAL[r.b] : 0);
  r.last = Date.now();
  S.srs[id] = r;
}
function logAnswer(ok) {
  const d = todayStr();
  const L = S.log[d] || { n: 0, c: 0 };
  L.n++; if (ok) L.c++;
  S.log[d] = L;
  save(); updateLeds(); Push.ping();
}
const dueItems = () => Object.entries(S.srs).filter(([id, r]) => r.due <= dayNum() && IDX.item[id]).map(([id]) => IDX.item[id]);
const mistakes = () => Object.entries(S.srs).filter(([id, r]) => r.w > 0 && r.b <= 1 && IDX.item[id]).map(([id]) => IDX.item[id]);
function mastery(items) {
  if (!items.length) return 0;
  let s = 0; for (const it of items) { const r = S.srs[it.id]; if (r) s += Math.min(r.b, 4) / 4; }
  return Math.round(100 * s / items.length);
}
function streak() {
  let n = 0; const d = new Date();
  if (!(S.log[todayStr(d)]?.n > 0)) d.setDate(d.getDate() - 1);   // σήμερα δεν έχει χαλάσει ακόμη
  while (S.log[todayStr(d)]?.n > 0) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function updateLeds() {
  $("#ledStreak").textContent = String(streak());
  const t = S.log[todayStr()]?.n || 0;
  $("#ledToday").textContent = `${t}`;
}

/* ---------------------------------------------------------------- έλεγχος απαντήσεων */
const GR_LAT = { "α": "a", "β": "b", "ε": "e", "ζ": "z", "η": "h", "ι": "i", "κ": "k", "μ": "m", "ν": "n", "ο": "o", "ρ": "p", "τ": "t", "υ": "y", "χ": "x" };
function norm(s) {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ς/g, "σ")
    .replace(/[«»"“”'’`]/g, "").replace(/\s+/g, " ").replace(/\s*([,;:=()+\-*/<>!&|%\[\]{}])\s*/g, "$1").replace(/[.\s]+$/g, "").trim();
}
const normLoose = s => norm(s).replace(/[α-ω]/g, ch => GR_LAT[ch] || ch).replace(/\s/g, "");
function numOf(s) { const t = String(s).trim().replace(",", "."); return /^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(t) ? parseFloat(t) : null; }
const numSeq = s => { const t = String(s).trim(); return /^[\s\[\](){}]*-?\d+(?:[.,]\d+)?(?:[\s,;→>\-]+-?\d+(?:[.,]\d+)?)+[\s\[\](){}]*$/.test(t) ? t.match(/-?\d+(?:\.\d+)?/g).join(" ") : null; };
function matches(input, accepted) {
  const a = norm(input); if (!a) return false;
  const si = numSeq(input);
  if (si) for (const acc of accepted) { const sa = numSeq(acc); if (sa && sa === si) return true; }
  for (const acc of accepted) {
    const x = String(acc);
    if (x.startsWith("re:")) { try { if (new RegExp(x.slice(3), "i").test(String(input).trim())) return true; } catch (e) { } continue; }
    if (norm(x) === a || normLoose(x) === normLoose(input)) return true;
    const n1 = numOf(input), n2 = numOf(x);
    if (n1 !== null && n2 !== null && Math.abs(n1 - n2) <= Math.max(1e-9, Math.abs(n2) * 1e-3)) return true;
  }
  return false;
}
const BLANK_RE = /\{\{([^}]+)\}\}/g;
function blanksOf(it) { if (it.b) return it.b; const out = []; let m; BLANK_RE.lastIndex = 0; while ((m = BLANK_RE.exec(it.q))) out.push(m[1].split(" | ").map(s => s.trim())); return out; }

/* ---------------------------------------------------------------- matrix rain */
function startRain() {
  const cv = $("#rain"), ctx = cv.getContext("2d");
  const chars = "アイウエオカキクケコサシスセソタチツテト0123456789ΑΒΓΔΘΛΞΠΣΦΨΩ01{}<>=+*;#";
  let cols, drops, fs = 15, last = 0;
  function size() { cv.width = innerWidth; cv.height = innerHeight; cols = Math.ceil(cv.width / fs); drops = Array.from({ length: cols }, () => Math.random() * -50); }
  size(); addEventListener("resize", size);
  function frame(t) {
    requestAnimationFrame(frame);
    if (document.hidden || !S.settings.rain || t - last < 70) return;
    last = t;
    ctx.fillStyle = "rgba(5,6,5,0.18)"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.font = fs + "px JBM, monospace";
    for (let i = 0; i < cols; i++) {
      const y = drops[i] * fs;
      ctx.fillStyle = Math.random() < 0.06 ? "#d6ffe0" : "#39ff6a";
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fs, y);
      if (y > cv.height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    }
  }
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- router */
const view = () => $("#view");
const routes = [];
const route = (re, fn) => routes.push([re, fn]);
function go() {
  const h = location.hash || "#/";
  if (Session.active && !h.startsWith("#/session")) Session.active = null;
  for (const [re, fn] of routes) { const m = h.match(re); if (m) { fn(...m.slice(1).map(x => x === undefined ? undefined : decodeURIComponent(x))); break; } }
  const top = h.split("/")[1] || "";
  const navKey = { "": "home", courses: "courses", course: "courses", unit: "courses", lesson: "courses", practice: "practice", gens: "practice", session: "practice", progress: "progress", settings: "settings" }[top] || "home";
  $$("nav.bottom a").forEach(a => a.classList.toggle("on", a.dataset.nav === navKey));
  scrollTo(0, 0);
}
addEventListener("hashchange", go);
new MutationObserver(() => window.FIG && FIG.hydrate(document.getElementById("view"))).observe(document.getElementById("view") || document.body, { childList: true, subtree: true });

/* ---------------------------------------------------------------- οθόνες */
function nextLesson() {
  const ls = allLessons();
  if (S.lastLesson && IDX.lesson[S.lastLesson]) {
    const l = IDX.lesson[S.lastLesson];
    if (mastery(l.items) < 60) return l;
    const i = ls.indexOf(l);
    for (let k = i + 1; k < ls.length; k++) if (!S.read[ls[k].id]) return ls[k];
  }
  return ls.find(l => !S.read[l.id]) || ls[0];
}
function weakestUnit() {
  let best = null, bm = 101;
  for (const u of Object.values(IDX.unit)) {
    const its = itemsOf(u.id); const seen = its.filter(i => S.srs[i.id]);
    if (seen.length < 4) continue;
    const m = mastery(seen); if (m < bm) { bm = m; best = u; }
  }
  return best ? { u: best, m: bm } : null;
}
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Ξενύχτι; Ένα γρήγορο γύρο και ύπνο." : h < 12 ? "Καλημέρα. Ο εγκέφαλος είναι φρέσκος — ώρα για κάτι δύσκολο." : h < 18 ? "Καλησπέρα. Δέκα λεπτά τώρα αξίζουν μία ώρα το βράδυ πριν την εξέταση." : "Καλό βράδυ. Μια επανάληψη πριν τον ύπνο κολλάει καλύτερα.";
}

function pausedTiles() {
  const sv = Object.entries(S.saved || {}).filter(([, v]) => Date.now() - v.at < 7 * 864e5 && v.idx < v.ids.length)
    .sort((x, y) => y[1].at - x[1].at).slice(0, 2);
  return sv.map(([k, v]) => `<a class="tile" href="${esc(k)}"><div class="row"><div class="grow"><div class="t">⏸ Συνέχισε: ${esc(v.title)}</div>
    <div class="s">Σταμάτησες στην ${v.idx + 1}/${v.ids.length}. Οι προηγούμενες έχουν μετρήσει.</div></div><span class="pill">${v.idx}/${v.ids.length}</span></div>
    <div class="bar"><b style="width:${Math.round(100 * v.idx / v.ids.length)}%"></b></div></a>`).join("");
}

let installEvt = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; if ((location.hash || "#/") === "#/") go(); });
document.addEventListener("click", async e => { if (e.target && e.target.id === "installBtn" && installEvt) { installEvt.prompt(); await installEvt.userChoice; installEvt = null; go(); } });
route(/^#\/?$/, () => {
  const t = S.log[todayStr()] || { n: 0, c: 0 };
  const goal = S.settings.goal, p = Math.min(100, Math.round(100 * t.n / goal));
  const due = dueItems().length, mist = mistakes().length;
  const nl = nextLesson(), wk = weakestUnit();
  const totalItems = Object.keys(IDX.item).length, seen = Object.keys(S.srs).length;
  view().innerHTML = `
    <div class="card hi">
      <div class="prompt muted small">system.boot // ${todayStr()}</div>
      <h1 class="cursor">Γεια σου, Στέλιο</h1>
      <p class="muted">${greeting()}</p>
    </div>
    <div class="card">
      <div class="row">
        <div class="ring" style="--p:${p}"><div class="center"><div class="big">${t.n}</div><div class="small muted">/${goal}</div></div></div>
        <div class="grow">
          <h2>Σημερινός στόχος</h2>
          <p class="small">${t.n >= goal ? "✔ Τον έπιασες. Ό,τι κάνεις τώρα είναι μπόνους." : `Λείπουν <b>${goal - t.n}</b> απαντήσεις.`}</p>
          <p class="small muted">Ακρίβεια σήμερα: ${t.n ? Math.round(100 * t.c / t.n) : 0}% · Streak: ${streak()} ${streak() === 1 ? "μέρα" : "μέρες"}</p>
        </div>
      </div>
    </div>
    ${pausedTiles()}
    ${due ? `<a class="tile" href="#/session/review"><div class="row"><div class="grow"><div class="t">↻ Επανάληψη ημέρας</div><div class="s">${due} ερωτήσεις είναι «έτοιμες να ξεχαστούν». Πρώτα αυτές.</div></div><span class="pill amber">${due}</span></div></a>` : ""}
    <a class="tile" href="#/lesson/${nl.id}"><div class="t">▶ Συνέχεια: ${esc(nl.title)}</div><div class="s">${esc(IDX.course[nl.course].short)} · ${esc(IDX.unit[nl.unit].title)} · κατάκτηση ${mastery(nl.items)}%</div></a>
    ${wk ? `<a class="tile" href="#/session/mix/${wk.u.id}"><div class="t">⚠ Αδύναμο σημείο: ${esc(wk.u.title)}</div><div class="s">Κατάκτηση ${wk.m}% στις ερωτήσεις που έχεις δει. Ένας γύρος εδώ θα σε ανεβάσει.</div></a>` : ""}
    ${mist ? `<a class="tile" href="#/session/mistakes"><div class="t">✗ Τα λάθη μου (${mist})</div><div class="s">Ξαναδοκίμασε ό,τι σου ξέφυγε.</div></a>` : ""}
    <div class="grid2">
      <a class="btn ghost" href="#/session/mix/all">Γρήγορος γύρος</a>
      <a class="btn ghost" href="#/gens">∞ Ατέρμονη</a>
    </div>
    ${installEvt ? `<button class="btn block" id="installBtn" style="margin-top:12px">⬇ Εγκατάσταση στην αρχική οθόνη</button>` : ""}
    ${!S.settings.remindOn ? `<a class="tile" href="#/settings" style="margin-top:12px"><div class="t">🔔 Άνοιξε τις υπενθυμίσεις</div><div class="s">Θα σου στέλνω ειδοποίηση τις μέρες που δεν έχεις εξασκηθεί, στην ώρα που θα διαλέξεις.</div></a>` : ""}
    <p class="small muted" style="margin-top:14px">Τράπεζα: ${totalItems} ερωτήσεις + ${GENS.list.length} γεννήτριες απεριόριστων ασκήσεων · έχεις δει ${seen}.</p>`;
});

route(/^#\/courses$/, () => {
  view().innerHTML = `<h1>Ύλη</h1>` + C.courses.map(c => {
    const its = itemsOf(c.id);
    return `<a class="tile" href="#/course/${c.id}"><div class="t">${esc(c.title)}</div><div class="s">${esc(c.desc || "")}</div>
      <div class="s">${c.units.length} ενότητες · ${c.units.reduce((a, u) => a + u.lessons.length, 0)} μαθήματα · ${its.length} ερωτήσεις · κατάκτηση ${mastery(its)}%</div>
      <div class="bar"><b style="width:${mastery(its)}%"></b></div></a>`;
  }).join("");
});

route(/^#\/course\/([\w-]+)$/, id => {
  const c = IDX.course[id]; if (!c) return (location.hash = "#/courses");
  view().innerHTML = `<a class="back" href="#/courses">‹ Ύλη</a><h1>${esc(c.title)}</h1>` + c.units.map(u => {
    const its = itemsOf(u.id), done = u.lessons.filter(l => S.read[l.id]).length;
    return `<a class="tile" href="#/unit/${u.id}"><div class="t">${esc(u.title)}</div><div class="s">${esc(u.desc || "")}</div>
      <div class="s">${done}/${u.lessons.length} μαθήματα διαβασμένα · κατάκτηση ${mastery(its)}%</div><div class="bar"><b style="width:${mastery(its)}%"></b></div></a>`;
  }).join("");
});

route(/^#\/unit\/([\w-]+)$/, id => {
  const u = IDX.unit[id]; if (!u) return (location.hash = "#/courses");
  const gens = GENS.list.filter(g => g.unit === id);
  view().innerHTML = `<a class="back" href="#/course/${u.course}">‹ ${esc(IDX.course[u.course].short)}</a><h1>${esc(u.title)}</h1>
    <div class="grid2" style="margin-bottom:12px"><a class="btn sm" href="#/session/mix/${u.id}">Εξάσκηση ενότητας</a><a class="btn sm ghost" href="#/session/exam/${u.id}">Διαγώνισμα</a></div>` +
    u.lessons.map((l, i) => `<a class="tile" href="#/lesson/${l.id}"><div class="row"><div class="grow"><div class="t">${i + 1}. ${esc(l.title)}</div>
      <div class="s">${l.items.length} ερωτήσεις · κατάκτηση ${mastery(l.items)}%</div></div>${S.read[l.id] ? '<span class="pill">✔</span>' : ""}</div>
      <div class="bar"><b style="width:${mastery(l.items)}%"></b></div></a>`).join("") +
    (gens.length ? `<h2 style="margin-top:16px">∞ Ατέρμονες ασκήσεις</h2>` + gens.map(g => `<a class="tile" href="#/session/gen/${g.id}"><div class="t">${esc(g.title)}</div><div class="s">${esc(g.desc)}</div></a>`).join("") : "");
});

route(/^#\/lesson\/([\w-]+)(?:\/(\w+))?$/, (id, step = "theory") => {
  const l = IDX.lesson[id]; if (!l) return (location.hash = "#/courses");
  S.lastLesson = id; save();
  const steps = [["theory", "1 · Θεωρία"], ["example", "2 · Παράδειγμα"], ["quiz", "3 · Ερωτήσεις"]];
  const si = steps.findIndex(s => s[0] === step);
  const head = `<a class="back" href="#/unit/${l.unit}">‹ ${esc(IDX.unit[l.unit].title)}</a><h1>${esc(l.title)}</h1>
    <div class="steps">${steps.map((s, i) => `<span class="${i === si ? "on" : i < si ? "done" : ""}" onclick="location.hash='#/lesson/${id}/${s[0]}'">${s[1]}</span>`).join("")}</div>`;
  const sq = S.saved && S.saved[`#/lesson/${id}/quiz`];
  const resumeBtn = sq && step !== "quiz" && sq.idx < sq.ids.length ? `<a class="tile" href="#/lesson/${id}/quiz"><div class="t">⏸ Συνέχισε τις ερωτήσεις</div><div class="s">Σταμάτησες στην ${sq.idx + 1}/${sq.ids.length}.</div></a>` : "";
  if (step === "theory") {
    view().innerHTML = head + resumeBtn + `<div class="card md">${md(l.theory)}</div>
      <div class="actions"><a class="btn block" href="#/lesson/${id}/example">Συνέχεια στο παράδειγμα ▸</a></div>`;
  } else if (step === "example") {
    view().innerHTML = head + `<div class="card md">${md(l.example || "_Δεν υπάρχει ξεχωριστό παράδειγμα· πήγαινε στις ερωτήσεις._")}</div>
      <div class="actions"><a class="btn block" href="#/lesson/${id}/quiz">Είμαι έτοιμος — ερωτήσεις ▸</a></div>`;
  } else {
    S.read[id] = true; save();
    Session.start({ title: l.title, items: l.items.slice(), mode: "lesson", back: `#/unit/${l.unit}`, lesson: id });
  }
});

route(/^#\/practice$/, () => {
  const due = dueItems().length, mist = mistakes().length;
  const opts = `<option value="all">Όλη η ύλη</option>` + C.courses.map(c => `<option value="${c.id}">${esc(c.short)} — όλο</option>` +
    c.units.map(u => `<option value="${u.id}">&nbsp;&nbsp;${esc(u.title)}</option>`).join("")).join("");
  view().innerHTML = `<h1>Εξάσκηση</h1>
    <a class="tile" href="#/session/review"><div class="row"><div class="grow"><div class="t">↻ Επανάληψη ημέρας</div><div class="s">Spaced repetition: ό,τι ήρθε η ώρα να ξαναδείς.</div></div><span class="pill amber">${due}</span></div></a>
    <a class="tile" href="#/session/mistakes"><div class="row"><div class="grow"><div class="t">✗ Τα λάθη μου</div><div class="s">Ερωτήσεις που έχεις απαντήσει λάθος και δεν έχεις ακόμη κατακτήσει.</div></div><span class="pill">${mist}</span></div></a>
    <a class="tile" href="#/gens"><div class="t">∞ Ατέρμονη εξάσκηση</div><div class="s">${GENS.list.length} γεννήτριες: κάθε φορά καινούργια άσκηση (μετατροπές, C, ταξινόμηση, SQL, χρονοδρομολόγηση…).</div></a>
    <div class="card">
      <h2>Μικτός γύρος / Διαγώνισμα</h2>
      <p class="small muted">Διάλεξε ύλη. Ο μικτός γύρος δίνει πρώτα όσα δεν έχεις κατακτήσει. Το διαγώνισμα είναι 20 ερωτήσεις με χρόνο, χωρίς βοήθεια, με διόρθωση στο τέλος.</p>
      <select class="sel" id="scope">${opts}</select>
      <div class="grid2" style="margin-top:10px"><button class="btn" id="goMix">Μικτός γύρος</button><button class="btn ghost" id="goExam">Διαγώνισμα</button></div>
    </div>`;
  $("#goMix").onclick = () => location.hash = "#/session/mix/" + $("#scope").value;
  $("#goExam").onclick = () => location.hash = "#/session/exam/" + $("#scope").value;
});

route(/^#\/gens$/, () => {
  const by = {};
  for (const g of GENS.list) (by[g.unit] = by[g.unit] || []).push(g);
  view().innerHTML = `<a class="back" href="#/practice">‹ Εξάσκηση</a><h1>∞ Ατέρμονη εξάσκηση</h1>
    <p class="small muted">Κάθε γεννήτρια φτιάχνει νέα άσκηση με τυχαία δεδομένα, με λύση βήμα-βήμα. Δεν τελειώνουν ποτέ — σταματάς όποτε θέλεις.</p>
    <a class="btn block" href="#/session/gen/any" style="margin-bottom:14px">Τυχαία ανάμειξη από όλες</a>` +
    Object.entries(by).map(([uid, gs]) => `<h3>${esc(IDX.unit[uid]?.title || uid)}</h3>` + gs.map(g => {
      const st = S.genStats[g.id];
      return `<a class="tile" href="#/session/gen/${g.id}"><div class="t">${esc(g.title)}</div><div class="s">${esc(g.desc)}${st ? ` · ${st.c}/${st.n} σωστές` : ""}</div></a>`;
    }).join("")).join("");
});

route(/^#\/session\/(\w+)(?:\/([\w-]+))?$/, (mode, arg) => {
  if (Session.active && Session.active.key === location.hash) return Session.render();
  const n = S.settings.sessionLen;
  if (mode === "review") {
    const its = shuffle(dueItems()).slice(0, 30);
    if (!its.length) return empty("Δεν υπάρχει τίποτα για επανάληψη σήμερα.", "Κάνε ένα νέο μάθημα ή μια ατέρμονη εξάσκηση — οι ερωτήσεις που απαντάς μπαίνουν αυτόματα στο πρόγραμμα επανάληψης.");
    Session.start({ title: "Επανάληψη ημέρας", items: its, mode, back: "#/practice" });
  } else if (mode === "mistakes") {
    const its = shuffle(mistakes()).slice(0, 25);
    if (!its.length) return empty("Κανένα ανοιχτό λάθος.", "Καθαρός πίνακας. Όταν κάνεις λάθος σε κάτι, θα εμφανίζεται εδώ μέχρι να το απαντήσεις σωστά δύο φορές.");
    Session.start({ title: "Τα λάθη μου", items: its, mode, back: "#/practice" });
  } else if (mode === "mix") {
    const pool = itemsOf(arg || "all");
    const w = it => { const r = S.srs[it.id]; return r ? r.b + Math.random() * 1.5 : Math.random() * 1.2 - 0.3; };   // πρώτα αδύναμα & καινούργια
    const its = pool.slice().sort((a, b) => w(a) - w(b)).slice(0, n);
    Session.start({ title: "Μικτός γύρος · " + scopeName(arg), items: shuffle(its), mode, back: "#/practice" });
  } else if (mode === "exam") {
    const its = shuffle(itemsOf(arg || "all")).slice(0, 20);
    Session.start({ title: "Διαγώνισμα · " + scopeName(arg), items: its, mode, back: "#/practice", exam: true, t0: Date.now() });
  } else if (mode === "gen") {
    Session.start({ title: arg === "any" ? "∞ Τυχαία ανάμειξη" : "∞ " + (GENS.byId[arg]?.title || ""), items: [], mode, back: "#/gens", gen: arg, endless: true });
  }
});
const scopeName = s => !s || s === "all" ? "όλη η ύλη" : (IDX.course[s]?.short || IDX.unit[s]?.title || s);
function empty(h, p) { view().innerHTML = `<a class="back" href="#/practice">‹ Εξάσκηση</a><div class="card"><h2>${esc(h)}</h2><p>${esc(p)}</p><a class="btn block" href="#/">Αρχική</a></div>`; }

/* ---------------------------------------------------------------- session */
const Session = {
  active: null,
  start(cfg) {
    const key = location.hash;
    this.active = Object.assign({ idx: 0, res: [], requeued: {}, phase: "teach", key, answers: {} }, cfg);
    if (cfg.endless) this.active.items.push(this.makeGen());
    else if (!cfg.fresh) this.restore(key);
    this.active.phase = this.firstPhase();
    this.render();
  },
  /* αποθήκευση γύρου: αν βγεις στη μέση, συνεχίζεις από εκεί που σταμάτησες */
  persist() {
    const a = this.active; if (!a || a.endless) return;
    S.saved = S.saved || {};
    S.saved[a.key] = {
      title: a.title, back: a.back, at: Date.now(), t0: a.t0 || null,
      ids: a.items.map(i => i.id), idx: a.phase === "fb" ? a.idx + 1 : a.idx,
      res: a.res.map(r => ({ id: r.id, ok: r.ok, given: r.given })), requeued: a.requeued
    };
    save();
  },
  clearSaved(key) { if (S.saved && S.saved[key]) { delete S.saved[key]; save(); } },
  restore(key) {
    const sv = S.saved && S.saved[key], a = this.active;
    if (!sv) return;
    const items = sv.ids.map(id => IDX.item[id]).filter(Boolean);
    if (Date.now() - sv.at > 7 * 864e5 || sv.idx >= items.length || items.length !== sv.ids.length) { this.clearSaved(key); return; }
    a.items = items; a.idx = sv.idx; a.requeued = sv.requeued || {};
    a.res = sv.res.filter(r => IDX.item[r.id]).map(r => ({ ...r, it: IDX.item[r.id] }));
    if (sv.t0) a.t0 = sv.t0;
    a.resumed = true;
  },
  makeGen() {
    const a = this.active;
    const ids = a.gen === "any" ? GENS.list.map(g => g.id) : [a.gen];
    const g = GENS.byId[ids[Math.floor(Math.random() * ids.length)]];
    const it = g.make();
    it.id = "gen:" + g.id + ":" + Math.random().toString(36).slice(2, 8);
    it.genId = g.id; it.genTitle = g.title;
    return it;
  },
  cur() { const a = this.active; return a.items[a.idx]; },
  firstPhase() {
    const a = this.active, it = this.cur();
    if (!it || a.exam) return "ask";
    const seen = S.srs[it.id];
    return S.settings.teach && it.pre && !seen ? "teach" : "ask";
  },
  render() {
    const a = this.active; if (!a) return;
    const it = this.cur();
    if (!it) return this.finish();
    const total = a.endless ? null : a.items.length;
    const head = `<a class="back" href="${a.back}">‹ Έξοδος</a>
      <div class="qhead"><span>${esc(a.title)}</span><span>${a.endless ? `#${a.idx + 1} · ✔ ${a.res.filter(r => r.ok).length}` : `${a.idx + 1}/${total}`}</span></div>
      ${a.endless ? "" : `<div class="prog"><b style="width:${100 * a.idx / total}%"></b></div>`}
      ${a.resumed ? `<div class="resume small">⏸ Συνεχίζεις από εκεί που σταμάτησες (${a.res.length} απαντημένες). <button class="linkbtn" id="restart">Από την αρχή</button></div>` : ""}`;
    const src = it.genTitle ? `<span class="pill">∞ ${esc(it.genTitle)}</span>` : (IDX.lesson[it.lesson] ? `<span class="pill">${esc(IDX.lesson[it.lesson].title)}</span>` : "");
    if (a.phase === "teach") {
      view().innerHTML = head + `<div class="teach"><div class="lab">ΠΡΙΝ ΤΗΝ ΕΡΩΤΗΣΗ · ΤΙ ΠΡΕΠΕΙ ΝΑ ΘΥΜΑΣΑΙ</div><div class="md">${md(it.pre)}</div></div>
        <p class="small muted">${src}</p>
        <div class="actions"><button class="btn block" id="toAsk">Κατάλαβα — δείξε την ερώτηση ▸</button>
        ${IDX.lesson[it.lesson] && !a.lesson ? `<a class="btn ghost block" style="margin-top:8px" href="#/lesson/${it.lesson}/theory">📖 Διάβασε πρώτα όλη τη θεωρία</a>` : ""}</div>`;
      $("#toAsk").onclick = () => { a.phase = "ask"; this.render(); };
      this.bindRestart();
      return;
    }
    const preBox = it.pre && !a.exam ? `<details class="teach" ${a.phase === "ask" && S.srs[it.id] ? "" : ""}><summary class="lab">💡 ΥΠΕΝΘΥΜΙΣΗ ΘΕΩΡΙΑΣ</summary><div class="md">${md(it.pre)}</div></details>` : "";
    view().innerHTML = head + preBox + `<div class="card"><p class="small muted">${src} <span class="pill">${{ tf: "Σωστό/Λάθος", mcq: "Πολλαπλή επιλογή", fill: "Συμπλήρωση κενών", short: "Σύντομη απάντηση" }[it.type]}</span></p>
      ${it.fig && !it.fig.after && window.FIG ? FIG.html(it.fig, 'data-q="1"') : ""}<div id="q"></div><div id="fb"></div></div><div class="actions" id="act"></div>`;
    renderQuestion(it, $("#q"), a);
    this.actions();
    this.bindRestart();
  },
  bindRestart() {
    const b = $("#restart"); if (!b) return;
    b.onclick = () => {
      const a = this.active; this.clearSaved(a.key);
      if (a.lesson) { const l = IDX.lesson[a.lesson]; this.start({ title: l.title, items: l.items.slice(), mode: "lesson", back: a.back, lesson: a.lesson, fresh: true }); }
      else { this.active = null; go(); }
      scrollTo(0, 0);
    };
  },
  actions() {
    const a = this.active, it = this.cur(), act = $("#act");
    if (a.phase === "ask") {
      act.innerHTML = `<button class="btn block" id="chk">${a.exam ? "Επόμενη ▸" : "Έλεγχος"}</button>` +
        (a.endless ? `<button class="btn ghost block" id="stop" style="margin-top:8px">Τέλος εξάσκησης</button>` : "");
      $("#chk").onclick = () => this.check();
      if (a.endless) $("#stop").onclick = () => this.finish();
    } else {
      act.innerHTML = `<button class="btn block" id="nxt">${this.isLast() ? "Αποτελέσματα ▸" : "Επόμενη ▸"}</button>` +
        (IDX.lesson[it.lesson] && !a.lesson ? `<a class="btn ghost block" style="margin-top:8px" href="#/lesson/${it.lesson}/theory">Ξαναδιάβασε τη θεωρία</a>` : "");
      $("#nxt").onclick = () => this.next();
    }
  },
  isLast() { const a = this.active; return !a.endless && a.idx >= a.items.length - 1; },
  check() {
    const a = this.active, it = this.cur();
    const r = readAnswer(it, $("#q"));
    if (r.empty && !a.exam) { toast("Δώσε μια απάντηση πρώτα (ή γράψε «;» αν δεν ξέρεις)."); return; }
    const ok = r.ok;
    a.res.push({ id: it.id, ok, it, given: r.given });
    if (!it.genId) grade(it.id, ok);
    else { const g = S.genStats[it.genId] || { n: 0, c: 0 }; g.n++; if (ok) g.c++; S.genStats[it.genId] = g; }
    logAnswer(ok);
    if (a.exam) { this.next(); return; }
    showFeedback(it, $("#q"), $("#fb"), ok, r);
    if (!ok && !a.endless && !a.requeued[it.id] && a.mode !== "exam") {     // ξαναρωτάμε πιο μετά στον ίδιο γύρο
      a.requeued[it.id] = true;
      const pos = Math.min(a.items.length, a.idx + 3 + Math.floor(Math.random() * 3));
      a.items.splice(pos, 0, it);
    }
    a.phase = "fb"; this.actions(); this.persist();
    if (!ok) $("#fb").classList.add("glitch");
    $("#fb").scrollIntoView({ behavior: "smooth", block: "nearest" });
  },
  next() {
    const a = this.active;
    a.idx++;
    if (a.endless && a.idx >= a.items.length) a.items.push(this.makeGen());
    a.phase = this.firstPhase(); a.resumed = false;
    if (a.items[a.idx]) this.persist();
    this.render(); scrollTo(0, 0);
  },
  finish() {
    const a = this.active; if (!a) return;
    this.clearSaved(a.key);
    const n = a.res.length, ok = a.res.filter(r => r.ok).length, p = n ? Math.round(100 * ok / n) : 0;
    const msg = p >= 90 ? "Εξαιρετικά. Αυτό το κομμάτι το έχεις." : p >= 70 ? "Καλή δουλειά. Λίγη επανάληψη ακόμα και κλειδώνει." : p >= 50 ? "Μισό-μισό. Ξαναδιάβασε τη θεωρία και ξαναδοκίμασε αύριο." : "Δεν πειράζει — αυτός είναι ο σκοπός της εξάσκησης. Θεωρία πρώτα, μετά ξανά.";
    let extra = "";
    if (a.exam) {
      const mins = Math.round((Date.now() - a.t0) / 60000);
      extra = `<p class="small muted">Χρόνος: ${mins}′ · Βαθμός: <b>${(10 * ok / Math.max(1, n)).toFixed(1)}/10</b></p>` +
        a.res.map((r, i) => `<div class="card"><p class="small">${i + 1}. ${r.ok ? '<span style="color:var(--g)">✔</span>' : '<span style="color:var(--red)">✗</span>'} ${mdi(stripBlanks(r.it.q).slice(0, 180))}</p>
        ${r.ok ? "" : `<p class="small">Σωστό: <b>${esc(correctText(r.it))}</b></p>`}<div class="small muted md">${md(r.it.why || "")}</div></div>`).join("");
    } else if (a.res.some(r => !r.ok)) {
      extra = `<h3>Να ξαναδείς</h3>` + [...new Map(a.res.filter(r => !r.ok).map(r => [r.id, r])).values()].slice(0, 8).map(r =>
        `<div class="card small"><div>${mdi(stripBlanks(r.it.q).slice(0, 160))}</div><div class="muted">→ ${esc(correctText(r.it))}</div></div>`).join("");
    }
    view().innerHTML = `<div class="card hi" style="text-align:center"><div class="prompt muted small">session.end</div>
      <div class="big" style="font-size:54px;margin:8px 0">${p}%</div><p>${ok}/${n} σωστές</p><p class="muted">${msg}</p></div>${extra}
      <div class="grid2"><a class="btn" href="${a.back}">Συνέχεια</a><a class="btn ghost" href="#/">Αρχική</a></div>`;
    this.active = null;
  }
};

function stripBlanks(q) { return String(q || "").replace(BLANK_RE, "____"); }
function correctText(it) {
  if (it.type === "tf") return it.a ? "Σωστό" : "Λάθος";
  if (it.type === "mcq") return it.o[it.a];
  if (it.type === "fill") return blanksOf(it).map(b => b[0]).join(" · ");
  return (Array.isArray(it.a) ? it.a : [it.a]).filter(x => !String(x).startsWith("re:"))[0] ?? "";
}

function renderQuestion(it, el, a) {
  if (it.type === "fill") {
    let i = 0;
    const html = md(it.q.replace(BLANK_RE, () => `@@B${i++}@@`)).replace(/@@B(\d+)@@/g, (_, k) => `<input class="blank" data-b="${k}" autocomplete="off" autocapitalize="off" spellcheck="false">`);
    el.innerHTML = `<div class="qtext md">${html}</div><p class="small muted">Συμπλήρωσε τα κενά.</p>`;
    $$("input.blank", el).forEach(inp => {
      const sz = () => inp.style.width = Math.max(6, inp.value.length + 2) + "ch"; inp.addEventListener("input", sz);
      inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); const nx = $$("input.blank", el)[+inp.dataset.b + 1]; nx ? nx.focus() : $("#chk")?.click(); } });
    });
    return;
  }
  el.innerHTML = `<div class="qtext md">${md(it.q)}</div>`;
  if (it.type === "tf") {
    el.innerHTML += `<div class="tf"><button class="opt" data-v="1">✔ Σωστό</button><button class="opt" data-v="0">✗ Λάθος</button></div>`;
    $$(".opt", el).forEach(b => b.onclick = () => { $$(".opt", el).forEach(x => x.classList.remove("sel")); b.classList.add("sel"); if (!a.exam) Session.check(); });
  } else if (it.type === "mcq") {
    const order = it._order || (it._order = shuffle(it.o.map((_, i) => i)));
    el.innerHTML += `<div class="opts">${order.map(i => `<button class="opt" data-i="${i}">${mdi(it.o[i])}</button>`).join("")}</div>`;
    $$(".opt", el).forEach(b => b.onclick = () => { $$(".opt", el).forEach(x => x.classList.remove("sel")); b.classList.add("sel"); });
  } else {
    const multi = String(correctText(it)).length > 40;
    el.innerHTML += multi ? `<textarea class="ans" rows="3" placeholder="Η απάντησή σου…" autocapitalize="off" spellcheck="false"></textarea>`
      : `<input class="ans" placeholder="Η απάντησή σου…" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-top:12px">`;
    const inp = $(".ans", el);
    inp.addEventListener("keydown", e => { if (e.key === "Enter" && !multi) { e.preventDefault(); $("#chk")?.click(); } });
    setTimeout(() => inp.focus({ preventScroll: true }), 50);
  }
}
function readAnswer(it, el) {
  if (it.type === "tf") { const s = $(".opt.sel", el); if (!s) return { empty: true, ok: false }; const v = s.dataset.v === "1"; return { ok: v === !!it.a, given: v ? "Σωστό" : "Λάθος" }; }
  if (it.type === "mcq") { const s = $(".opt.sel", el); if (!s) return { empty: true, ok: false }; return { ok: +s.dataset.i === it.a, given: it.o[+s.dataset.i], sel: +s.dataset.i }; }
  if (it.type === "fill") {
    const bl = blanksOf(it), inps = $$("input.blank", el);
    const vals = inps.map(x => x.value);
    if (vals.every(v => !v.trim())) return { empty: true, ok: false };
    const per = bl.map((acc, i) => matches(vals[i] || "", acc));
    return { ok: per.every(Boolean), per, given: vals.join(" · ") };
  }
  const v = $(".ans", el).value;
  if (!v.trim()) return { empty: true, ok: false };
  const acc = Array.isArray(it.a) ? it.a : [it.a];
  return { ok: v.trim() !== ";" && matches(v, acc), given: v };
}
function showFeedback(it, el, fb, ok, r) {
  if (it.type === "tf") $$(".opt", el).forEach(b => { b.disabled = true; const v = b.dataset.v === "1"; if (v === !!it.a) b.classList.add("ok"); else if (b.classList.contains("sel")) b.classList.add("bad"); });
  if (it.type === "mcq") $$(".opt", el).forEach(b => { b.disabled = true; const i = +b.dataset.i; if (i === it.a) b.classList.add("ok"); else if (b.classList.contains("sel")) b.classList.add("bad"); });
  if (it.type === "fill") { const bl = blanksOf(it); $$("input.blank", el).forEach((x, i) => { x.disabled = true; x.classList.add(r.per[i] ? "ok" : "bad"); if (!r.per[i]) { x.value = (x.value ? x.value + " → " : "") + bl[i][0]; x.style.width = Math.max(6, x.value.length + 2) + "ch"; } }); }
  if (it.type === "short") $(".ans", el).disabled = true;
  const correct = ok ? "" : (it.type === "short" ? `<p>Σωστή απάντηση: <b>${esc(correctText(it))}</b></p>` : "");
  fb.className = "fb " + (ok ? "ok" : "bad");
  fb.innerHTML = `<div class="h">${ok ? pick(["✔ Σωστά!", "✔ Ακριβώς.", "✔ Μπράβο.", "✔ Σωστό — συνέχισε έτσι."]) : pick(["✗ Όχι ακόμα.", "✗ Λάθος — δες γιατί.", "✗ Παραλίγο."])}</div>${correct}<div class="md">${md(it.why || "")}</div>` + (it.fig && it.fig.after && window.FIG ? FIG.html(it.fig, 'data-reveal="1"') : "");
  const qf = document.querySelector('.fig[data-q="1"]');
  if (qf && qf._fig && window.FIG && FIG.hasMask(it.fig)) qf._fig.reveal();
}
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------------------------------------------------------------- πρόοδος */
route(/^#\/progress$/, () => {
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return S.log[todayStr(d)] || { n: 0, c: 0 }; });
  const mx = Math.max(S.settings.goal, ...days.map(d => d.n));
  const tot = Object.values(S.log).reduce((a, d) => ({ n: a.n + d.n, c: a.c + d.c }), { n: 0, c: 0 });
  view().innerHTML = `<h1>Πρόοδος</h1>
    <div class="grid2">
      <div class="card stat"><div class="big">${streak()}</div><div class="k">STREAK</div></div>
      <div class="card stat"><div class="big">${tot.n}</div><div class="k">ΑΠΑΝΤΗΣΕΙΣ</div></div>
      <div class="card stat"><div class="big">${tot.n ? Math.round(100 * tot.c / tot.n) : 0}</div><div class="k">% ΑΚΡΙΒΕΙΑ</div></div>
      <div class="card stat"><div class="big">${Object.values(S.srs).filter(r => r.b >= 4).length}</div><div class="k">ΚΑΤΑΚΤΗΜΕΝΕΣ</div></div>
    </div>
    <div class="card"><h3>Τελευταίες 14 μέρες</h3><div class="chart">${days.map(d => `<div class="${d.n >= S.settings.goal ? "on" : ""}" style="height:${Math.round(100 * d.n / mx)}%" title="${d.n}"></div>`).join("")}</div>
      <p class="small muted">Φωτεινή στήλη = πιάστηκε ο στόχος των ${S.settings.goal}.</p></div>` +
    C.courses.map(c => `<div class="card"><h3>${esc(c.title)}</h3>` + c.units.map(u => { const m = mastery(itemsOf(u.id)); return `<div class="small" style="margin-top:8px">${esc(u.title)} <span class="muted">${m}%</span></div><div class="bar"><b style="width:${m}%"></b></div>`; }).join("") + `</div>`).join("");
});

/* ---------------------------------------------------------------- ρυθμίσεις */
route(/^#\/settings$/, () => {
  const st = S.settings;
  view().innerHTML = `<h1>Ρυθμίσεις</h1>
    <div class="card">
      <h3>Υπενθύμιση εξάσκησης</h3>
      <p class="small muted">Αν μια μέρα δεν έχεις απαντήσει ούτε μία ερώτηση μέχρι την ώρα που θα ορίσεις, θα σου έρθει ειδοποίηση στο κινητό — ακόμη κι αν η εφαρμογή είναι κλειστή.</p>
      <label class="set"><span>Ειδοποιήσεις</span><input type="checkbox" id="remOn" ${st.remindOn ? "checked" : ""}></label>
      <label class="set"><span>Ώρα υπενθύμισης</span><input type="time" id="remT" value="${st.remindTime}"></label>
      <div class="row wrap" style="margin-top:10px"><button class="btn sm ghost" id="testPush">Δοκιμαστική ειδοποίηση</button><span class="small muted" id="pushState"></span></div>
    </div>
    <div class="card">
      <h3>Μελέτη</h3>
      <label class="set"><span>Ημερήσιος στόχος (απαντήσεις)</span><input type="number" id="goal" min="5" max="200" step="5" value="${st.goal}" style="width:84px"></label>
      <label class="set"><span>Ερωτήσεις ανά γύρο</span><input type="number" id="slen" min="5" max="50" step="1" value="${st.sessionLen}" style="width:84px"></label>
      <label class="set"><span>Εξήγηση πριν από κάθε νέα ερώτηση</span><input type="checkbox" id="teach" ${st.teach ? "checked" : ""}></label>
      <label class="set"><span>Βροχή χαρακτήρων Matrix στο φόντο</span><input type="checkbox" id="rainOn" ${st.rain ? "checked" : ""}></label>
    </div>
    <div class="card">
      <h3>Αντίγραφο ασφαλείας</h3>
      <p class="small muted">Η πρόοδος αποθηκεύεται στο κινητό. Κράτα αντίγραφο αν αλλάξεις συσκευή.</p>
      <div class="grid2"><button class="btn sm ghost" id="exp">Εξαγωγή</button><button class="btn sm ghost" id="imp">Εισαγωγή</button></div>
      <input type="file" id="impFile" accept="application/json" hidden>
      <button class="btn sm danger block" id="reset" style="margin-top:10px">Μηδενισμός προόδου</button>
    </div>
    <p class="small muted">Έκδοση ${esc(window.APP_VERSION || "")} · ${Object.keys(IDX.item).length} ερωτήσεις · ${allLessons().length} μαθήματα</p>`;
  const sv = () => { save(); updateLeds(); };
  $("#goal").onchange = e => { st.goal = Math.max(5, +e.target.value || 20); sv(); };
  $("#slen").onchange = e => { st.sessionLen = Math.min(50, Math.max(5, +e.target.value || 12)); sv(); };
  $("#teach").onchange = e => { st.teach = e.target.checked; sv(); };
  $("#rainOn").onchange = e => { st.rain = e.target.checked; document.body.classList.toggle("norain", !st.rain); sv(); };
  $("#remT").onchange = async e => { st.remindTime = e.target.value || "20:00"; sv(); if (st.remindOn) await Push.register(); };
  $("#remOn").onchange = async e => {
    if (e.target.checked) { const ok = await Push.enable(); e.target.checked = ok; st.remindOn = ok; }
    else { st.remindOn = false; await Push.disable(); }
    sv(); Push.showState();
  };
  $("#testPush").onclick = () => Push.test();
  $("#exp").onclick = () => { const b = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `plh-matrix-backup-${todayStr()}.json`; a.click(); };
  $("#imp").onclick = () => $("#impFile").click();
  $("#impFile").onchange = async e => { try { const o = JSON.parse(await e.target.files[0].text()); if (!o.srs) throw 0; const dev = S.deviceId; S = Object.assign(structuredClone(DEFAULTS), o); S.deviceId = dev; save(); toast("Η πρόοδος επανήλθε."); go(); } catch (er) { toast("Μη έγκυρο αρχείο."); } };
  $("#reset").onclick = () => { if (prompt("Γράψε ΜΗΔΕΝΙΣΜΟΣ για να σβηστεί όλη η πρόοδος") === "ΜΗΔΕΝΙΣΜΟΣ") { const dev = S.deviceId, st2 = S.settings; S = structuredClone(DEFAULTS); S.deviceId = dev; S.settings = st2; save(); updateLeds(); toast("Μηδενίστηκε."); go(); } };
  Push.showState();
});

/* ---------------------------------------------------------------- push ειδοποιήσεις */
const Push = {
  cfg: () => window.PLH_CONFIG || {},
  supported: () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
  async rpc(fn, body) {
    const c = this.cfg(); if (!c.supabaseUrl) throw new Error("no backend");
    const r = await fetch(`${c.supabaseUrl}/rest/v1/rpc/${fn}`, { method: "POST", headers: { "Content-Type": "application/json", apikey: c.supabaseKey, Authorization: `Bearer ${c.supabaseKey}` }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    return r.json().catch(() => null);
  },
  async enable() {
    if (!this.supported()) { toast("Ο browser δεν υποστηρίζει ειδοποιήσεις. Άνοιξε την εφαρμογή από την αρχική οθόνη (Chrome)."); return false; }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { toast("Δεν δόθηκε άδεια για ειδοποιήσεις."); return false; }
    try { await this.register(); toast("Οι υπενθυμίσεις ενεργοποιήθηκαν."); return true; }
    catch (e) { console.error(e); toast("Αποτυχία σύνδεσης με τον server υπενθυμίσεων."); return false; }
  },
  async register() {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(this.cfg().vapidPublicKey) });
    await this.rpc("register_device", { p_device: S.deviceId, p_sub: sub.toJSON(), p_time: S.settings.remindTime, p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Athens", p_streak: streak() });
    this.ping(true);
  },
  async disable() {
    try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); await this.rpc("unregister_device", { p_device: S.deviceId }); } catch (e) { }
  },
  _t: 0,
  ping(force) {
    if (!S.settings.remindOn) return;
    const d = todayStr();
    if (!force && this._last === d) return;
    clearTimeout(this._t);
    this._t = setTimeout(() => this.rpc("ping_device", { p_device: S.deviceId, p_day: d, p_streak: streak(), p_today: S.log[d]?.n || 0 }).then(() => this._last = d).catch(() => { }), 800);
  },
  async test() {
    if (!S.settings.remindOn) { toast("Ενεργοποίησε πρώτα τις ειδοποιήσεις."); return; }
    try { await this.rpc("request_test_push", { p_device: S.deviceId }); toast("Στάλθηκε — θα έρθει σε λίγα δευτερόλεπτα."); } catch (e) { toast("Αποτυχία αποστολής."); }
  },
  async showState() {
    const el = $("#pushState"); if (!el) return;
    if (!this.supported()) { el.textContent = "Μη υποστηριζόμενο εδώ"; return; }
    el.textContent = Notification.permission === "granted" ? (S.settings.remindOn ? `ενεργό · ${S.settings.remindTime}` : "ανενεργό") : Notification.permission === "denied" ? "μπλοκαρισμένο από το κινητό" : "δεν έχει δοθεί άδεια";
  }
};
function b64u(s) { const p = "=".repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); }

/* ---------------------------------------------------------------- εκκίνηση */
async function boot() {
  load();
  document.body.classList.toggle("norain", !S.settings.rain);
  startRain();
  view().innerHTML = `<div class="card"><p class="prompt cursor">loading knowledge base</p></div>`;
  try { await loadContent(); } catch (e) { view().innerHTML = `<div class="card"><p>Δεν φορτώθηκε το περιεχόμενο. Έλεγξε τη σύνδεση και ξαναδοκίμασε.</p></div>`; return; }
  updateLeds(); go();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => { });
  if (S.settings.remindOn) Push.ping(true);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { updateLeds(); } });
}
window.PLH = { get S() { return S; }, C: () => C, IDX, matches, Session, renderQuestion, blanksOf };
boot();
})();

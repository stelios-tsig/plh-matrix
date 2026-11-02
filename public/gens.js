/* Γεννήτριες ατέρμονων ασκήσεων — κάθε make() δίνει νέα άσκηση με λύση βήμα-βήμα */
(() => {
"use strict";
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const P = a => a[Math.floor(Math.random() * a.length)];
const sample = (arr, k) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = R(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, k); };
const uniq = (k, lo, hi) => sample([...Array(hi - lo + 1)].map((_, i) => lo + i), k);
const BN = { 2: "δυαδικό", 8: "οκταδικό", 10: "δεκαδικό", 16: "δεκαεξαδικό" };
const sub = b => ({ 2: "₂", 8: "₈", 10: "₁₀", 16: "₁₆" }[b]);
const fmt2 = x => (Math.round(x * 100) / 100).toString();
const list = [];
const toArr = t => t ? [t.k, toArr(t.l), toArr(t.r)] : null;
function ganttSegs(g) {   // "P1[0–3]" → [["P1",0,3]] με κενά διαστήματα αδράνειας
  const out = []; let t = 0;
  for (const x of g) { const m = x.match(/^(\S+)\[(\d+)–(\d+)\]$/); if (!m) continue; const a = +m[2], b = +m[3]; if (a > t) out.push(["-", t, a]); out.push([m[1], a, b]); t = b; }
  return out;
}
const add = g => list.push(g);
// σύνολο γραμμάτων σε οποιαδήποτε σειρά/μορφή
function setAnswer(letters) {
  const s = [...letters].sort().join("");
  const look = [...s].map(c => `(?=.*${c})`).join("");
  return [s, s.split("").join(","), `re:^\\{?\\s*${look}(?:[${s}][\\s,]*){${s.length}}\\}?$`];
}

/* ============================== ΠΛΗ10 · Τόμος 1 ============================== */
add({ id: "base", unit: "p10-intro", title: "Μετατροπές αριθμητικών συστημάτων", desc: "2 ↔ 8 ↔ 10 ↔ 16 με τυχαίους αριθμούς",
  make() {
    const n = R(5, P([255, 1023, 4095]));
    let [f, t] = sample([2, 8, 10, 16], 2);
    const src = n.toString(f).toUpperCase(), dst = n.toString(t).toUpperCase();
    let why;
    if (f === 10) {
      const steps = []; let x = n; while (x > 0) { steps.push(`${x} ÷ ${t} = ${Math.floor(x / t)} υπόλοιπο **${(x % t).toString(t).toUpperCase()}**`); x = Math.floor(x / t); }
      why = `Διαδοχικές διαιρέσεις με τη βάση ${t}, και διαβάζουμε τα υπόλοιπα **από κάτω προς τα πάνω**:\n\n${steps.map(s => "- " + s).join("\n")}\n\nΆρα ${n}${sub(10)} = **${dst}${sub(t)}**.`;
    } else if (t === 10) {
      const terms = [...src].map((d, i) => `${parseInt(d, f)}·${f}^${src.length - 1 - i}`);
      why = `Ανάπτυγμα κατά δυνάμεις της βάσης ${f}:\n\n${src}${sub(f)} = ${terms.join(" + ")} = **${n}**.`;
    } else if ((f === 2 && (t === 8 || t === 16)) || (t === 2 && (f === 8 || f === 16))) {
      const k = (f === 2 ? t : f) === 8 ? 3 : 4;
      const bin = n.toString(2), padded = bin.padStart(Math.ceil(bin.length / k) * k, "0");
      const groups = padded.match(new RegExp(`.{${k}}`, "g"));
      why = `Κάθε ${f === 2 ? t : f === 8 ? "οκταδικό" : "δεκαεξαδικό"} ψηφίο αντιστοιχεί σε **${k} bits**. ` +
        `Ομάδες των ${k} από τα δεξιά: ${groups.map(g => `${g}→${parseInt(g, 2).toString(k === 3 ? 8 : 16).toUpperCase()}`).join(", ")}.\n\nΆρα ${src}${sub(f)} = **${dst}${sub(t)}**.`;
    } else {
      why = `Περνάμε από το δυαδικό: ${src}${sub(f)} = ${n.toString(2)}${sub(2)} (κάθε ψηφίο σε ${f === 8 ? 3 : 4} bits), και ξαναομαδοποιούμε ανά ${t === 8 ? 3 : 4}: **${dst}${sub(t)}**.\n\n(Έλεγχος: ${n}${sub(10)}.)`;
    }
    return { type: "short", q: `Μετάτρεψε τον **${src}${sub(f)}** στο **${BN[t]}** σύστημα.`, a: [dst, dst.replace(/^0+/, "") || "0"],
      pre: f === 10 ? `Από δεκαδικό σε βάση b: **διαιρείς διαδοχικά με b** και κρατάς τα υπόλοιπα με αντίστροφη σειρά.` : t === 10 ? `Προς δεκαδικό: κάθε ψηφίο **επί τη βάση υψωμένη στη θέση του** (η δεξιότερη θέση είναι 0) και πρόσθεση.` : `Τα 8 = 2³ και 16 = 2⁴, άρα κάθε οκταδικό ψηφίο είναι **3 bits** και κάθε δεκαεξαδικό **4 bits**. Ομαδοποιείς από τα δεξιά.`, why };
  } });

add({ id: "binadd", unit: "p10-intro", title: "Δυαδική πρόσθεση / αφαίρεση", desc: "Πράξεις σε 8 bits με κρατούμενα",
  make() {
    const op = P(["+", "-"]);
    let a = R(10, 200), b = R(5, 120);
    if (op === "+") { while (a + b > 255) b = R(5, 255 - a); } else if (b > a) [a, b] = [b, a];
    const r = op === "+" ? a + b : a - b;
    const A = a.toString(2).padStart(8, "0"), B = b.toString(2).padStart(8, "0"), Rb = r.toString(2);
    return { type: "short", q: `Υπολόγισε στο δυαδικό:\n\n\`\`\`\n  ${A}\n${op} ${B}\n\`\`\``, a: [Rb, Rb.padStart(8, "0")],
      pre: op === "+" ? "Κανόνες: 0+0=0, 0+1=1, 1+1=**10** (γράφω 0, κρατώ 1), 1+1+1=**11** (γράφω 1, κρατώ 1). Ξεκινάς από δεξιά." : "Αφαίρεση: 0−0=0, 1−0=1, 1−1=0, 0−1=1 **με δανεικό** από την επόμενη θέση (σαν το δεκαδικό). Εναλλακτικά: A + (συμπλήρωμα ως προς 2 του B).",
      why: `${a} ${op} ${b} = ${r} στο δεκαδικό, άρα **${Rb}${sub(2)}** (= ${Rb.padStart(8, "0")} σε 8 bits). Κάνε τον έλεγχο μετατρέποντας στο δεκαδικό — είναι ο πιο γρήγορος τρόπος να πιάσεις λάθος κρατούμενο.` };
  } });

add({ id: "twos", unit: "p10-intro", title: "Συμπλήρωμα ως προς 2 (8 bits)", desc: "Αρνητικοί ακέραιοι: κωδικοποίηση και αποκωδικοποίηση",
  make() {
    const n = R(1, 128);
    const code = ((256 - n) & 255).toString(2).padStart(8, "0");
    if (Math.random() < 0.5) {
      const pos = n === 128 ? "—" : n.toString(2).padStart(8, "0");
      const inv = n === 128 ? "—" : [...pos].map(c => c === "0" ? "1" : "0").join("");
      return { type: "short", q: `Γράψε τον **−${n}** σε συμπλήρωμα ως προς 2 με **8 bits**.`, a: [code],
        pre: "Για −x σε συμπλήρωμα ως προς 2: γράφεις το **+x** σε n bits, **αντιστρέφεις** όλα τα bits (συμπλήρωμα ως προς 1) και **προσθέτεις 1**.",
        why: n === 128 ? `Το −128 είναι το μικρότερο δυνατό σε 8 bits (εύρος −128…127) και κωδικοποιείται ως **10000000**.` : `+${n} = ${pos} → αντιστροφή = ${inv} → +1 = **${code}**. Το αριστερότερο bit 1 δείχνει αρνητικό.` };
    }
    return { type: "short", q: `Ποιον δεκαδικό ακέραιο παριστάνει το **${code}** σε συμπλήρωμα ως προς 2 (8 bits);`, a: [String(-n)],
      pre: "Αν το MSB είναι 1 ο αριθμός είναι αρνητικός. Τιμή = −2⁷·b₇ + Σ bᵢ·2ⁱ, ή: αντιστρέφεις, προσθέτεις 1 και βάζεις μείον.",
      why: `MSB = 1 → αρνητικός. Τιμή = −128 + ${parseInt(code.slice(1), 2)} = **−${n}**.` };
  } });

add({ id: "units", unit: "p10-intro", title: "Μονάδες πληροφορίας", desc: "bit, byte, KB, MB, GB (δυνάμεις του 2)",
  make() {
    const k = P([["KB", 10], ["MB", 20], ["GB", 30]]), m = R(2, 64);
    if (Math.random() < 0.5) {
      const v = m * 2 ** k[1];
      return { type: "short", q: `Πόσα **bytes** είναι ${m} ${k[0]}; (1 ${k[0]} = 2^${k[1]} bytes)`, a: [String(v)], pre: "1 KB = 2¹⁰ = 1024 bytes, 1 MB = 2²⁰, 1 GB = 2³⁰ bytes. 1 byte = 8 bits.", why: `${m} · 2^${k[1]} = ${m} · ${2 ** k[1]} = **${v}** bytes.` };
    }
    const bits = R(3, 12);
    return { type: "short", q: `Πόσους **διαφορετικούς** συνδυασμούς (τιμές) μπορούμε να παραστήσουμε με ${bits} bits;`, a: [String(2 ** bits)], pre: "Κάθε bit διπλασιάζει τις δυνατότητες: n bits → **2ⁿ** συνδυασμοί.", why: `2^${bits} = **${2 ** bits}**.` };
  } });

function randExpr(depth) {
  const v = P(["A", "B", "C"]);
  if (depth <= 0 || Math.random() < 0.25) return Math.random() < 0.25 ? { op: "NOT", a: { v } } : { v };
  const op = P(["AND", "OR", "XOR", "AND", "OR"]);
  return { op, a: randExpr(depth - 1), b: randExpr(depth - 1) };
}
function evalE(e, env) { if (e.v) return env[e.v]; if (e.op === "NOT") return 1 - evalE(e.a, env); const x = evalE(e.a, env), y = evalE(e.b, env); return e.op === "AND" ? x & y : e.op === "OR" ? x | y : x ^ y; }
function showE(e, top = true) { if (e.v) return e.v; if (e.op === "NOT") return e.a.v ? e.a.v + "'" : "(" + showE(e.a, false) + ")'"; const s = `${showE(e.a, false)} ${e.op === "AND" ? "·" : e.op === "OR" ? "+" : "⊕"} ${showE(e.b, false)}`; return top ? s : `(${s})`; }
add({ id: "bool", unit: "p10-intro", title: "Τιμή λογικής έκφρασης", desc: "Άλγεβρα Boole: AND (·), OR (+), NOT ('), XOR (⊕)",
  make() {
    let e; do { e = randExpr(2); } while (!e.op || e.op === "NOT");
    const env = { A: R(0, 1), B: R(0, 1), C: R(0, 1) };
    const r = evalE(e, env);
    return { type: "short", q: `Για **A=${env.A}, B=${env.B}, C=${env.C}**, πόσο κάνει η έκφραση\n\n**F = ${showE(e)}** ;`, a: [String(r)],
      pre: "AND (·) = 1 μόνο αν όλα 1. OR (+) = 1 αν τουλάχιστον ένα 1. NOT (') αντιστρέφει. XOR (⊕) = 1 αν οι είσοδοι **διαφέρουν**. Υπολογίζεις πρώτα τις παρενθέσεις.",
      why: `Αντικαθιστούμε τις τιμές και υπολογίζουμε από μέσα προς τα έξω: F = **${r}**.` };
  } });

/* ============================== ΠΛΗ10 · Τόμος 2 ============================== */
add({ id: "rec", unit: "p10-tech", title: "Ιχνηλάτηση αναδρομής", desc: "Τιμή αναδρομικής συνάρτησης για τυχαίο n",
  make() {
    const kind = R(0, 3);
    let code, f, n;
    if (kind === 0) { const k = R(1, 3); n = R(3, 6); code = `int f(int n) {\n  if (n <= 1) return 1;\n  return ${k} * n + f(n - 1);\n}`; f = x => x <= 1 ? 1 : k * x + f(x - 1); }
    else if (kind === 1) { n = R(4, 8); code = `int f(int n) {\n  if (n <= 1) return n;\n  return f(n - 1) + f(n - 2);\n}`; f = x => x <= 1 ? x : f(x - 1) + f(x - 2); }
    else if (kind === 2) { n = R(10, 99) * 10 + R(1, 9); code = `int f(int n) {\n  if (n < 10) return n;\n  return n % 10 + f(n / 10);\n}`; f = x => x < 10 ? x : x % 10 + f(Math.floor(x / 10)); }
    else { const b = R(2, 3); n = R(2, 5); code = `int f(int n) {\n  if (n == 0) return 1;\n  return ${b} * f(n - 1);\n}`; f = x => x === 0 ? 1 : b * f(x - 1); }
    const r = f(n);
    let fig;
    if (kind !== 1) {
      const chain = []; let x = n;
      for (let i = 0; i < 8; i++) { chain.push(x); if ((kind === 2 && x < 10) || (kind === 0 && x <= 1) || (kind === 3 && x === 0)) break; x = kind === 2 ? Math.floor(x / 10) : x - 1; }
      let node = null;
      for (let i = chain.length - 1; i >= 0; i--) node = { v: `f(${chain[i]})`, s: `=${f(chain[i])}`, c: node ? [node] : [] };
      fig = { t: "tree", box: true, after: true, title: "Κλήσεις και επιστροφές", tree: node, cap: "Κάθε κλήση περιμένει την από κάτω. Οι τιμές (πάνω δεξιά) επιστρέφουν από τη **βάση** προς τα πάνω." };
    }
    const trace = []; if (kind !== 1) { let x = n; const parts = []; for (let i = 0; i < 6; i++) { parts.push(`f(${x})`); if ((kind === 2 && x < 10) || (kind !== 2 && x <= (kind === 3 ? 0 : 1))) break; x = kind === 2 ? Math.floor(x / 10) : x - 1; } trace.push(parts.join(" → ")); }
    return { type: "short", q: `Τι επιστρέφει η κλήση **f(${n})**;\n\n\`\`\`c\n${code}\n\`\`\``, a: [String(r)],
      pre: "Σε κάθε αναδρομή: βρες τη **συνθήκη τερματισμού** (βάση), μετά «ξετύλιξε» τις κλήσεις μέχρι τη βάση και ανέβα προς τα πάνω αθροίζοντας/πολλαπλασιάζοντας.",
      why: `${trace.length ? "Αλυσίδα κλήσεων: " + trace[0] + ". " : ""}Υπολογίζοντας από τη βάση προς τα πάνω: f(${n}) = **${r}**.`, fig };
  } });

add({ id: "loops", unit: "p10-tech", title: "Πόσες φορές εκτελείται;", desc: "Μέτρηση επαναλήψεων και πολυπλοκότητα βρόχων",
  make() {
    if (Math.random() < 0.5) {
      const a = R(0, 5), b = a + R(5, 25), s = R(1, 4);
      const cnt = Math.max(0, Math.ceil((b - a) / s));
      return { type: "short", q: `Πόσες φορές εκτελείται το σώμα του βρόχου;\n\n\`\`\`c\nfor (i = ${a}; i < ${b}; i += ${s})\n    x++;\n\`\`\``, a: [String(cnt)],
        pre: "Για `for (i=a; i<b; i+=s)`: το i παίρνει a, a+s, a+2s, … όσο είναι **< b**. Πλήθος = ⌈(b−a)/s⌉.", why: `Τιμές του i: ${[...Array(Math.min(cnt, 8))].map((_, k) => a + k * s).join(", ")}${cnt > 8 ? ", …" : ""} → **${cnt}** επαναλήψεις.` };
    }
    const n = P([8, 16, 32, 64, 128]);
    const cnt = Math.log2(n);
    return { type: "short", q: `Πόσες φορές εκτελείται το σώμα;\n\n\`\`\`c\ni = ${n};\nwhile (i > 1) {\n    i = i / 2;\n    x++;\n}\n\`\`\``, a: [String(cnt)],
      pre: "Όταν η μεταβλητή **υποδιπλασιάζεται** σε κάθε βήμα, ο βρόχος τρέχει περίπου log₂n φορές → πολυπλοκότητα **O(log n)**.", why: `${n} → ${[...Array(cnt)].map((_, k) => n / 2 ** (k + 1)).join(" → ")}: **${cnt}** επαναλήψεις (= log₂${n}).` };
  } });

/* ============================== ΠΛΗ10 · Τόμος 3 ============================== */
function sortPass(kind, arr, k) {
  const a = arr.slice(), n = a.length, log = [];
  if (kind === "bubble") { for (let p = 0; p < k; p++) { for (let j = 0; j < n - 1 - p; j++) if (a[j] > a[j + 1]) [a[j], a[j + 1]] = [a[j + 1], a[j]]; log.push(a.join(", ")); } }
  if (kind === "selection") { for (let p = 0; p < k; p++) { let m = p; for (let j = p + 1; j < n; j++) if (a[j] < a[m]) m = j; [a[p], a[m]] = [a[m], a[p]]; log.push(a.join(", ")); } }
  if (kind === "insertion") { for (let p = 1; p <= k; p++) { const x = a[p]; let j = p - 1; while (j >= 0 && a[j] > x) { a[j + 1] = a[j]; j--; } a[j + 1] = x; log.push(a.join(", ")); } }
  return { a, log };
}
add({ id: "sort", unit: "p10-ds", title: "Ταξινόμηση βήμα-βήμα", desc: "Bubble / Selection / Insertion: ο πίνακας μετά από k περάσματα",
  make() {
    const kind = P(["bubble", "selection", "insertion"]);
    const arr = uniq(7, 1, 60), k = R(1, kind === "insertion" ? 3 : 2);
    const { a, log } = sortPass(kind, arr, k);
    const name = { bubble: "φυσαλίδας (bubble sort)", selection: "επιλογής (selection sort)", insertion: "εισαγωγής (insertion sort)" }[kind];
    const pre = { bubble: "Bubble sort: σε κάθε πέρασμα συγκρίνεις **διαδοχικά ζεύγη** από αριστερά και τα ανταλλάσσεις αν είναι ανάποδα. Μετά το 1ο πέρασμα το **μέγιστο** είναι στο τέλος.",
      selection: "Selection sort: στο πέρασμα p βρίσκεις το **ελάχιστο** του υπόλοιπου πίνακα (θέσεις p…n−1) και το **ανταλλάσσεις** με τη θέση p.",
      insertion: "Insertion sort: στο βήμα p παίρνεις το στοιχείο της θέσης p και το **εισάγεις** στη σωστή θέση του ήδη ταξινομημένου αριστερού τμήματος, σπρώχνοντας δεξιά τα μεγαλύτερα." }[kind];
    return { type: "short", q: `Ταξινόμηση ${name}, αύξουσα. Αρχικός πίνακας:\n\n**[${arr.join(", ")}]**\n\nΠώς είναι ο πίνακας μετά από **${k}** ${kind === "insertion" ? (k === 1 ? "βήμα" : "βήματα") : (k === 1 ? "πέρασμα" : "περάσματα")}; (γράψε τους αριθμούς με κόμμα)`,
      a: [a.join(", "), a.join(","), a.join(" ")], pre, why: log.map((l, i) => `- Μετά το ${i + 1}ο: [${l}]`).join("\n"),
      fig: { t: "arr", after: true, idx: 0, cw: 30, title: "Τα περάσματα", rows: [{ l: "αρχή", v: arr }, ...log.map((l, i) => {
        const p = i + 1, n = arr.length;
        const ok = kind === "bubble" ? [...Array(p)].map((_, j) => n - 1 - j) : kind === "selection" ? [...Array(p)].map((_, j) => j) : [];
        return { l: `${p}ο`, v: l.split(", ").map(Number), ok, hl: kind === "insertion" ? [...Array(p + 1)].map((_, j) => j) : [] };
      })], cap: kind === "insertion" ? "Φωτεινό: το ταξινομημένο αριστερό τμήμα μετά από κάθε βήμα." : kind === "bubble" ? "Πράσινο: όσα έχουν πάρει την τελική τους θέση στο τέλος." : "Πράσινο: το ταξινομημένο αρχικό τμήμα." } };
  } });

add({ id: "bsearch", unit: "p10-ds", title: "Δυαδική αναζήτηση", desc: "Ποια στοιχεία εξετάζονται (mid) μέχρι να βρεθεί/αποτύχει",
  make() {
    const arr = uniq(15, 1, 99).sort((x, y) => x - y);
    const present = Math.random() < 0.7;
    let key = present ? P(arr) : R(1, 99); while (!present && arr.includes(key)) key = R(1, 99);
    let lo = 0, hi = arr.length - 1; const mids = [], rows = [];
    while (lo <= hi) {
      const m = Math.floor((lo + hi) / 2); mids.push(arr[m]);
      const pp = {}; for (const [nm, i] of [["low", lo], ["mid", m], ["high", hi]]) { const k = Object.keys(pp).find(x => pp[x] === i); if (k) { pp[k + "," + nm] = i; delete pp[k]; } else pp[nm] = i; }
      const found = arr[m] === key;
      rows.push({ v: arr, p: pp, hl: found ? [] : [m], ok: found ? [m] : [], dim: arr.map((_, i) => i).filter(i => i < lo || i > hi),
        c: `low = ${lo}, high = ${hi} → mid = ${m}, a[${m}] = ${arr[m]}. ` + (found ? "**Βρέθηκε.**" : arr[m] < key ? `${key} > ${arr[m]} → low = ${m + 1}.` : `${key} < ${arr[m]} → high = ${m - 1}.`) });
      if (found) break; if (arr[m] < key) lo = m + 1; else hi = m - 1;
    }
    if (!rows[rows.length - 1].ok.length) rows.push({ v: arr, dim: arr.map((_, i) => i), c: `low = ${lo} > high = ${hi} → **δεν βρέθηκε**.` });
    return { type: "short", q: `Δυαδική αναζήτηση του **${key}** στον ταξινομημένο πίνακα (θέσεις 0–14):\n\n[${arr.join(", ")}]\n\nΠοια **στοιχεία** συγκρίνονται με τη σειρά; (mid = ⌊(low+high)/2⌋, γράψε τις τιμές με κόμμα)`,
      a: [mids.join(", "), mids.join(",")], pre: "Δυαδική αναζήτηση: συγκρίνεις με το **μεσαίο** στοιχείο. Αν το κλειδί είναι μικρότερο ψάχνεις αριστερά (high = mid−1), αλλιώς δεξιά (low = mid+1). Θέλει **ταξινομημένο** πίνακα, κόστος O(log n).",
      why: `Συγκρίσεις: ${mids.join(" → ")}. ${present ? "Βρέθηκε" : "Δεν βρέθηκε (low > high)"} μετά από **${mids.length}** συγκρίσεις.`,
      fig: { t: "arr", after: true, step: true, idx: 0, cw: 26, title: "Βήμα-βήμα", rows } };
  } });

add({ id: "stackq", unit: "p10-ds", title: "Στοίβα & ουρά", desc: "Ακολουθία push/pop ή enqueue/dequeue",
  make() {
    const isStack = Math.random() < 0.5, ops = [], st = [], out = [], states = [{ v: [], c: `Αρχικά άδεια ${isStack ? "στοίβα" : "ουρά"}.` }];
    let v = R(1, 5);
    const rem = () => { const x = isStack ? st.pop() : st.shift(); out.push(x); ops.push(isStack ? "pop()" : "dequeue()"); states.push({ v: st.slice(), op: ops[ops.length - 1], out: x, hl: [], c: `${ops[ops.length - 1]} → βγαίνει το **${x}** (${isStack ? "κορυφή" : "εμπρός"}). Εξαγωγές ως τώρα: ${out.join(", ")}.` }); };
    for (let i = 0; i < 9; i++) {
      if (st.length && Math.random() < 0.4) rem();
      else { v += R(1, 4); st.push(v); ops.push(isStack ? `push(${v})` : `enqueue(${v})`); states.push({ v: st.slice(), op: ops[ops.length - 1], hl: [st.length - 1], c: `${ops[ops.length - 1]}: μπαίνει ${isStack ? "στην κορυφή" : "στο πίσω μέρος"}.` }); }
    }
    if (!out.length) rem();
    return { type: "short", q: `Σε αρχικά άδεια **${isStack ? "στοίβα" : "ουρά"}** εκτελούνται:\n\n\`${ops.join("; ")}\`\n\nΠοιες τιμές εξάγονται, με τη σειρά; (με κόμμα)`,
      a: [out.join(", "), out.join(",")], pre: isStack ? "Στοίβα = **LIFO** (Last In, First Out): το pop βγάζει το στοιχείο που μπήκε **τελευταίο** (κορυφή)." : "Ουρά = **FIFO** (First In, First Out): το dequeue βγάζει το στοιχείο που μπήκε **πρώτο** (εμπρός).",
      why: `Εξαγωγές: **${out.join(", ")}**. Στο τέλος ${isStack ? "η στοίβα (από κάτω προς κορυφή)" : "η ουρά (από εμπρός προς πίσω)"} περιέχει: [${st.join(", ")}].`,
      fig: { t: "stack", after: true, kind: isStack ? "stack" : "queue", title: "Βήμα-βήμα", states } };
  } });

function bstInsert(root, k) { if (!root) return { k, l: null, r: null }; if (k < root.k) root.l = bstInsert(root.l, k); else root.r = bstInsert(root.r, k); return root; }
const pre = t => t ? [t.k, ...pre(t.l), ...pre(t.r)] : [], ino = t => t ? [...ino(t.l), t.k, ...ino(t.r)] : [], post = t => t ? [...post(t.l), ...post(t.r), t.k] : [];
const height = t => t ? 1 + Math.max(height(t.l), height(t.r)) : 0;
add({ id: "bst", unit: "p10-ds", title: "Δέντρο δυαδικής αναζήτησης", desc: "Εισαγωγές και διασχίσεις preorder / inorder / postorder",
  make() {
    const keys = uniq(7, 1, 60); let t = null; for (const k of keys) t = bstInsert(t, k);
    const kind = P(["pre", "post", "pre", "post", "in", "h"]);
    const tf = toArr(t);
    if (kind === "h") return { type: "short", q: `Εισάγουμε με τη σειρά σε κενό ΔΔΑ: **${keys.join(", ")}**. Πόσα **επίπεδα** έχει το δέντρο (η ρίζα είναι επίπεδο 1);`, a: [String(height(t))], pre: "Στο ΔΔΑ κάθε νέο κλειδί κατεβαίνει από τη ρίζα: **αριστερά αν είναι μικρότερο**, δεξιά αν είναι μεγαλύτερο, μέχρι να βρει κενή θέση.", why: `Το μακρύτερο μονοπάτι από τη ρίζα (${keys[0]}) έχει **${height(t)}** κόμβους.`,
      fig: { t: "tree", after: true, title: "Το δέντρο", tree: tf } };
    const res = { pre: pre(t), in: ino(t), post: post(t) }[kind];
    const nm = { pre: "προδιάταξη (preorder: ρίζα–αριστερά–δεξιά)", in: "ενδοδιάταξη (inorder: αριστερά–ρίζα–δεξιά)", post: "μεταδιάταξη (postorder: αριστερά–δεξιά–ρίζα)" }[kind];
    return { type: "short", q: `Εισάγουμε με τη σειρά σε αρχικά κενό ΔΔΑ: **${keys.join(", ")}**.\n\nΔώσε τη διάσχιση σε **${nm}** (με κόμμα).`, a: [res.join(", "), res.join(",")],
      pre: "Χτίσε πρώτα το δέντρο (μικρότερα αριστερά, μεγαλύτερα δεξιά). Η **inorder** ενός ΔΔΑ δίνει πάντα τα κλειδιά **ταξινομημένα**.",
      why: `Ρίζα το ${keys[0]}. Preorder: ${pre(t).join(", ")} · Inorder: ${ino(t).join(", ")} · Postorder: ${post(t).join(", ")}.`,
      fig: { t: "tree", after: true, title: "Διάσχιση βήμα-βήμα", tree: tf, steps: [{ cap: "Το δέντρο μετά τις εισαγωγές. Πάτα ▸ για τη σειρά επίσκεψης." }, ...res.map((_, i) => ({ hot: res.slice(0, i + 1).map(String), cap: res.slice(0, i + 1).join(", ") }))] } };
  } });

add({ id: "heap", unit: "p10-ds", title: "Σωρός μεγίστων (max-heap)", desc: "Εισαγωγές με ανάδυση (sift-up) σε πίνακα",
  make() {
    const keys = uniq(6, 1, 50), h = [], hs = [];
    for (const k of keys) {
      h.push(k); let i = h.length - 1; const sw = [];
      while (i > 0) { const p = Math.floor((i - 1) / 2); if (h[p] >= h[i]) break; [h[p], h[i]] = [h[i], h[p]]; sw.push(h[i]); i = p; }
      hs.push({ tree: { heap: h.slice() }, hot: ["i" + i], cap: `Εισαγωγή **${k}**` + (sw.length ? `: ανεβαίνει με ${sw.length} ανταλλαγ${sw.length === 1 ? "ή" : "ές"} (με ${sw.join(", ")}).` : ": μένει στο τέλος (ο γονέας είναι μεγαλύτερος).") });
    }
    return { type: "short", q: `Εισάγουμε με τη σειρά σε κενό **σωρό μεγίστων** (αναπαράσταση με πίνακα): **${keys.join(", ")}**.\n\nΠοιο είναι το περιεχόμενο του πίνακα στο τέλος; (με κόμμα)`, a: [h.join(", "), h.join(",")],
      pre: "Max-heap: πλήρες δυαδικό δέντρο όπου κάθε γονέας ≥ παιδιά. Νέο στοιχείο μπαίνει **στο τέλος** και ανεβαίνει (ανταλλαγή με τον γονέα i→⌊(i−1)/2⌋) όσο είναι μεγαλύτερο.",
      why: `Τελικός πίνακας: **[${h.join(", ")}]** — η ρίζα (θέση 0) είναι το μέγιστο ${Math.max(...keys)}.`,
      fig: { t: "tree", after: true, title: "Βήμα-βήμα", tree: { heap: h.slice() }, arr: true, idx: true, steps: hs } };
  } });

add({ id: "addr", unit: "p10-ds", title: "Διεύθυνση στοιχείου 2Δ πίνακα", desc: "Αποθήκευση κατά γραμμές (row-major)",
  make() {
    const rows = R(3, 8), cols = R(3, 10), base = R(10, 90) * 100, sz = P([1, 2, 4, 8]);
    const i = R(0, rows - 1), j = R(0, cols - 1), adr = base + (i * cols + j) * sz;
    return { type: "short", q: `Πίνακας A[${rows}][${cols}] αποθηκεύεται **κατά γραμμές** από τη διεύθυνση **${base}**. Κάθε στοιχείο πιάνει **${sz}** byte${sz > 1 ? "s" : ""}. Ποια είναι η διεύθυνση του **A[${i}][${j}]** (δείκτες από 0);`, a: [String(adr)],
      pre: "Row-major: πριν από το A[i][j] υπάρχουν **i ολόκληρες γραμμές** (i·στήλες στοιχεία) και **j** στοιχεία της γραμμής του. Διεύθυνση = βάση + (i·στήλες + j)·μέγεθος.",
      why: `${base} + (${i}·${cols} + ${j})·${sz} = ${base} + ${(i * cols + j)}·${sz} = **${adr}**.` };
  } });

/* ============================== ΠΛΗ10 · Τόμος 4 (C) ============================== */
add({ id: "cexpr", unit: "p10-c", title: "Τιμή έκφρασης σε C", desc: "Ακέραια διαίρεση, %, προτεραιότητα, ++, λογικοί τελεστές",
  make() {
    const a = R(5, 30), b = R(2, 9), c = R(1, 6);
    const forms = [
      [`a / b * c`, Math.trunc(a / b) * c, "Ακέραια διαίρεση: το `/` μεταξύ int **κόβει** το δεκαδικό μέρος. `/` και `*` έχουν ίδια προτεραιότητα και εκτελούνται από **αριστερά προς τα δεξιά**."],
      [`a % b + c`, (a % b) + c, "Το `%` δίνει το **υπόλοιπο** της ακέραιας διαίρεσης και έχει την ίδια προτεραιότητα με `*` και `/` (μεγαλύτερη από `+`)."],
      [`a + b * c`, a + b * c, "Ο πολλαπλασιασμός εκτελείται **πριν** από την πρόσθεση (όπως στα μαθηματικά)."],
      [`(a + b) / c`, Math.trunc((a + b) / c), "Οι παρενθέσεις εκτελούνται πρώτα· η διαίρεση int/int είναι ακέραια."],
      [`a > b && b > c`, (a > b && b > c) ? 1 : 0, "Οι σχεσιακοί τελεστές δίνουν **1 (αληθές) ή 0 (ψευδές)**. Το `&&` είναι 1 μόνο αν και τα δύο σκέλη είναι αληθή."],
      [`a % 2 == 0 || c > b`, (a % 2 === 0 || c > b) ? 1 : 0, "Το `||` είναι 1 αν τουλάχιστον ένα σκέλος είναι αληθές. Το `==` έχει μεγαλύτερη προτεραιότητα από το `||`."],
      [`!(a < b)`, !(a < b) ? 1 : 0, "Το `!` αντιστρέφει: !0 = 1, !(οτιδήποτε μη μηδενικό) = 0."],
      [`a - b - c`, a - b - c, "Η αφαίρεση είναι **αριστερά προσεταιριστική**: (a − b) − c."],
    ];
    const [e, v, pre] = P(forms);
    return { type: "short", q: `Με \`int a = ${a}, b = ${b}, c = ${c};\` ποια είναι η τιμή της έκφρασης\n\n\`${e}\` ;`, a: [String(v)], pre,
      why: `Αντικαθιστώντας: \`${e.replace(/\ba\b/g, a).replace(/\bb\b/g, b).replace(/\bc\b/g, c)}\` = **${v}**.` };
  } });

add({ id: "cincr", unit: "p10-c", title: "Τελεστές ++ / -- και ανάθεσης", desc: "Προθεματικό vs μεταθεματικό, +=, *=",
  make() {
    const x0 = R(2, 9), k = R(2, 4);
    const forms = [
      [`y = x++ + ${k};`, x0 + k, x0 + 1, "`x++` (μεταθεματικός): η έκφραση χρησιμοποιεί την **παλιά** τιμή του x και μετά το x αυξάνεται."],
      [`y = ++x + ${k};`, x0 + 1 + k, x0 + 1, "`++x` (προθεματικός): πρώτα αυξάνεται το x και η έκφραση χρησιμοποιεί τη **νέα** τιμή."],
      [`y = x-- * ${k};`, x0 * k, x0 - 1, "`x--`: χρησιμοποιείται η παλιά τιμή, μετά μειώνεται."],
      [`x += ${k}; y = x * 2;`, (x0 + k) * 2, x0 + k, "`x += k` σημαίνει `x = x + k`."],
      [`x *= ${k} + 1; y = x;`, x0 * (k + 1), x0 * (k + 1), "`x *= k + 1` σημαίνει `x = x * (k + 1)` — το δεξί μέλος υπολογίζεται **ολόκληρο** πρώτα."],
    ];
    const [code, y, x, pre] = P(forms);
    const askX = Math.random() < 0.35;
    return { type: "fill", q: `\`\`\`c\nint x = ${x0}, y;\n${code}\n\`\`\`\nΜετά την εκτέλεση: y = {{#0}} και x = {{#1}}`, b: [[String(y)], [String(x)]], pre,
      why: `y = **${y}**, x = **${x}**.${askX ? "" : ""}` };
  } });

add({ id: "cloop", unit: "p10-c", title: "Έξοδος βρόχου σε C", desc: "for / while με άθροισμα, γινόμενο, συνθήκες",
  make() {
    const a = R(1, 4), b = a + R(3, 7), s = R(1, 2);
    const kind = R(0, 3);
    let code, out, pre;
    if (kind === 0) { code = `int i, s = 0;\nfor (i = ${a}; i <= ${b}; i += ${s})\n    s += i;\nprintf("%d", s);`; let t = 0; for (let i = a; i <= b; i += s) t += i; out = t; pre = "Γράψε σε πίνακα τις τιμές του i σε κάθε επανάληψη και το s μετά από κάθε πρόσθεση. Πρόσεξε το `<=`."; }
    else if (kind === 1) { const n = R(3, 6); code = `int i = 1, p = 1;\nwhile (i <= ${n}) {\n    p = p * i;\n    i++;\n}\nprintf("%d", p);`; let p = 1; for (let i = 1; i <= n; i++) p *= i; out = p; pre = "Ο βρόχος υπολογίζει γινόμενο. Ιχνηλάτησε p και i ανά επανάληψη."; }
    else if (kind === 2) { const m = R(2, 4); code = `int i, c = 0;\nfor (i = ${a}; i < ${b + 5}; i++)\n    if (i % ${m} == 0) c++;\nprintf("%d", c);`; let c = 0; for (let i = a; i < b + 5; i++) if (i % m === 0) c++; out = c; pre = `Μετράει πόσα i στο διάστημα είναι πολλαπλάσια του ${m} (i % ${m} == 0). Πρόσεξε το \`<\`.`; }
    else { const n = R(10, 60); code = `int n = ${n}, d = 0;\ndo {\n    d++;\n    n = n / 2;\n} while (n > 0);\nprintf("%d", d);`; let x = n, d = 0; do { d++; x = Math.floor(x / 2); } while (x > 0); out = d; pre = "Το do-while εκτελεί το σώμα **τουλάχιστον μία φορά** και ελέγχει τη συνθήκη στο τέλος. Εδώ μετράει πόσα bits χρειάζεται ο αριθμός."; }
    return { type: "short", q: `Τι τυπώνει;\n\n\`\`\`c\n${code}\n\`\`\``, a: [String(out)], pre, why: `Με ιχνηλάτηση βήμα-βήμα το αποτέλεσμα είναι **${out}**.` };
  } });

add({ id: "carr", unit: "p10-c", title: "Πίνακες & δείκτες σε C", desc: "Δείκτες, *p, p+i, τιμές πίνακα μετά από επεξεργασία",
  make() {
    const v = uniq(5, 1, 30);
    const kind = R(0, 2);
    if (kind === 0) {
      const i = R(0, 3), j = R(1, 4 - i);
      return { type: "short", q: `\`\`\`c\nint a[5] = {${v.join(", ")}};\nint *p = a + ${i};\nprintf("%d", *(p + ${j}));\n\`\`\`\nΤι τυπώνεται;`, a: [String(v[i + j])],
        pre: "Το όνομα του πίνακα είναι διεύθυνση του **a[0]**. Το `p + k` δείχνει **k στοιχεία** μετά (όχι k bytes) και `*(p+k)` είναι η τιμή εκεί.", why: `p = &a[${i}], άρα *(p+${j}) = a[${i + j}] = **${v[i + j]}**.` };
    }
    if (kind === 1) {
      const out = v.slice(); for (let i = 0; i < 4; i++) out[i + 1] += out[i];
      const k = R(1, 4);
      return { type: "short", q: `\`\`\`c\nint a[5] = {${v.join(", ")}}, i;\nfor (i = 0; i < 4; i++)\n    a[i + 1] += a[i];\nprintf("%d", a[${k}]);\n\`\`\`\nΤι τυπώνεται;`, a: [String(out[k])],
        pre: "Κάθε βήμα χρησιμοποιεί την **ήδη ενημερωμένη** τιμή του a[i] — ο βρόχος φτιάχνει μερικά αθροίσματα.", why: `Μετά τον βρόχο: [${out.join(", ")}] → a[${k}] = **${out[k]}**.` };
    }
    const x = R(2, 20), y = R(2, 20);
    return { type: "fill", q: `\`\`\`c\nvoid f(int *p, int q) { *p = *p + q; q = 0; }\n...\nint x = ${x}, y = ${y};\nf(&x, y);\n\`\`\`\nΜετά την κλήση: x = {{#0}}, y = {{#1}}`, b: [[String(x + y)], [String(y)]],
      pre: "Πέρασμα **με αναφορά** (δείκτης) αλλάζει τη μεταβλητή του καλούντος. Πέρασμα **με τιμή** δίνει αντίγραφο — αλλαγές μέσα στη συνάρτηση δεν φαίνονται έξω.", why: `x αλλάζει μέσω *p: ${x}+${y} = **${x + y}**. Το y πέρασε με τιμή, μένει **${y}**.` };
  } });

/* ============================== ΠΛΗ11 · Τεχνολογία Λογισμικού ============================== */
add({ id: "ddpcount", unit: "p11-tl", title: "Μέτρηση μονάδων ΔΔΠ", desc: "Από στοιχεία ΔΡΔ στο πλήθος Exec / Calc / Get / Put",
  make() {
    const n = R(3, 7), gi = R(2, 6), po = R(1, 5);
    const ask = P(["total", "calc", "exec"]);
    const total = 2 * n + gi + po;
    const q = `Ένα ΔΡΔ επιπέδου 1 έχει **${n}** μετασχηματισμούς (απλός ΚΜ). Υπάρχουν **${gi}** ροές δεδομένων προς μετασχηματισμούς από πηγές ή αποθήκες και **${po}** ροές από μετασχηματισμούς προς αποδέκτες ή αποθήκες. ` +
      (ask === "total" ? "Πόσες **συνολικά** μονάδες θα έχει το ΔΔΠ;" : ask === "calc" ? "Πόσες μονάδες **Calc** θα έχει το ΔΔΠ;" : "Πόσες μονάδες **Exec** θα έχει το ΔΔΠ;");
    const a = ask === "total" ? total : n;
    return { type: "short", q, a: [String(a)], pre: "Κανόνας ΕΑΠ: για κάθε μετασχηματισμό μία **Exec** και μία **Calc**· μία **Get** για κάθε είσοδο από πηγή/αποθήκη· μία **Put** για κάθε έξοδο προς αποδέκτη/αποθήκη. Δεδομένα μεταξύ μετασχηματισμών **δεν** δίνουν Get/Put.",
      why: `Exec = Calc = ${n}, Get = ${gi}, Put = ${po}. Σύνολο = 2·${n} + ${gi} + ${po} = ${total}. Απάντηση: **${a}**.` };
  } });

/* ============================== ΠΛΗ11 · Βάσεις Δεδομένων ============================== */
const NAMES = ["Άννα", "Νίκος", "Ελένη", "Γιώργος", "Μαρία", "Κώστας", "Δήμητρα", "Πέτρος", "Σοφία", "Λευτέρης"];
const CITIES = ["Αθήνα", "Πάτρα", "Βόλος", "Χανιά"];
function randTable() {
  const rows = sample(NAMES, R(6, 8)).map((nm, i) => ({ id: i + 1, name: nm, city: P(CITIES), age: R(19, 45), credits: R(0, 12) * 5 }));
  const md = `| id | name | city | age | credits |\n|---|---|---|---|---|\n` + rows.map(r => `| ${r.id} | ${r.name} | ${r.city} | ${r.age} | ${r.credits} |`).join("\n");
  return { rows, md };
}
add({ id: "sql", unit: "p11-db", title: "Αποτέλεσμα ερωτήματος SQL", desc: "WHERE, COUNT, SUM, AVG, GROUP BY, HAVING σε τυχαίο πίνακα",
  make() {
    const { rows, md } = randTable();
    const k = R(22, 35), c = P(CITIES.filter(x => rows.some(r => r.city === x)));
    const forms = [
      [`SELECT COUNT(*) FROM STUDENT WHERE age > ${k};`, rows.filter(r => r.age > k).length, "Το `WHERE` κρατά τις γραμμές που ικανοποιούν τη συνθήκη· το `COUNT(*)` τις μετράει."],
      [`SELECT SUM(credits) FROM STUDENT WHERE city = '${c}';`, rows.filter(r => r.city === c).reduce((s, r) => s + r.credits, 0), "Πρώτα φιλτράρει το `WHERE`, μετά η `SUM` αθροίζει τη στήλη στις γραμμές που έμειναν."],
      [`SELECT COUNT(DISTINCT city) FROM STUDENT;`, new Set(rows.map(r => r.city)).size, "`COUNT(DISTINCT x)` μετράει τις **διαφορετικές** τιμές της στήλης."],
      [`SELECT MAX(age) - MIN(age) FROM STUDENT;`, Math.max(...rows.map(r => r.age)) - Math.min(...rows.map(r => r.age)), "Οι συναρτήσεις συνάθροισης επιστρέφουν **μία** τιμή για όλο τον πίνακα (χωρίς GROUP BY)."],
      [`SELECT city FROM STUDENT GROUP BY city HAVING COUNT(*) >= 2;`, null, "`GROUP BY` φτιάχνει μία ομάδα ανά τιμή· το `HAVING` φιλτράρει **ομάδες** (το WHERE φιλτράρει γραμμές)."],
    ];
    let [q, v, pre] = P(forms);
    if (v === null) {
      const cnt = {}; rows.forEach(r => cnt[r.city] = (cnt[r.city] || 0) + 1);
      v = Object.keys(cnt).filter(x => cnt[x] >= 2).length;
      q = q.replace("SELECT city", "SELECT city") ;
      return { type: "short", q: `Πίνακας **STUDENT**:\n\n${md}\n\nΠόσες γραμμές επιστρέφει το ερώτημα;\n\n\`${q}\``, a: [String(v)], pre,
        why: `Πλήθος ανά πόλη: ${Object.entries(cnt).map(([x, n]) => `${x}=${n}`).join(", ")}. Με ≥ 2: **${v}** γραμμές.` };
    }
    return { type: "short", q: `Πίνακας **STUDENT**:\n\n${md}\n\nΠοια τιμή επιστρέφει το ερώτημα;\n\n\`${q}\``, a: [String(v)], pre, why: `Υπολογίζοντας στις σχετικές γραμμές: **${v}**.` };
  } });

add({ id: "ra", unit: "p11-db", title: "Σχεσιακή άλγεβρα: πλήθος πλειάδων", desc: "σ (επιλογή), π (προβολή) — προσοχή στα διπλότυπα",
  make() {
    const { rows, md } = randTable();
    const k = R(24, 35);
    const forms = [
      [`σ<sub>age<${k}</sub>(STUDENT)`, rows.filter(r => r.age < k).length, "Η **επιλογή σ** κρατά γραμμές (οριζόντιο φιλτράρισμα) που ικανοποιούν τη συνθήκη."],
      [`π<sub>city</sub>(STUDENT)`, new Set(rows.map(r => r.city)).size, "Η **προβολή π** κρατά στήλες. Στη σχεσιακή άλγεβρα το αποτέλεσμα είναι **σύνολο**: τα διπλότυπα απαλείφονται."],
      [`π<sub>city</sub>(σ<sub>age≥${k}</sub>(STUDENT))`, new Set(rows.filter(r => r.age >= k).map(r => r.city)).size, "Πρώτα η εσωτερική σ (γραμμές), μετά η π (στήλες, χωρίς διπλότυπα)."],
    ];
    const [e, v, pre] = P(forms);
    return { type: "short", q: `Πίνακας **STUDENT**:\n\n${md}\n\nΠόσες πλειάδες έχει το αποτέλεσμα της έκφρασης **${e}** ;`, a: [String(v)], pre, why: `Το αποτέλεσμα έχει **${v}** πλειάδες.` };
  } });

function closure(X, fds) { const s = new Set(X); let ch = true; const steps = []; while (ch) { ch = false; for (const [l, r] of fds) if ([...l].every(c => s.has(c)) && ![...r].every(c => s.has(c))) { [...r].forEach(c => s.add(c)); steps.push(`${l}→${r} ⇒ {${[...s].sort().join("")}}`); ch = true; } } return { set: [...s].sort().join(""), steps }; }
function randFDs() { const at = "ABCDEF".split(""); const fds = []; const n = R(4, 5); while (fds.length < n) { const l = sample(at, R(1, 2)).sort().join(""); const r = P(at.filter(c => !l.includes(c))); if (!fds.some(f => f[0] === l && f[1] === r)) fds.push([l, r]); } return fds; }
add({ id: "closure", unit: "p11-db", title: "Κλειστότητα συνόλου γνωρισμάτων", desc: "X⁺ από συναρτησιακές εξαρτήσεις — βάση για κλειδιά & κανονικοποίηση",
  make() {
    const fds = randFDs(), X = sample("ABCDEF".split(""), R(1, 2)).sort().join("");
    const { set, steps } = closure(X, fds);
    if (Math.random() < 0.35) {
      const isKey = set.length === 6;
      return { type: "tf", q: `R(A, B, C, D, E, F) με F = { ${fds.map(f => f[0] + "→" + f[1]).join(", ")} }.\n\nΤο **{${X}}** είναι υπερκλειδί της R.`, a: isKey,
        pre: "Το X είναι **υπερκλειδί** αν η κλειστότητά του X⁺ περιέχει **όλα** τα γνωρίσματα της σχέσης.", why: `{${X}}⁺ = {${set}}${steps.length ? " (" + steps.join("; ") + ")" : ""}. ${isKey ? "Περιέχει όλα → **ναι**, υπερκλειδί." : "Δεν περιέχει όλα τα A–F → **όχι**."}` };
    }
    return { type: "short", q: `R(A, B, C, D, E, F) με F = { ${fds.map(f => f[0] + "→" + f[1]).join(", ")} }.\n\nΥπολόγισε την κλειστότητα **{${X}}⁺** (γράψε τα γράμματα, π.χ. ABD).`, a: setAnswer(set),
      pre: "Αλγόριθμος κλειστότητας: ξεκινάς με X⁺ = X. Για κάθε εξάρτηση Y→Z, αν **Y ⊆ X⁺** πρόσθεσε το Z. Επανάληψη μέχρι να μην αλλάζει τίποτα.",
      why: `Ξεκινάμε {${X}}. ${steps.length ? steps.join("; ") + "." : "Καμία εξάρτηση δεν εφαρμόζεται."} Άρα {${X}}⁺ = **{${set}}**.` };
  } });

/* ============================== ΠΛΗ11 · Λειτουργικά Συστήματα ============================== */
function schedule(alg, procs, q) {
  const ps = procs.map(p => ({ ...p, rem: p.burst, done: null, start: null }));
  let t = 0, gantt = [], ready = [], done = 0, last = null;
  const arrive = tt => ps.filter(p => p.arr <= tt && p.rem > 0);
  if (alg === "FCFS" || alg === "SJF") {
    while (done < ps.length) {
      const av = arrive(t).filter(p => p.done === null);
      if (!av.length) { t = Math.min(...ps.filter(p => p.done === null).map(p => p.arr)); continue; }
      const p = alg === "FCFS" ? av.sort((a, b) => a.arr - b.arr || a.name.localeCompare(b.name))[0] : av.sort((a, b) => a.burst - b.burst || a.arr - b.arr)[0];
      gantt.push(`${p.name}[${t}–${t + p.burst}]`); t += p.burst; p.rem = 0; p.done = t; done++;
    }
  } else if (alg === "RR") {
    const queue = []; const added = new Set();
    const enq = tt => ps.filter(p => p.arr <= tt && !added.has(p.name)).sort((a, b) => a.arr - b.arr).forEach(p => { queue.push(p); added.add(p.name); });
    enq(0);
    while (done < ps.length) {
      if (!queue.length) { t = Math.min(...ps.filter(p => !added.has(p.name)).map(p => p.arr)); enq(t); continue; }
      const p = queue.shift(); const run = Math.min(q, p.rem);
      const lastG = gantt[gantt.length - 1];
      if (lastG && lastG.startsWith(p.name + "[") && lastG.endsWith(`–${t}]`)) gantt[gantt.length - 1] = lastG.replace(`–${t}]`, `–${t + run}]`); else gantt.push(`${p.name}[${t}–${t + run}]`);
      t += run; p.rem -= run;
      enq(t);
      if (p.rem > 0) queue.push(p); else { p.done = t; done++; }
    }
  } else { // SRTF
    let cur = null, segStart = 0;
    while (done < ps.length) {
      const av = arrive(t);
      if (!av.length) { t = Math.min(...ps.filter(p => p.rem > 0).map(p => p.arr)); continue; }
      const p = av.sort((a, b) => a.rem - b.rem || a.arr - b.arr)[0];
      if (cur !== p) { if (cur) gantt.push(`${cur.name}[${segStart}–${t}]`); cur = p; segStart = t; }
      p.rem--; t++;
      if (p.rem === 0) { p.done = t; done++; gantt.push(`${p.name}[${segStart}–${t}]`); cur = null; segStart = t; }
    }
  }
  const wait = ps.map(p => p.done - p.arr - p.burst), tat = ps.map(p => p.done - p.arr);
  return { gantt, wait, tat, avgW: wait.reduce((a, b) => a + b, 0) / ps.length, avgT: tat.reduce((a, b) => a + b, 0) / ps.length, ps };
}
add({ id: "sched", unit: "p11-os", title: "Χρονοδρομολόγηση CPU", desc: "FCFS, SJF, SRTF, Round Robin: μέσος χρόνος αναμονής / διεκπεραίωσης",
  make() {
    const n = R(3, 4), names = ["P1", "P2", "P3", "P4"];
    let arr = 0; const procs = names.slice(0, n).map((nm, i) => ({ name: nm, arr: i === 0 ? 0 : (arr += R(0, 3)), burst: R(2, 8) }));
    const alg = P(["FCFS", "SJF", "RR", "SRTF"]), q = R(2, 3);
    const r = schedule(alg, procs, q);
    const askT = Math.random() < 0.35;
    const val = askT ? r.avgT : r.avgW;
    const nm = { FCFS: "FCFS (πρώτη έρχεται, πρώτη εξυπηρετείται)", SJF: "SJF μη προεκχωρητικός (μικρότερη εργασία πρώτα)", RR: `Round Robin με κβάντο q = ${q}`, SRTF: "SRTF (προεκχωρητικός SJF — μικρότερος υπολειπόμενος χρόνος)" }[alg];
    const pre = { FCFS: "FCFS: εκτέλεση με σειρά άφιξης, χωρίς διακοπή.", SJF: "SJF (μη προεκχωρητικός): όταν ελευθερωθεί η CPU, διαλέγεις από τις **ήδη αφιγμένες** τη μικρότερη εκτέλεση· τρέχει μέχρι τέλους.", RR: "Round Robin: κάθε διεργασία τρέχει το πολύ **q** μονάδες και πάει στο τέλος της ουράς. Σύμβαση: διεργασίες που φτάνουν μπαίνουν στην ουρά **πριν** από αυτή που μόλις διακόπηκε.", SRTF: "SRTF: σε κάθε στιγμή τρέχει η διεργασία με τον **μικρότερο υπολειπόμενο** χρόνο· νέα άφιξη μπορεί να διακόψει την τρέχουσα." }[alg];
    return { type: "short", q: `Αλγόριθμος **${nm}**.\n\n| Διεργασία | Άφιξη | Εκτέλεση |\n|---|---|---|\n${procs.map(p => `| ${p.name} | ${p.arr} | ${p.burst} |`).join("\n")}\n\nΠοιος είναι ο **μέσος χρόνος ${askT ? "διεκπεραίωσης (turnaround)" : "αναμονής"}**; (με 2 δεκαδικά αν χρειάζεται)`,
      a: [fmt2(val), val.toFixed(2)], pre: pre + " Χρόνος διεκπεραίωσης = ολοκλήρωση − άφιξη. Χρόνος αναμονής = διεκπεραίωση − εκτέλεση.",
      why: `Διάγραμμα Gantt: ${r.gantt.join(" ")}\n\n${r.ps.map((p, i) => `- ${p.name}: τέλος ${p.done}, διεκπ. ${r.tat[i]}, αναμονή ${r.wait[i]}`).join("\n")}\n\nΜέσος όρος = **${fmt2(val)}**.`,
      fig: { t: "gantt", after: true, step: true, title: "Διάγραμμα Gantt", segs: ganttSegs(r.gantt), arr: Object.fromEntries(procs.map(p => [p.name, p.arr])) } };
  } });

function pageFaults(alg, refs, F) {
  const fr = [], log = []; let faults = 0; const lastUse = {};
  refs.forEach((p, t) => {
    if (fr.includes(p)) { lastUse[p] = t; log.push(`${p}: hit`); return; }
    faults++;
    if (fr.length < F) fr.push(p);
    else {
      let victim;
      if (alg === "FIFO") victim = fr.shift();
      else if (alg === "LRU") { victim = fr.slice().sort((a, b) => lastUse[a] - lastUse[b])[0]; fr.splice(fr.indexOf(victim), 1); }
      else { const nxt = x => { const i = refs.indexOf(x, t + 1); return i < 0 ? 1e9 : i; }; victim = fr.slice().sort((a, b) => nxt(b) - nxt(a))[0]; fr.splice(fr.indexOf(victim), 1); }
      fr.push(p); log.push(`${p}: σφάλμα (βγαίνει ${victim})`); lastUse[p] = t; return;
    }
    lastUse[p] = t; log.push(`${p}: σφάλμα`);
  });
  return { faults, log };
}
add({ id: "paging", unit: "p11-os", title: "Αντικατάσταση σελίδων", desc: "FIFO, LRU, OPT: πλήθος σφαλμάτων σελίδας",
  make() {
    const refs = [...Array(12)].map(() => R(0, 5)), F = P([3, 3, 4]), alg = P(["FIFO", "LRU", "OPT"]);
    const { faults, log } = pageFaults(alg, refs, F);
    const pre = { FIFO: "FIFO: βγαίνει η σελίδα που **μπήκε πρώτη** στη μνήμη.", LRU: "LRU: βγαίνει η σελίδα που **δεν χρησιμοποιήθηκε για τον περισσότερο χρόνο** (κοιτάς προς τα πίσω).", OPT: "OPT (βέλτιστος): βγαίνει η σελίδα που θα χρησιμοποιηθεί **πιο αργά στο μέλλον** (ή ποτέ) — κοιτάς προς τα εμπρός." }[alg];
    return { type: "short", q: `Ακολουθία αναφορών: **${refs.join(" ")}**\n\nΜε **${F}** πλαίσια (αρχικά κενά) και αλγόριθμο **${alg}**, πόσα **σφάλματα σελίδας** συμβαίνουν;`, a: [String(faults)],
      pre: pre + " Οι πρώτες φορτώσεις σε κενά πλαίσια μετράνε κι αυτές ως σφάλματα.", why: `Σύνολο: **${faults}** σφάλματα. Δες τα πλαίσια σε κάθε αναφορά:`,
      fig: { t: "frames", after: true, step: true, refs, n: F, algo: alg } };
  } });

add({ id: "vaddr", unit: "p11-os", title: "Μετάφραση λογικής διεύθυνσης", desc: "Αριθμός σελίδας και μετατόπιση (offset)",
  make() {
    const k = P([8, 9, 10, 11, 12]), ps = 2 ** k, page = R(0, 20), off = R(0, ps - 1), addr = page * ps + off;
    return { type: "fill", q: `Μέγεθος σελίδας **${ps}** bytes. Για τη λογική διεύθυνση **${addr}**:\n\nαριθμός σελίδας = {{#0}}, μετατόπιση = {{#1}}`, b: [[String(page)], [String(off)]],
      pre: "Σελίδα = ⌊διεύθυνση / μέγεθος σελίδας⌋, μετατόπιση = διεύθυνση **mod** μέγεθος σελίδας. Στο δυαδικό: τα χαμηλά log₂(μέγεθος) bits είναι η μετατόπιση.",
      why: `${addr} ÷ ${ps} = ${page} υπόλοιπο ${off} → σελίδα **${page}**, μετατόπιση **${off}**.` };
  } });

const byId = {}; list.forEach(g => byId[g.id] = g);
window.GENS = { list, byId, _test: { schedule, pageFaults, closure } };
})();

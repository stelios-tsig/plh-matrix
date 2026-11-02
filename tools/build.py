#!/usr/bin/env python3
"""Μετατρέπει τα content/*.txt σε public/content.json και σφραγίζει έκδοση."""
import json, os, re, sys, glob, time, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = sorted(glob.glob(os.path.join(ROOT, "content", "*.txt")))
errors, warns = [], []

def parse_answer_letter(a, n):
    a = a.strip()
    m = {"α": 0, "β": 1, "γ": 2, "δ": 3, "ε": 4, "a": 0, "b": 1, "c": 2, "d": 3, "e": 4}
    if a.lower() in m: return m[a.lower()]
    if a.isdigit(): return int(a) - 1
    raise ValueError(a)

def finish_item(it, ctx):
    t = it["type"]
    f = it.pop("_f")
    q = f.get("q", "").strip()
    out = {"id": None, "type": t, "q": q}
    if f.get("pre", "").strip(): out["pre"] = f["pre"].strip()
    else: warns.append(f"{ctx}: χωρίς pre")
    if f.get("why", "").strip(): out["why"] = f["why"].strip()
    else: warns.append(f"{ctx}: χωρίς why")
    a = f.get("a", "").strip()
    if t == "tf":
        if a.upper() in ("Σ", "T", "TRUE", "ΣΩΣΤΟ"): out["a"] = True
        elif a.upper() in ("Λ", "F", "FALSE", "ΛΑΘΟΣ"): out["a"] = False
        else: errors.append(f"{ctx}: tf χωρίς a"); return None
    elif t == "mcq":
        opts = f.get("o_list", [])
        if len(opts) < 2: errors.append(f"{ctx}: mcq <2 επιλογές"); return None
        out["o"] = [o.strip() for o in opts]
        try: out["a"] = parse_answer_letter(a, len(opts))
        except Exception: errors.append(f"{ctx}: mcq κακό a={a!r}"); return None
        if not 0 <= out["a"] < len(opts): errors.append(f"{ctx}: mcq a εκτός"); return None
    elif t == "fill":
        blanks = []
        def rep(m):
            blanks.append([x.strip().replace("\\|", "|") for x in re.split(r"\s\|\s", m.group(1))])
            return "{{#%d}}" % (len(blanks) - 1)
        out["q"] = re.sub(r"\{\{(.+?)\}\}", rep, q)
        if not blanks: errors.append(f"{ctx}: fill χωρίς κενά"); return None
        out["b"] = blanks
    elif t == "short":
        if not a: errors.append(f"{ctx}: short χωρίς a"); return None
        out["a"] = [x.strip() for x in re.split(r"\s\|\s", a) if x.strip()]
    else:
        errors.append(f"{ctx}: άγνωστος τύπος {t}"); return None
    if f.get("fig", "").strip():
        try: out["fig"] = json.loads(f["fig"])
        except Exception as e: errors.append(f"{ctx}: κακό fig JSON: {e}"); return None
    if not out["q"]: errors.append(f"{ctx}: κενή ερώτηση"); return None
    return out

def parse(path):
    courses = []
    cur_course = cur_unit = cur_lesson = None
    block = None      # ("theory"|"example", lesson) or ("q", item)
    field = None
    fname = os.path.basename(path)
    for ln_no, raw in enumerate(open(path, encoding="utf-8"), 1):
        line = raw.rstrip("\n")
        ctx = f"{fname}:{ln_no}"
        if line.startswith("@"):
            if block and block[0] == "q":
                it = finish_item(block[1], block[2])
                if it: cur_lesson["items"].append(it)
            block = None; field = None
            head, _, rest = line[1:].partition(" ")
            parts = [p.strip() for p in rest.split("|")]
            if head == "course":
                cur_course = {"id": parts[0], "short": parts[1], "title": parts[2], "desc": parts[3] if len(parts) > 3 else "", "units": []}
                courses.append(cur_course)
            elif head == "unit":
                cur_unit = {"id": parts[0], "title": parts[1], "desc": parts[2] if len(parts) > 2 else "", "lessons": []}
                cur_course["units"].append(cur_unit)
            elif head == "lesson":
                cur_lesson = {"id": parts[0], "title": parts[1], "theory": "", "example": "", "items": []}
                cur_unit["lessons"].append(cur_lesson)
            elif head in ("theory", "example"):
                block = (head, cur_lesson)
            elif head == "q":
                block = ("q", {"type": parts[0], "_f": {}}, ctx)
            elif head == "end":
                pass
            else:
                errors.append(f"{ctx}: άγνωστη εντολή @{head}")
            continue
        if block is None:
            if line.strip() and not line.startswith("#"): warns.append(f"{ctx}: γραμμή εκτός μπλοκ")
            continue
        if block[0] in ("theory", "example"):
            block[1][block[0]] += line + "\n"
            continue
        f = block[1]["_f"]
        m = re.match(r"^(pre|q|o|a|why|fig):\s?(.*)$", line)
        if m:
            field = m.group(1)
            if field == "o":
                f.setdefault("o_list", []).append(m.group(2)); field = "o"
            else:
                f[field] = m.group(2)
        elif field:
            if field == "o": f["o_list"][-1] += "\n" + line
            else: f[field] = f.get(field, "") + "\n" + line
    if block and block[0] == "q":
        it = finish_item(block[1], block[2])
        if it: cur_lesson["items"].append(it)
    return courses

def main():
    merged = {}
    order = []
    for p in FILES:
        for c in parse(p):
            if c["id"] in merged: merged[c["id"]]["units"] += c["units"]
            else: merged[c["id"]] = c; order.append(c["id"])
    seen = set()
    nitems = 0
    for cid in order:
        for u in merged[cid]["units"]:
            for l in u["lessons"]:
                l["theory"] = l["theory"].strip(); l["example"] = l["example"].strip()
                if l["id"] in seen: errors.append(f"διπλό lesson id {l['id']}")
                seen.add(l["id"])
                if not l["theory"]: warns.append(f"{l['id']}: χωρίς θεωρία")
                for part in ("theory", "example"):
                    for j in re.findall(r"```fig\s*\n([\s\S]*?)\n```", l[part]):
                        try: json.loads(j)
                        except Exception as e: errors.append(f"{l['id']} {part}: κακό fig JSON: {e}")
                for i, it in enumerate(l["items"]):
                    it["id"] = f"{l['id']}.{i + 1}"
                    nitems += 1
    ver = time.strftime("%Y%m%d%H%M")
    data = {"version": ver, "courses": [merged[c] for c in order]}
    js = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(ROOT, "public", "content.json"), "w", encoding="utf-8").write(js)
    for w in warns[:40]: print("WARN", w)
    if len(warns) > 40: print(f"... +{len(warns) - 40} warnings")
    for e in errors: print("ERROR", e)
    nl = sum(len(u["lessons"]) for c in data["courses"] for u in c["units"])
    print(f"courses={len(order)} lessons={nl} items={nitems} size={len(js)//1024}KB errors={len(errors)}")
    # σφράγισμα έκδοσης
    dist = os.path.join(ROOT, "dist")
    import shutil
    if os.path.exists(dist): shutil.rmtree(dist)
    shutil.copytree(os.path.join(ROOT, "public"), dist)
    for fn in ("index.html", "sw.js"):
        p = os.path.join(dist, fn); s = open(p, encoding="utf-8").read().replace("__V__", ver); open(p, "w", encoding="utf-8").write(s)
    p = os.path.join(dist, "config.js")
    s = open(p, encoding="utf-8").read() if os.path.exists(p) else ""
    open(p, "w", encoding="utf-8").write(f'window.APP_VERSION="{ver}";\n' + s)
    return 1 if errors else 0

sys.exit(main())

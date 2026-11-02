"""Βοηθητικά για εισαγωγή διαγραμμάτων στα content/*.txt (ιδεμποτενή)."""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def J(spec):
    return json.dumps(spec, ensure_ascii=False, separators=(",", ":"))

def fence(spec):
    return "```fig\n" + J(spec) + "\n```"

class Doc:
    def __init__(self, name):
        self.path = os.path.join(ROOT, "content", name)
        self.lines = open(self.path, encoding="utf-8").read().split("\n")
        self.changed = 0

    def _lesson_range(self, lid):
        s = next(i for i, l in enumerate(self.lines) if l.startswith(f"@lesson {lid} "))
        e = next((i for i in range(s + 1, len(self.lines)) if self.lines[i].startswith("@lesson ") or self.lines[i].startswith("@unit ")), len(self.lines))
        return s, e

    def has(self, text):
        return text.strip() in "\n".join(self.lines)

    def insert(self, lid, anchor, text, where="after"):
        """Βάζει text πριν/μετά την πρώτη γραμμή του μαθήματος που ταιριάζει στο anchor (regex)."""
        if self.has(text): return
        s, e = self._lesson_range(lid)
        for i in range(s, e):
            if re.search(anchor, self.lines[i]):
                if where == "after":
                    # μετά από πίνακα/λίστα: προχώρα ως το τέλος του μπλοκ
                    j = i
                    if self.lines[i].startswith("|"):
                        while j + 1 < e and self.lines[j + 1].startswith("|"): j += 1
                    self.lines[j + 1:j + 1] = ["", *text.split("\n"), ""]
                else:
                    self.lines[i:i] = [*text.split("\n"), ""]
                self.changed += 1
                return
        raise SystemExit(f"anchor not found: {lid} / {anchor}")

    def add_q(self, lid, block):
        """Προσθέτει ερώτηση στο τέλος του μαθήματος."""
        qline = next(l for l in block.split("\n") if l.startswith("q: "))
        if qline in self.lines: return
        s, e = self._lesson_range(lid)
        while e - 1 > s and not self.lines[e - 1].strip(): e -= 1
        self.lines[e:e] = block.strip().split("\n")
        self.changed += 1

    def save(self):
        open(self.path, "w", encoding="utf-8").write("\n".join(self.lines))
        print(os.path.basename(self.path), "changes:", self.changed)

def q(kind, pre, qq, fig=None, o=None, a=None, why=None):
    out = [f"@q {kind}", f"pre: {pre}", f"q: {qq}"]
    if fig: out.append("fig: " + J(fig))
    for x in o or []: out.append(f"o: {x}")
    if a is not None: out.append(f"a: {a}")
    if why: out.append(f"why: {why}")
    return "\n".join(out)

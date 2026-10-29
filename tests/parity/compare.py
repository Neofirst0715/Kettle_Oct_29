"""Compare the Python results.json with the browser engine's output, field by field."""
import json, sys
py, js = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
diffs = []
def cmp(a, b, path):
    if isinstance(a, dict):
        for k in a:
            if k == "regular":
                continue
            if k not in b:
                diffs.append(f"{path}.{k}: missing in browser version"); continue
            cmp(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list):
        if len(a) != len(b):
            diffs.append(f"{path}: length {len(a)} vs {len(b)}"); return
        for i, (x, y) in enumerate(zip(a, b)):
            cmp(x, y, f"{path}[{i}]")
    elif a != b:
        diffs.append(f"{path}: {a!r} vs {b!r}")
for k in ("results", "needs_review", "out_of_date", "score", "order_changes"):
    cmp(py[k], js[k], k)
print(f"{len(py['results'])} openings compared · differences: {len(diffs)}")
for d in diffs[:30]:
    print("  ", d)
sys.exit(1 if diffs else 0)

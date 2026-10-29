import csv, datetime as dt, re
from backend.parsing import build_people, classify
from backend.matching import parse_opening, match
import pathlib
D = str(pathlib.Path(__file__).resolve().parent.parent / "samples" / "sep21-oct17") + "/"
run = dt.date(2026, 10, 21)
wl = list(csv.DictReader(open(D + "waitlist-2026-10-21.csv", encoding="utf-8")))
ap = list(csv.DictReader(open(D + "appointments-2026-09-21-to-2026-10-17.csv", encoding="utf-8")))
ops = list(csv.DictReader(open(D + "late-openings-2026-09-21-to-2026-10-17.csv", encoding="utf-8")))
key = {r["id"]: r["answer"] for r in csv.DictReader(open(D + "answer-key-tanya.csv", encoding="utf-8"))}
people = classify(build_people(wl, run), ap, run)
byW = {"W%02d" % p.last_line: p for p in people}
hit = 0; rows = []
for r in ops:
    o = parse_opening(r)
    shown, fits, rej = match(people, o)
    ans = key[o["id"]]
    want = set() if ans.strip().lower() == "none" else {x.strip().split()[0] for x in ans.split(";") if x.strip()}
    got = {"W%02d" % p.last_line for p in shown}
    allfit = {"W%02d" % p.last_line for p in fits}
    ok = (got <= want) if want else (not got)
    if want and not got: ok = False
    hit += ok
    rows.append((o["id"], ok, sorted(want), sorted(got), sorted(allfit)))
    if not ok or allfit != want:
        print(o["id"], "OK " if ok else "MISS", "key", sorted(want), "shown", sorted(got), "allfit", sorted(allfit),
              o["start"].strftime("%a %H:%M"), o["length"], o["therapist"].split()[0], f"{o['notice_h']:.1f}h")
print("score", hit, "/", len(rows))
last = rows[33:]
print("O34-O44:", sum(r[1] for r in last), "/", len(last))

"""Build the timed test page: tests/timed/timed-test.html

Picks 10 sample openings with a fixed seed (so they are not hand-picked): two each of
  nobody fits · a Josée opening · only 1-2 people fit · many people fit · a clinic therapist rule applies.
One of each pair goes to round 1 (book only), the other to round 2 (the tool), at random.
"""
import csv
import json
import pathlib
import random
import datetime as dt
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from backend.service import run_all  # noqa: E402

S = ROOT / "samples" / "sep21-oct17"
SEED = 20261029


def rows(name):
    with open(S / name, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


openings = rows("late-openings-2026-09-21-to-2026-10-17.csv")
waitlist = rows("waitlist-2026-10-21.csv")
key = rows("answer-key-tanya.csv")
out = run_all(openings, waitlist, rows("appointments-2026-09-21-to-2026-10-17.csv"), dt.date(2026, 10, 21), key)
res = {r["id"]: r for r in out["results"]}
raw = {r["opening_id"]: r for r in openings}

cats = [
    ("nobody", "Nobody fits", lambda r: not r["shown"] and r["notice_h"] > 0.3),
    ("josee", "A Josée opening", lambda r: r["therapist"].startswith("Jos") and r["shown"]),
    ("few", "Only 1–2 people fit", lambda r: 1 <= r["funnel"]["fit"] <= 2),
    ("many", "Many people fit", lambda r: r["funnel"]["fit"] >= 5),
    ("rule", "A clinic therapist rule applies", lambda r: r["shown"] and any(o["why"] == "clinic therapist rule" for o in r["ruled_out"])),
]
rnd = random.Random(SEED)
used, rounds = set(), {1: [], 2: []}
for code, label, test in cats:
    pool = [i for i, r in res.items() if test(r) and i not in used]
    pair = rnd.sample(pool, 2)
    used.update(pair)
    if rnd.random() < 0.5:
        pair.reverse()
    for rnum, oid in zip((1, 2), pair):
        r, o = res[oid], raw[oid]
        rounds[rnum].append({
            "id": oid, "category": label, "when": r["when"], "length": r["length"], "therapist": r["therapist"],
            "cancelled": r["cancelled"], "notice_h": r["notice_h"],
            "tool": {"shown": r["shown"], "funnel": r["funnel"]},
            "tanya": r["check"]["tanya"],
        })
for rnum in rounds:
    rnd.shuffle(rounds[rnum])

names = sorted({r["name"] for r in waitlist} | {n for rr in rounds.values() for q in rr for n in q["tanya"]})
# six real new lines from the book (the most recent ones) for the optional typing test
typing = [dict(added=r["added"], name=r["name"], phone=r["phone"], notes=r["notes"]) for r in waitlist[-6:]]

payload = {"seed": SEED, "rounds": rounds, "book": waitlist, "names": names, "typing": typing}
page = (pathlib.Path(__file__).parent / "timed-test.template.html").read_text(encoding="utf-8")
page = page.replace("/*DATA*/null", json.dumps(payload, ensure_ascii=False).replace("</", "<\\/"))
dst = pathlib.Path(__file__).parent / "timed-test.html"
dst.write_text(page, encoding="utf-8")
print(dst)
for rnum, qs in rounds.items():
    print(f"round {rnum}:", ", ".join(f"{q['id']} ({q['category']})" for q in qs))

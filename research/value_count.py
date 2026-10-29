"""Value check: how many of the 44 late openings could a perfect waitlist still have filled?

Uses the answer key ONLY to know whether a fitting person existed (this is a one-off
analysis, not part of the Friday program).

"Actionable time" = the first moment at or after the cancellation when Tanya (or Bethany)
can plausibly start calling:
  Mon-Fri 10:30-20:00, Sat 9:30-15:00, Sun closed.
margin = start of the opening minus actionable time.
An opening is "in time" if margin >= T minutes (T = 90, 150, 210).
"""
import csv
from datetime import datetime, timedelta, time

import pathlib
_S = pathlib.Path(__file__).resolve().parent.parent / "samples" / "sep21-oct17"
OPENINGS = _S / "late-openings-2026-09-21-to-2026-10-17.csv"
KEY = _S / "answer-key-tanya.csv"

WINDOWS = {0: (time(10, 30), time(20, 0)), 1: (time(10, 30), time(20, 0)),
           2: (time(10, 30), time(20, 0)), 3: (time(10, 30), time(20, 0)),
           4: (time(10, 30), time(20, 0)), 5: (time(9, 30), time(15, 0))}


def next_free(t):
    while True:
        w = WINDOWS.get(t.weekday())
        if w:
            open_dt = datetime.combine(t.date(), w[0])
            close_dt = datetime.combine(t.date(), w[1])
            if t < open_dt:
                return open_dt
            if t < close_dt:
                return t
        t = datetime.combine(t.date() + timedelta(days=1), time(0, 0))


def load():
    key = {}
    with open(KEY, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["type"] == "opening":
                key[r["id"]] = r["answer"]
    rows = []
    with open(OPENINGS, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            start = datetime.strptime(r["date"] + " " + r["start"], "%Y-%m-%d %H:%M")
            canc = datetime.strptime(r["cancelled_at"], "%Y-%m-%d %H:%M")
            act = next_free(canc)
            ans = key[r["opening_id"]]
            n = 0 if ans.strip().lower() == "none" else len([x for x in ans.split(";") if x.strip()])
            rows.append(dict(id=r["opening_id"], kind=r["kind"], refilled=r["refilled"] == "yes",
                             cands=n, margin=(start - act).total_seconds() / 60,
                             day=r["day"], start=r["start"]))
    return rows


def main():
    rows = load()
    total = len(rows)
    print(f"openings: {total}")
    print(f"already refilled: {sum(r['refilled'] for r in rows)}")
    print(f"no-shows: {sum(r['kind'] == 'no-show' for r in rows)}")
    print(f"answer = none: {sum(r['cands'] == 0 for r in rows)}  "
          f"(non no-show none: {[r['id'] for r in rows if r['cands'] == 0 and r['kind'] != 'no-show']})")
    print(f"with at least one fitting person: {sum(r['cands'] > 0 for r in rows)}")
    unf = [r for r in rows if not r["refilled"]]
    print(f"unfilled: {len(unf)}")
    print()
    for T in (90, 150, 210):
        new = [r for r in unf if r["cands"] > 0 and r["margin"] >= T]
        late = [r for r in unf if r["cands"] > 0 and r["margin"] < T]
        ref_ok = [r for r in rows if r["refilled"] and r["margin"] >= T]
        total_if = sum(r["refilled"] for r in rows) + len(new)
        print(f"T={T}: extra fillable={len(new)}  fitting person but too late={len(late)}  "
              f"-> total would be {total_if}/{total} = {total_if / total:.0%} (target 31)")
        print(f"   extra fillable ids: {[r['id'] for r in new]}")
        print(f"   already-refilled that would have failed this rule: "
              f"{[r['id'] for r in rows if r['refilled'] and r['margin'] < T]}")
    print()
    print("unfilled with candidates, margin in minutes:")
    for r in unf:
        if r["cands"] > 0:
            print(f"  {r['id']} {r['day']} {r['start']} cands={r['cands']} margin={r['margin']:.0f}")


main()

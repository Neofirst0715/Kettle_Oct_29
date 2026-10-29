"""Developer check: print each person's merged rules and status, compare with Tanya's labels."""
import csv
import datetime as dt
import sys
from backend.parsing import build_people, classify

D = "/mnt/user-data/uploads/"
run = dt.date(2026, 10, 21)
wl = list(csv.DictReader(open(D + "waitlist-2026-10-21.csv", encoding="utf-8")))
ap = list(csv.DictReader(open(D + "appointments-2026-09-21-to-2026-10-17.csv", encoding="utf-8")))
key = {r["id"]: r for r in csv.DictReader(open(D + "answer-key-tanya.csv", encoding="utf-8"))}
people = classify(build_people(wl, run), ap, run)
print("people:", len(people))
bad = 0
for p in people:
    wid = "W%02d" % p.last_line
    lab = key[wid]["answer"]
    mine = "active" if p.status == "active" else "not-active"
    ok = (lab == "active") == (p.status == "active")
    r = p.rule
    flag = "" if ok else "   <<<<<< MISMATCH"
    bad += (not ok)
    print(f"{wid} {p.full_name:20} key={lab:9} mine={p.status:12} {p.why}{flag}")
    if p.status == "active" or not ok:
        print("     ", dict(ther_in=sorted(x.split()[0] for x in r.ther_in) if r.ther_in else None,
                            out=sorted(x.split()[0] for x in r.ther_out), fem=r.female, preg=r.prenatal,
                            days=sorted(r.days_in) if r.days_in else None, dout=sorted(r.days_out),
                            smin=r.start_min, smax=r.start_max, emax=r.end_max, lens=sorted(r.lens) if r.lens else None,
                            notice=r.notice_h, dayb=r.day_before, mind=str(r.min_date), maxd=str(r.max_date),
                            unk=r.unknown))
print("mismatches with Tanya's active/stale labels:", bad)

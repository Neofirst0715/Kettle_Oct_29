"""Unseen wordings. Each case: note, opening (therapist, 'YYYY-MM-DD HH:MM', length, cancelled_at), expected
'show' / 'hide'. Outcome 'review' (parser admits it can't read) counts as safe-hide."""
import datetime as dt
from backend.parsing import build_people, classify
from backend.matching import parse_opening, match
run = dt.date(2026, 10, 21)
T = {"D": "Dave Melanson", "J": "Josée Landry", "R": "Rachel Thibodeau", "A": "Amira Haddad", "K": "Kelsey Babineau", "M": "Marc Cormier"}
# Wed Oct 14 2026 is a Wednesday; use a few dates
W = "2026-10-14 "; TH = "2026-10-15 "; MO = "2026-10-12 "
cases = [
 ("no Dave please", "D", W+"14:00", 60, W+"09:00", "hide"),
 ("no Dave please", "J", W+"14:00", 60, W+"09:00", "show"),
 ("after 4 only", "J", W+"15:00", 60, W+"09:00", "hide"),
 ("after 4 only", "J", W+"16:30", 60, W+"09:00", "show"),
 ("Mon/Wed only", "J", TH+"14:00", 60, TH+"08:00", "hide"),
 ("Mon/Wed only", "J", W+"14:00", 60, W+"08:00", "show"),
 ("Josee only, 60 min", "J", W+"14:00", 60, W+"08:00", "show"),
 ("Josee only, 60 min", "R", W+"14:00", 60, W+"08:00", "hide"),
 ("mornings, 90 min", "M", W+"09:30", 60, W+"06:00", "hide"),
 ("needs 3 hrs notice", "J", W+"14:00", 60, W+"12:00", "hide"),
 ("3 hrs notice ok", "J", W+"14:00", 60, W+"08:00", "show"),
 ("not Fridays, anyone", "J", "2026-10-16 14:00", 60, "2026-10-16 08:00", "hide"),
 ("prefers Rachel", "R", W+"14:00", 60, W+"08:00", "show"),
 ("nothing before 11 and out by 3", "J", W+"13:30", 60, W+"08:00", "hide"),
 ("can do tues & thurs after work", "J", TH+"17:30", 60, TH+"08:00", "show"),
 ("weekends no, tuesdays no", "J", "2026-10-13 14:00", 60, "2026-10-13 08:00", "hide"),
 ("anyone but Marc, 45 ok", "M", W+"14:00", 60, W+"08:00", "hide"),
 ("anyone but Marc, 45 ok", "K", W+"14:00", 45, W+"08:00", "show"),
 ("any", "A", W+"14:00", 60, W+"08:00", "show"),
 ("hates mondays except in the evening", "J", MO+"10:00", 60, MO+"08:00", "hide"),
]
wrong = miss = review = 0
for i, (note, th, st, ln, cx, exp) in enumerate(cases):
    rows = [dict(line="1", added="Oct 5", name=f"Test Person{i}", phone=f"506-555-{1000+i}", notes=note)]
    p = classify(build_people(rows, run), [], run)
    o = parse_opening(dict(date=st[:10], start=st[11:], length_min=ln, therapist=T[th], cancelled_at=cx, opening_id="X"))
    shown, _, _ = match(p, o)
    got = "show" if shown else "hide"
    tag = "ok"
    if p[0].status == "needs review":
        tag = "REVIEW(safe)"; review += 1
        if exp == "show": miss += 1
    elif got != exp:
        tag = "WRONG SHOW" if got == "show" else "missed"
        wrong += got == "show"; miss += got == "hide"
    print(f"{tag:13} {note!r:40} {th} {st} {ln}min -> {got} (expected {exp})")
print(f"\nwrong shows: {wrong} · missed/held back: {miss} · parser said 'needs review': {review} of {len(cases)}")

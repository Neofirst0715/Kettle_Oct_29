"""The one place where a run happens: rows in, results out.

Used by the local server (for the desk page) and by the command line (for tests).
Nothing here reads files or talks to the network; the data source hands it rows.
"""
import datetime as dt

from .parsing import build_people, classify, name_key
from .matching import (parse_opening, match, LOOK_FIRST, DEFAULT_NOTICE_H, requirements, WHY_WORDS,
                       fmt_bd, fmt_when, fmt_cancelled)


def _since(p):
    return fmt_bd(p.first_added) if p.first_added else "?"


def _need_h(p):
    return p.rule.notice_h if p.rule.notice_h is not None else DEFAULT_NOTICE_H


def _person_row(p, i, total, o, phones, order):
    if order == "asked":
        why = (f"Asked first: waiting since {_since(p)} (rank {i} of {total}) · "
               f"needs {_need_h(p):g} h notice, this one has {o['notice_h']:.1f} h")
    else:
        why = (f"Fastest to arrive: needs only {_need_h(p):g} h notice "
               f"(this one has {o['notice_h']:.1f} h) · waiting since {_since(p)}")
    ph = next((phones[n] for n in p.names if phones.get(n) and phones[n].lower() != "same #"), "")
    return dict(name=p.full_name, phone=ph, reason=why, look_first=o["therapist"] in LOOK_FIRST,
                text_only="text" in p.rule.contact, checks=[list(c) for c in requirements(p, o)])


def score(results, key_rows):
    """Friday rule: every name shown is on Tanya's list, or nobody shown when her answer is nobody.
    Checked for both orders."""
    k = {r["id"]: r["answer"] for r in key_rows}
    hit, detail = 0, {}
    for r in results:
        ans = k.get(r["id"], "none")
        names = [] if ans.strip().lower() == "none" else [" ".join(x.strip().split()[1:]) for x in ans.split(";") if x.strip()]
        want = {name_key(n) for n in names}
        ok = True
        for lst in (r["shown"], r["shown_reg"]):
            got = {name_key(s["name"]) for s in lst}
            ok &= (got <= want and bool(got)) if want else (not got)
        hit += ok
        detail[r["id"]] = dict(ok=bool(ok), tanya=names)
    return hit, detail


def run_all(openings, waitlist, appointments, today, key=None):
    """openings / waitlist / appointments / key: lists of dicts (CSV rows). today: datetime.date."""
    phones = {r["name"]: r["phone"] for r in waitlist}
    people = classify(build_people(waitlist, today), appointments, today)
    n_old = sum(1 for p in people if p.status != "active")
    results, log, changed = [], [], 0
    for row in openings:
        o = parse_opening(row)
        shown, fits, rej = match(people, o)
        shown_reg = sorted(fits, key=lambda p: (_need_h(p), p.first_added or dt.date.max, p.first_line))[:3]
        changed += {p.key for p in shown} != {p.key for p in shown_reg}
        res = dict(id=o["id"], when=fmt_when(o["start"]), length=o["length"], therapist=o["therapist"],
                   cancelled=fmt_cancelled(o["cancelled"]), notice_h=round(o["notice_h"], 1),
                   funnel=dict(total=len(people), waiting=len(people) - n_old, fit=len(fits), shown=len(shown)),
                   shown=[_person_row(p, i, len(fits), o, phones, "asked") for i, p in enumerate(shown, 1)],
                   shown_reg=[_person_row(p, i, len(fits), o, phones, "reg") for i, p in enumerate(shown_reg, 1)],
                   more=len(fits) - len(shown),
                   ruled_out=[dict(name=p.full_name, why=WHY_WORDS.get(w, w)) for p, w in rej if p.status == "active"],
                   others_fit=[p.full_name for p in fits[3:]])
        for s in res["shown"]:
            log.append([o["id"], "shown", s["name"], s["reason"]])
        for p, why in rej:
            log.append([o["id"], "not shown", p.full_name, "note not understood" if p.status == "needs review" else why.split(":")[0]])
        results.append(res)
    sc = score(results, key) if key else None
    if sc:
        for r in results:
            r["check"] = sc[1][r["id"]]
    return dict(today=today.isoformat(), results=results,
                needs_review=[dict(name=p.full_name) for p in people if p.status == "needs review"],
                out_of_date=[dict(name=p.full_name, why=p.why) for p in people if p.status == "out of date"],
                score=sc[0] if sc else None, order_changes=changed, log=log, people_count=len(people))

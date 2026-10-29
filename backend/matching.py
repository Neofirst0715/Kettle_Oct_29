"""Decide who fits an opening. Conservative: when unsure, do not show."""
import datetime as dt
from .parsing import name_key

MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


# Date text is built by hand: '%-d' and '%-I' do not work on Windows, and month names must not follow the computer's language.
def fmt_bd(d):
    return f"{MON[d.month - 1]} {d.day}"


def fmt_clock(t, upper=True):
    h12 = t.hour % 12 or 12
    ap = "PM" if t.hour >= 12 else "AM"
    return f"{h12}:{t.minute:02d} {ap if upper else ap.lower()}"


def fmt_when(t):
    return f"{DAYS[t.weekday()]} {fmt_bd(t)}, {t.hour:02d}:{t.minute:02d}"


def fmt_cancelled(t):
    return f"{DAYS[t.weekday()]} {fmt_bd(t)}, {fmt_clock(t)}"

FEMALE = {"Josée Landry", "Amira Haddad", "Kelsey Babineau", "Rachel Thibodeau"}
PRENATAL_OK = {"Amira Haddad", "Kelsey Babineau"}
LOOK_FIRST = {"Josée Landry"}          # therapist wants to see the person first (assumption)
DEFAULT_LEN = 60
DEFAULT_NOTICE_H = 2.0


def parse_opening(row):
    start = dt.datetime.strptime(row["date"] + " " + row["start"], "%Y-%m-%d %H:%M")
    canc = dt.datetime.strptime(row["cancelled_at"], "%Y-%m-%d %H:%M")
    length = int(row["length_min"])
    return dict(id=row["opening_id"], start=start, cancelled=canc, length=length,
                therapist=row["therapist"].strip(), notice_h=(start - canc).total_seconds() / 3600)


def check(person, o):
    """Return None if the person fits, else a short reason why not."""
    r = person.rule
    t = o["therapist"]
    mins = o["start"].hour * 60 + o["start"].minute
    day = o["start"].weekday()
    if r.ther_in and t not in r.ther_in:
        return "other therapist wanted"
    if t in r.ther_out:
        return "therapist excluded"
    if r.female and t not in FEMALE:
        return "female therapist only"
    if r.prenatal and t not in PRENATAL_OK:
        return "therapist rule"
    if r.postop and not r.ther_in and t != "Josée Landry":
        return "therapist rule"
    if r.days_in is not None and day not in r.days_in:
        return "day"
    if day in r.days_out:
        return "day excluded"
    if r.start_min is not None and mins < r.start_min:
        return "too early"
    if r.start_max is not None and mins >= r.start_max:
        return "too late"
    if r.end_max is not None and mins + o["length"] > r.end_max:
        return "runs too long"
    shortest = min(r.lens) if r.lens else DEFAULT_LEN
    if o["length"] < shortest:
        return "opening too short"
    need = r.notice_h if r.notice_h is not None else DEFAULT_NOTICE_H
    if o["notice_h"] < need:
        return "not enough notice"
    if r.day_before and o["cancelled"].date() >= o["start"].date():
        return "needs day before"
    d = o["start"].date()
    if r.min_date and d < r.min_date:
        return "away"
    if r.max_date and d > r.max_date:
        return "availability ended"
    return None


def match(people, o, top=3):
    fits, rejected = [], []
    for p in people:
        if p.status == "out of date":
            rejected.append((p, p.why))
            continue
        if p.status == "needs review":
            rejected.append((p, p.why))
            continue
        why = check(p, o)
        (rejected if why else fits).append((p, why) if why else p)
    fits.sort(key=lambda p: (p.first_added or dt.date.max, p.first_line))
    shown = fits[:top]
    return shown, fits, rejected


def reason(rank, total, p, o):
    need = p.rule.notice_h if p.rule.notice_h is not None else DEFAULT_NOTICE_H
    since = fmt_bd(p.first_added) if p.first_added else "?"
    return (f"Rank {rank} of {total} · on the list since {since} · "
            f"notice needed {need:g} h (this opening {o['notice_h']:.1f} h)")


DAYN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
WHY_WORDS = {
    "other therapist wanted": "wants a different therapist",
    "therapist excluded": "does not want this therapist",
    "female therapist only": "wants a female therapist",
    "therapist rule": "clinic therapist rule",
    "day": "not available that day",
    "day excluded": "not available that day",
    "too early": "needs a later time",
    "too late": "needs an earlier time",
    "runs too long": "needs to finish earlier",
    "opening too short": "wants a longer appointment",
    "not enough notice": "needs more notice",
    "needs day before": "needs to be told the day before",
    "away": "away until later",
    "availability ended": "availability has ended",
}


def _clock(m):
    h, mm = divmod(int(m), 60)
    return f"{(h - 1) % 12 + 1}:{mm:02d} {'pm' if h >= 12 else 'am'}"


def requirements(person, o):
    """List of (what, their requirement, this opening, assumed?) shown on screen. No health details."""
    r = person.rule
    t = o["therapist"]
    first = lambda s: s.split()[0]
    out = []
    # therapist
    if r.ther_in:
        out.append(("Therapist", "only " + " or ".join(first(x) for x in sorted(r.ther_in)), first(t), False))
    elif r.ther_out:
        out.append(("Therapist", "not " + ", ".join(first(x) for x in sorted(r.ther_out)), first(t), False))
    elif r.female or r.prenatal or r.postop:
        out.append(("Therapist", "clinic therapist rule", first(t), False))
    else:
        out.append(("Therapist", "any", first(t), False))
    # day
    if r.days_in is not None:
        out.append(("Day", "only " + "/".join(DAYN[d] for d in sorted(r.days_in)), DAYN[o["start"].weekday()], False))
    elif r.days_out:
        out.append(("Day", "not " + "/".join(DAYN[d] for d in sorted(r.days_out)), DAYN[o["start"].weekday()], False))
    # time of day
    bits = []
    if r.start_min is not None:
        bits.append("from " + _clock(r.start_min))
    if r.start_max is not None:
        bits.append("before " + _clock(r.start_max))
    if r.end_max is not None:
        bits.append("done by " + _clock(r.end_max))
    if bits:
        out.append(("Time", ", ".join(bits), fmt_clock(o["start"], upper=False) + f" ({o['length']} min)", False))
    # length
    if r.lens:
        out.append(("Length", " or ".join(str(x) for x in sorted(r.lens)) + " min", f"{o['length']} min", False))
    else:
        out.append(("Length", "60 min (assumed)", f"{o['length']} min", True))
    # notice
    need = r.notice_h if r.notice_h is not None else DEFAULT_NOTICE_H
    nt = (f"{need * 60:.0f} min" if need < 1 else f"{need:g} h") + (" (assumed)" if r.notice_h is None else "")
    out.append(("Notice", nt, f"{o['notice_h']:.1f} h", r.notice_h is None))
    if r.min_date:
        out.append(("Available", "from " + fmt_bd(r.min_date), fmt_bd(o["start"]), False))
    if r.max_date:
        out.append(("Available", "until " + fmt_bd(r.max_date), fmt_bd(o["start"]), False))
    return out

"""Turn the waitlist's handwriting into fixed fields. Rules only, no AI.

Design rules:
  * The newest line for a person wins; older lines fill gaps.
  * If a note has wording the rules do not recognise, the person is marked
    "needs review" and is NOT offered. We never guess.
  * Health words are recognised only so they can be ignored and flagged. They are
    never copied into any output.
"""
import re
import unicodedata
import datetime as dt
from calendar import monthrange
from dataclasses import dataclass, field

# ---------------------------------------------------------------- vocabulary
MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7,
          "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}
DAYIDX = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}
THER = {"dave": "Dave Melanson", "josee": "Josée Landry", "jos": "Josée Landry",
        "rachel": "Rachel Thibodeau", "amira": "Amira Haddad",
        "kelsey": "Kelsey Babineau", "marc": "Marc Cormier"}

NAMES = r"(?:dave|josee|jos|rachel|amira|kelsey|marc)"
DAYRX = (r"(?:mon|tues?|wed|thurs?|thu|fri|sat|sun)"
         r"(?:day|sday|nesday|rsday|urday)?s?\b")
MONRX = r"(?:jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)"
DATE = (r"(?:(?P<eom>end of\s+)?(?P<mon>" + MONRX + r")[a-z]*\.?(?:\s*(?P<day>\d{1,2}))?)")

HEALTH = (r"sciatica|\bl side\b|\bknee\b|\bhip\b|post-?op|replacement|rotator cuff|shoulder|"
          r"surgery|low back|\bbad\b|\bmva\b|\bclaim\b|ins pays|\bins\b|insurance|\btmj\b|"
          r"migraines?|concussion|hamstring|hockey|cancer survivor|cancer|fibro\w*|"
          r"light pressure!*|light only|no deep|deep tissue")
POSTOP = r"post-?op|replacement|rotator cuff|surgery"


def fold(s):
    s = unicodedata.normalize("NFKD", s.replace("’", "'"))
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


def name_key(s):
    return re.sub(r"[^a-z\- ]", "", fold(s)).strip()


def digits(s):
    return re.sub(r"\D", "", s)


def to_min(h, m=None):
    """Clock words in the book have no am/pm: 1-7 means afternoon."""
    h = int(h)
    m = int(m or 0)
    if 1 <= h <= 7:
        h += 12
    return h * 60 + m


def parse_added(text, run_date):
    t = fold(text).strip().rstrip(".")
    m = re.match(r"^([a-z]+)\.?\s+(\d{1,2})$", t)
    if m and m.group(1)[:3] in MONTHS:
        mo, d = MONTHS[m.group(1)[:3]], int(m.group(2))
    else:
        m = re.match(r"^(\d{1,2})/(\d{1,2})$", t)
        if not m:
            return None
        mo, d = int(m.group(1)), int(m.group(2))
    try:
        out = dt.date(run_date.year, mo, d)
    except ValueError:
        return None
    if out > run_date + dt.timedelta(days=1):
        out = dt.date(run_date.year - 1, mo, d)
    return out


# ---------------------------------------------------------------- one note
@dataclass
class Rule:
    ther_in: set = None
    ther_out: set = field(default_factory=set)
    female: bool = False
    prenatal: bool = False
    postop: bool = False
    days_in: set = None
    days_out: set = field(default_factory=set)
    has_time: bool = False
    start_min: int = None
    start_max: int = None      # start must be BEFORE this minute
    end_max: int = None        # appointment must END by this minute
    lens: set = None
    notice_h: float = None
    day_before: bool = False
    min_date: dt.date = None
    max_date: dt.date = None
    remove: str = None
    contact: set = field(default_factory=set)
    health: bool = False
    unknown: list = field(default_factory=list)


def _date_from(m, year):
    mon = MONTHS[m.group("mon")[:3]]
    if m.group("eom"):
        return dt.date(year, mon, monthrange(year, mon)[1])
    if not m.group("day"):
        return None
    try:
        return dt.date(year, mon, int(m.group("day")))
    except ValueError:
        return None


def parse_note(note, year):
    r = Rule()
    t = " " + fold(note) + " "

    def eat(rx, fn=None):
        nonlocal t

        def rep(m):
            if fn:
                fn(m)
            return " " * len(m.group(0))
        t = re.sub(rx, rep, t)

    # parenthetical remarks: explanations, scanned for risky words but not parsed
    parens = re.findall(r"\(([^)]*)\)", t)
    eat(r"\([^)]*\)")

    # 1. explicit removal
    def rm(why):
        def f(m):
            r.remove = why
        return f
    eat(r"not in service", rm("number not in service"))
    eat(r"\bmoved to \w+", rm("moved away"))
    eat(r"going to someone[^,;.]*|found someone[^,;.]*", rm("going elsewhere"))
    eat(r"\btake off\b", rm("asked to be taken off"))

    # 2. dated limits
    def away(m):
        d = _date_from(m, year)
        if d:
            r.min_date = d + dt.timedelta(days=1)
    eat(r"\baway\b[^,;.]*?\b(?:until|till|til)\s+" + DATE, away)

    def only_til(m):
        d = _date_from(m, year)
        if d:
            r.max_date = d
    eat(r"\b(?:only|here)\b[^,;.]*?\b(?:until|till|til)\s+" + DATE, only_til)
    eat(r"(?:wants one\s+)?\bbefore\s+(?:her\s+|the\s+)?wedding\s+(?:on\s+)?" + DATE, only_til)

    def frm(m):
        d = _date_from(m, year)
        if d:
            r.min_date = d
    eat(r"\bfrom\s+" + DATE, frm)

    # 3. health words: recognised, flagged, ignored
    def preg(m):
        r.prenatal = True
        r.health = True
    eat(r"\bpregnan\w*\b,?\s*(?:\d+\s*(?:wks?|weeks?)\b|\d+(?:st|nd|rd|th)\s*tri\w*)?", preg)

    # conditional lengths ("90 if ins ok's it") are wishes, not rules
    eat(r"(?:wants|can do)?\s*\d+\s*(?:min)?\s*if\s+[^,;.]*")

    def hv(m):
        r.health = True
        if re.search(POSTOP, m.group(0)):
            r.postop = True
    eat(HEALTH, hv)

    # 4. notice
    def n1(m):
        if m.group("an"):
            h = 1.0
        else:
            a = int(m.group("a"))
            b = int(m.group("b")) if m.group("b") else a
            n = max(a, b)
            h = n / 60 if m.group("u").startswith("min") else float(n)
        r.notice_h = h
    eat(r"\b(?:can come in|needs?)\s+(?:(?P<an>an?\s+hour)|(?P<a>\d+)(?:\s*-\s*(?P<b>\d+))?"
        r"\s*(?P<u>hours?|hrs?|h\b|min(?:ute)?s?))", n1)

    def n2(m):
        r.notice_h = int(m.group("n")) / 60
    eat(r"(?P<n>\d+)\s*min(?:ute)?s?\s+notice(?:\s+ok)?", n2)

    def n3(m):
        r.notice_h = float(m.group("n"))
    eat(r"(?P<n>\d+)\s*(?:hrs?|hours?)\s+notice(?:\s+ok)?", n3)

    def dayb(m):
        r.day_before = True
    eat(r"\bnext day only\b|\b(?:told |need |needs )?(?:the )?day before\b", dayb)

    def sameday(m):
        r.notice_h = 0.0
    eat(r"\bsame day(?: ok)?\b", sameday)

    def quick(m):
        r.notice_h = 1.0
    eat(r"\bcan come quick\b", quick)

    # 5. times of day
    def endby(m):
        r.has_time = True
        r.end_max = to_min(m.group("h"), m.group("m"))
    eat(r"\b(?:done|finished|out|ends?)\s+by\s+(?P<h>\d{1,2})(?::(?P<m>\d\d))?", endby)

    def window(m):
        r.has_time = True
        a, b = to_min(m.group("h1")), to_min(m.group("h2"))
        if b <= a:
            b += 12 * 60
        r.start_min, r.start_max = a, b + 1  # window = when it may START (end of hour inclusive)
    eat(r"(?:on his lunch\s+)?(?<![\d:])(?P<h1>\d{1,2})-(?P<h2>\d{1,2})(?![\d:])\s*(?:only)?", window)

    def after(m):
        r.has_time = True
        r.start_min = to_min(m.group("h"), m.group("m"))
    eat(r"\b(?:not before|no earlier than|after|from|starting)\s+(?P<h>\d{1,2})(?::(?P<m>\d\d))?(?!\d)", after)

    def morning(m):
        r.has_time = True
        r.start_max = 12 * 60
    eat(r"\b(?:am|mornings?)\b", morning)

    def afternoon(m):
        r.has_time = True
        r.start_min = max(r.start_min or 0, 12 * 60)
    eat(r"\bafternoons?\b", afternoon)

    def evening(m):
        r.has_time = True
        if r.start_min is None:
            r.start_min = 17 * 60
    eat(r"\bevenings?\b", evening)

    def lunch(m):
        r.has_time = True
        if r.start_min is None:
            r.start_min, r.end_max = 12 * 60, 13 * 60
    eat(r"\blunch\b", lunch)

    # 6. days
    def days_of(s):
        return {DAYIDX[d[:3]] for d in re.findall(DAYRX, s)}

    def dout(m):
        r.days_out |= days_of(m.group("d"))
    eat(r"\b(?:not|no|except)\s+(?P<d>" + DAYRX + r"(?:\s*(?:/|,|or|and)\s*" + DAYRX + r")*)", dout)

    def din(m):
        r.days_in = (r.days_in or set()) | days_of(m.group(0))
    eat(r"\b" + DAYRX + r"(?:\s*(?:/|,|or|and)\s*" + DAYRX + r")*", din)

    def wk(m):
        r.days_in = (r.days_in or set()) | {0, 1, 2, 3, 4}
    eat(r"\b(?:wkdays|weekdays)\b", wk)

    # 7. therapists
    def tin(*names):
        r.ther_in = (r.ther_in or set()) | set(names)

    eat(r"\br\s*/\s*j\b", lambda m: tin(THER["rachel"], THER["josee"]))

    def tout(m):
        r.ther_out.add(THER[m.group("n")])
    eat(r"\b(?:(?:anyone|any|everyone)\s+(?:but|except)|ab|not|no)\s+(?P<n>" + NAMES + r")\b", tout)
    eat(r"\b" + NAMES + r"\s+pref(?:erred)?\b")
    eat(r"\bj\s+only\b", lambda m: tin(THER["josee"]))
    eat(r"\b(?P<n>" + NAMES + r")\b", lambda m: tin(THER[m.group("n")]))

    def fem(m):
        r.female = True
    eat(r"\bfemale(?:\s+therapist)?\b", fem)

    # 8. length
    def ln(m):
        r.lens = (r.lens or set()) | {int(m.group("n"))}
    eat(r"(?<![\d:])\b(?P<n>30|45|60|90)\b(?:\s*min(?:ute)?s?)?", ln)

    def hour(m):
        r.lens = (r.lens or set()) | {60}
    eat(r"\b1\s*(?:hr|hour)s?\b", hour)

    # 9. contact preferences
    eat(r"\btext(?:\s+only|\s+don'?t call)?\b", lambda m: r.contact.add("text"))
    eat(r"\blandline\b", lambda m: r.contact.add("landline"))

    # 10. anything that still looks like a rule is "not understood"
    risky = (r"\d|\bpm\b|\bam\b|\b(?:before|after|until|till|til|except|never|cannot|can't|won't|next)\b|"
             r"\bno\b|\bnot\b|weekends?|holidays?|\bwedding\b|" + DAYRX.replace(r"\b", "") +
             r"|\bfrom\s+(?:\d|" + MONRX + r"|" + DAYRX + r")")
    for m in re.finditer(r"\b(?:" + risky + r")", t):
        r.unknown.append(m.group(0).strip())
    for p in parens:
        for m in re.finditer(r"\b(?:\bpm\b|\bam\b|before|after|until|till|til|never|cannot|can't|won't|"
                             r"not|no|weekends?|" + DAYRX + r")", p):
            r.unknown.append("(" + m.group(0) + ")")
    r.unknown = [u for u in r.unknown if u]
    return r


# ---------------------------------------------------------------- people
@dataclass
class Person:
    key: str
    lines: list = field(default_factory=list)     # (line_no, date, rule)
    names: list = field(default_factory=list)
    phone: str = ""
    rule: Rule = None
    status: str = "active"
    why: str = ""

    @property
    def full_name(self):
        full = [n for n in self.names if len(name_key(n).split()[-1]) > 1]
        return max(full or self.names, key=len)

    @property
    def first_line(self):
        return min(l[0] for l in self.lines)

    @property
    def last_line(self):
        return max(l[0] for l in self.lines)

    @property
    def first_added(self):
        return min(l[1] for l in self.lines if l[1]) if any(l[1] for l in self.lines) else None

    @property
    def last_added(self):
        return max(l[1] for l in self.lines if l[1]) if any(l[1] for l in self.lines) else None


def merge(rules):
    """Newest line wins per field group; exclusions add up."""
    out = Rule()
    for r in rules:                                  # oldest -> newest
        if r.ther_in is not None:
            out.ther_in = set(r.ther_in)
        out.ther_out |= r.ther_out
        out.female |= r.female
        out.prenatal |= r.prenatal
        out.postop |= r.postop
        if r.days_in is not None:
            out.days_in = set(r.days_in)
        out.days_out |= r.days_out
        if r.has_time:
            out.has_time = True
            out.start_min, out.start_max, out.end_max = r.start_min, r.start_max, r.end_max
        if r.lens is not None:
            out.lens = set(r.lens)
        if r.notice_h is not None:
            out.notice_h = r.notice_h
        out.day_before |= r.day_before
        if r.min_date:
            out.min_date = r.min_date
        if r.max_date:
            out.max_date = r.max_date
        out.remove = r.remove or out.remove
        out.contact |= r.contact
        out.health |= r.health
        out.unknown += r.unknown
    return out


def build_people(rows, run_date):
    """rows: dicts with line, added, name, phone, notes (in book order)."""
    people, by_phone = [], {}
    for row in rows:
        line = int(row["line"])
        added = parse_added(row["added"], run_date)
        rule = parse_note(row["notes"], run_date.year)
        nk = name_key(row["name"])
        ph = digits(row["phone"])
        p = by_phone.get(ph) if ph else None
        if p is None and not ph:
            first, last = nk.split()[0], nk.split()[-1]
            cands = [q for q in people
                     if name_key(q.full_name).split()[0] == first
                     and name_key(q.full_name).split()[-1].startswith(last[0])]
            if len(cands) == 1:
                p = cands[0]
        if p is None:
            p = Person(key=nk, phone=ph)
            people.append(p)
            if ph:
                by_phone[ph] = p
            if not ph:
                rule.unknown.append("phone not given")
        p.names.append(row["name"])
        p.lines.append((line, added, rule))
    for p in people:
        p.rule = merge([l[2] for l in sorted(p.lines)])
    return people


NICK = {"bob": "robert", "bobby": "robert", "mel": "melanie", "jen": "jennifer", "steph": "stephanie",
        "dan": "daniel", "mike": "michael", "jos": "josee", "liz": "elizabeth", "kate": "katherine",
        "nick": "nicholas", "matt": "matthew", "chris": "christopher", "tom": "thomas", "will": "william",
        "bill": "william", "jim": "james", "joe": "joseph", "ben": "benjamin", "sam": "samuel"}


def same_first(a, b):
    a, b = NICK.get(a, a), NICK.get(b, b)
    return a[:1] == b[:1]


def booked_since(person, appts):
    """A non-cancelled booking made AFTER the person's last line. Match = same last name
    and same first initial (cautious: also catches Mel/Melanie, Bob/Robert)."""
    nk = name_key(person.full_name).split()
    first, last = nk[0], nk[-1]
    cutoff = person.last_added
    for a in appts:
        if a["status"] in ("Cancelled", "Late cancel", "No-show"):
            continue
        an = name_key(a["client_name"]).split()
        if not an or an[-1] != last or not same_first(an[0], first):
            continue
        booked = dt.datetime.strptime(a["booked_at"][:10], "%Y-%m-%d").date()
        if cutoff and booked > cutoff:
            return a
    return None


def classify(people, appts, run_date, stale_days=60):
    for p in people:
        r = p.rule
        if r.remove:
            p.status, p.why = "out of date", "note says: " + r.remove
        elif r.max_date and run_date > r.max_date:
            p.status, p.why = "out of date", "availability ended " + r.max_date.isoformat()
        elif p.last_added and (run_date - p.last_added).days > stale_days:
            p.status, p.why = "out of date", f"no contact for {(run_date - p.last_added).days} days"
        else:
            a = booked_since(p, appts)
            if a:
                p.status, p.why = "out of date", "booked since asking (" + a["date"] + ")"
            elif r.unknown or p.last_added is None:
                p.status, p.why = "needs review", "note not understood: " + ", ".join(sorted(set(r.unknown)) or ["date"])
            else:
                p.status, p.why = "active", ""
    return people


def visit_count(person, appts):
    """Bookings in the export (not cancelled / late cancel / no-show) under the same last name
    and same first initial. 'Regular' = 2 or more (assumption, not from the files)."""
    nk = name_key(person.full_name).split()
    first, last = nk[0], nk[-1]
    n = 0
    for a in appts:
        if a["status"] in ("Cancelled", "Late cancel", "No-show"):
            continue
        an = name_key(a["client_name"]).split()
        if an and an[-1] == last and same_first(an[0], first):
            n += 1
    return n

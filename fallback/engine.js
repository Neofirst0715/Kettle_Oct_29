/* Kettle & Stone late-opening matcher. Rules only, no AI, no network.
 * A line-by-line translation of parsing.py + matching.py + refill.py.
 * Runs in a browser (inlined into the page) and in Node (for the parity tests).
 */
(function (root) {
  "use strict";

  // ------------------------------------------------------------------ helpers
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const DAYIDX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
  const THER = { dave: "Dave Melanson", josee: "Josée Landry", jos: "Josée Landry", rachel: "Rachel Thibodeau",
    amira: "Amira Haddad", kelsey: "Kelsey Babineau", marc: "Marc Cormier" };
  const MON_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const NAMES = String.raw`(?:dave|josee|jos|rachel|amira|kelsey|marc)`;
  const DAYRX = String.raw`(?:mon|tues?|wed|thurs?|thu|fri|sat|sun)` + String.raw`(?:day|sday|nesday|rsday|urday)?s?\b`;
  const MONRX = String.raw`(?:jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)`;
  const DATE = String.raw`(?:(?<eom>end of\s+)?(?<mon>` + MONRX + String.raw`)[a-z]*\.?(?:\s*(?<day>\d{1,2}))?)`;
  const HEALTH = String.raw`sciatica|\bl side\b|\bknee\b|\bhip\b|post-?op|replacement|rotator cuff|shoulder|` +
    String.raw`surgery|low back|\bbad\b|\bmva\b|\bclaim\b|ins pays|\bins\b|insurance|\btmj\b|` +
    String.raw`migraines?|concussion|hamstring|hockey|cancer survivor|cancer|fibro\w*|` +
    String.raw`light pressure!*|light only|no deep|deep tissue`;
  const POSTOP = /post-?op|replacement|rotator cuff|surgery/;

  const FEMALE = new Set(["Josée Landry", "Amira Haddad", "Kelsey Babineau", "Rachel Thibodeau"]);
  const PRENATAL_OK = new Set(["Amira Haddad", "Kelsey Babineau"]);
  const LOOK_FIRST = new Set(["Josée Landry"]);   // therapist wants to see the person first (assumption)
  const DEFAULT_LEN = 60;
  const DEFAULT_NOTICE_H = 2.0;
  const NICK = { bob: "robert", bobby: "robert", mel: "melanie", jen: "jennifer", steph: "stephanie", dan: "daniel",
    mike: "michael", jos: "josee", liz: "elizabeth", kate: "katherine", nick: "nicholas", matt: "matthew",
    chris: "christopher", tom: "thomas", will: "william", bill: "william", jim: "james", joe: "joseph",
    ben: "benjamin", sam: "samuel" };
  const WHY_WORDS = {
    "other therapist wanted": "wants a different therapist", "therapist excluded": "does not want this therapist",
    "female therapist only": "wants a female therapist", "therapist rule": "clinic therapist rule",
    "day": "not available that day", "day excluded": "not available that day", "too early": "needs a later time",
    "too late": "needs an earlier time", "runs too long": "needs to finish earlier",
    "opening too short": "wants a longer appointment", "not enough notice": "needs more notice",
    "needs day before": "needs to be told the day before", "away": "away until later",
    "availability ended": "availability has ended" };
  const CANCELLED = new Set(["Cancelled", "Late cancel", "No-show"]);

  function fold(s) {
    return String(s).replace(/’/g, "'").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }
  function nameKey(s) { return fold(s).replace(/[^a-z\- ]/g, "").trim(); }
  function words(s) { const t = s.trim(); return t ? t.split(/\s+/) : []; }
  function digits(s) { return String(s).replace(/\D/g, ""); }
  function toMin(h, m) {   // clock words in the book have no am/pm: 1-7 means afternoon
    h = parseInt(h, 10); m = m ? parseInt(m, 10) : 0;
    if (h >= 1 && h <= 7) h += 12;
    return h * 60 + m;
  }

  // Dates are whole days since 1970-01-01 (UTC); date-times are minutes since then.
  function ymd(y, m, d) {
    const t = Date.UTC(y, m - 1, d), x = new Date(t);
    if (x.getUTCFullYear() !== y || x.getUTCMonth() !== m - 1 || x.getUTCDate() !== d) return null;
    return t / 86400000;
  }
  function parts(day) { const x = new Date(day * 86400000); return [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()]; }
  function weekday(day) { return (new Date(day * 86400000).getUTCDay() + 6) % 7; }
  function iso(day) { const [y, m, d] = parts(day); return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
  function parseISO(s) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m ? ymd(+m[1], +m[2], +m[3]) : null; }
  function parseDT(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(String(s).trim());
    if (!m) return null;
    const d = ymd(+m[1], +m[2], +m[3]);
    return d === null ? null : d * 1440 + (+m[4]) * 60 + (+m[5]);
  }
  function lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  const fmtBD = (day) => { const [, m, d] = parts(day); return `${MON_ABBR[m - 1]} ${d}`; };            // "%b %-d"
  const fmtBDD = (day) => { const [, m, d] = parts(day); return `${MON_ABBR[m - 1]} ${String(d).padStart(2, "0")}`.replace(" 0", " "); };
  function clock12(mins, upper) {   // "%-I:%M %p"
    const h = Math.floor(mins / 60), mm = mins % 60, h12 = ((h % 12) + 12) % 12 || 12;
    const ap = h >= 12 ? "PM" : "AM";
    return `${h12}:${String(mm).padStart(2, "0")} ${upper ? ap : ap.toLowerCase()}`;
  }
  function _clock(m) { const h = Math.floor(m / 60), mm = m % 60; return `${(((h - 1) % 12) + 12) % 12 + 1}:${String(mm).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`; }
  // Python-compatible number formatting
  function fmtG(x) { return String(Number(Number(x).toPrecision(6))); }                    // "{:g}"
  function fmt1(x) {                                                                        // "{:.1f}" (half-even on exact ties)
    const t = x * 10;
    if (Number.isInteger(x * 4) && Math.abs(t % 1) === 0.5) { const f = Math.floor(t); return ((f % 2 === 0 ? f : f + 1) / 10).toFixed(1); }
    return x.toFixed(1);
  }
  const round1 = (x) => Number(fmt1(x));
  const numSort = (a, b) => a - b;
  const strSort = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  // ------------------------------------------------------------------ CSV
  function parseCSV(text) {
    text = String(text).replace(/^﻿/, "");
    const rows = []; let row = [], f = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(f); f = ""; rows.push(row); row = [];
      } else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    const head = rows.shift() || [];
    return rows.filter((r) => r.length > 1 || r[0] !== "").map((r) => {
      const o = {}; head.forEach((h, i) => { o[h] = r[i] === undefined ? "" : r[i]; }); return o;
    });
  }

  // ------------------------------------------------------------------ one note
  function newRule() {
    return { ther_in: null, ther_out: new Set(), female: false, prenatal: false, postop: false, days_in: null,
      days_out: new Set(), has_time: false, start_min: null, start_max: null, end_max: null, lens: null,
      notice_h: null, day_before: false, min_date: null, max_date: null, remove: null, contact: new Set(),
      health: false, unknown: [] };
  }

  function dateFrom(g, year) {
    const mon = MONTHS[g.mon.slice(0, 3)];
    if (g.eom) return ymd(year, mon, lastDay(year, mon));
    if (!g.day) return null;
    return ymd(year, mon, parseInt(g.day, 10));
  }

  function parseAdded(text, runDay) {
    const t = fold(text).trim().replace(/\.+$/, "");
    let mo, d, m = /^([a-z]+)\.?\s+(\d{1,2})$/.exec(t);
    if (m && MONTHS[m[1].slice(0, 3)]) { mo = MONTHS[m[1].slice(0, 3)]; d = +m[2]; }
    else {
      m = /^(\d{1,2})\/(\d{1,2})$/.exec(t);
      if (!m) return null;
      mo = +m[1]; d = +m[2];
    }
    const y = parts(runDay)[0];
    let out = ymd(y, mo, d);
    if (out === null) return null;
    if (out > runDay + 1) out = ymd(y - 1, mo, d);
    return out;
  }

  function parseNote(note, year) {
    const r = newRule();
    let t = " " + fold(note) + " ";
    function eat(rx, fn) {
      t = t.replace(new RegExp(rx, "g"), function () {
        const a = arguments, last = a[a.length - 1];
        const g = (last && typeof last === "object") ? last : {};
        if (fn) fn({ 0: a[0], g });
        return " ".repeat(a[0].length);
      });
    }
    const parens = []; t.replace(/\(([^)]*)\)/g, (_, p) => { parens.push(p); return _; });
    eat(String.raw`\([^)]*\)`);

    // 1. explicit removal
    const rm = (why) => () => { r.remove = why; };
    eat(String.raw`not in service`, rm("number not in service"));
    eat(String.raw`\bmoved to \w+`, rm("moved away"));
    eat(String.raw`going to someone[^,;.]*|found someone[^,;.]*`, rm("going elsewhere"));
    eat(String.raw`\btake off\b`, rm("asked to be taken off"));

    // 2. dated limits
    eat(String.raw`\baway\b[^,;.]*?\b(?:until|till|til)\s+` + DATE, (m) => { const d = dateFrom(m.g, year); if (d !== null) r.min_date = d + 1; });
    const onlyTil = (m) => { const d = dateFrom(m.g, year); if (d !== null) r.max_date = d; };
    eat(String.raw`\b(?:only|here)\b[^,;.]*?\b(?:until|till|til)\s+` + DATE, onlyTil);
    eat(String.raw`(?:wants one\s+)?\bbefore\s+(?:her\s+|the\s+)?wedding\s+(?:on\s+)?` + DATE, onlyTil);
    eat(String.raw`\bfrom\s+` + DATE, (m) => { const d = dateFrom(m.g, year); if (d !== null) r.min_date = d; });

    // 3. health words: recognised, flagged, ignored
    eat(String.raw`\bpregnan\w*\b,?\s*(?:\d+\s*(?:wks?|weeks?)\b|\d+(?:st|nd|rd|th)\s*tri\w*)?`, () => { r.prenatal = true; r.health = true; });
    eat(String.raw`(?:wants|can do)?\s*\d+\s*(?:min)?\s*if\s+[^,;.]*`);   // conditional lengths are wishes, not rules
    eat(HEALTH, (m) => { r.health = true; if (POSTOP.test(m[0])) r.postop = true; });

    // 4. notice
    eat(String.raw`\b(?:can come in|needs?)\s+(?:(?<an>an?\s+hour)|(?<a>\d+)(?:\s*-\s*(?<b>\d+))?\s*(?<u>hours?|hrs?|h\b|min(?:ute)?s?))`, (m) => {
      if (m.g.an) { r.notice_h = 1.0; return; }
      const a = parseInt(m.g.a, 10), b = m.g.b ? parseInt(m.g.b, 10) : a, n = Math.max(a, b);
      r.notice_h = m.g.u.startsWith("min") ? n / 60 : n;
    });
    eat(String.raw`(?<n>\d+)\s*min(?:ute)?s?\s+notice(?:\s+ok)?`, (m) => { r.notice_h = parseInt(m.g.n, 10) / 60; });
    eat(String.raw`(?<n>\d+)\s*(?:hrs?|hours?)\s+notice(?:\s+ok)?`, (m) => { r.notice_h = parseFloat(m.g.n); });
    eat(String.raw`\bnext day only\b|\b(?:told |need |needs )?(?:the )?day before\b`, () => { r.day_before = true; });
    eat(String.raw`\bsame day(?: ok)?\b`, () => { r.notice_h = 0.0; });
    eat(String.raw`\bcan come quick\b`, () => { r.notice_h = 1.0; });

    // 5. times of day
    eat(String.raw`\b(?:done|finished|out|ends?)\s+by\s+(?<h>\d{1,2})(?::(?<m>\d\d))?`, (m) => { r.has_time = true; r.end_max = toMin(m.g.h, m.g.m); });
    eat(String.raw`(?:on his lunch\s+)?(?<![\d:])(?<h1>\d{1,2})-(?<h2>\d{1,2})(?![\d:])\s*(?:only)?`, (m) => {
      r.has_time = true;
      const a = toMin(m.g.h1); let b = toMin(m.g.h2);
      if (b <= a) b += 12 * 60;
      r.start_min = a; r.start_max = b + 1;   // window = when it may START (end of hour inclusive)
    });
    eat(String.raw`\b(?:not before|no earlier than|after|from|starting)\s+(?<h>\d{1,2})(?::(?<m>\d\d))?(?!\d)`, (m) => { r.has_time = true; r.start_min = toMin(m.g.h, m.g.m); });
    eat(String.raw`\b(?:am|mornings?)\b`, () => { r.has_time = true; r.start_max = 12 * 60; });
    eat(String.raw`\bafternoons?\b`, () => { r.has_time = true; r.start_min = Math.max(r.start_min || 0, 12 * 60); });
    eat(String.raw`\bevenings?\b`, () => { r.has_time = true; if (r.start_min === null) r.start_min = 17 * 60; });
    eat(String.raw`\blunch\b`, () => { r.has_time = true; if (r.start_min === null) { r.start_min = 12 * 60; r.end_max = 13 * 60; } });

    // 6. days
    const daysOf = (s) => new Set((s.match(new RegExp(DAYRX, "g")) || []).map((d) => DAYIDX[d.slice(0, 3)]));
    eat(String.raw`\b(?:not|no|except)\s+(?<d>` + DAYRX + String.raw`(?:\s*(?:/|,|or|and)\s*` + DAYRX + String.raw`)*)`, (m) => { daysOf(m.g.d).forEach((d) => r.days_out.add(d)); });
    eat(String.raw`\b` + DAYRX + String.raw`(?:\s*(?:/|,|or|and)\s*` + DAYRX + String.raw`)*`, (m) => { r.days_in = r.days_in || new Set(); daysOf(m[0]).forEach((d) => r.days_in.add(d)); });
    eat(String.raw`\b(?:wkdays|weekdays)\b`, () => { r.days_in = r.days_in || new Set(); [0, 1, 2, 3, 4].forEach((d) => r.days_in.add(d)); });

    // 7. therapists
    const tin = (...ns) => { r.ther_in = r.ther_in || new Set(); ns.forEach((n) => r.ther_in.add(n)); };
    eat(String.raw`\br\s*/\s*j\b`, () => tin(THER.rachel, THER.josee));
    eat(String.raw`\b(?:(?:anyone|any|everyone)\s+(?:but|except)|ab|not|no)\s+(?<n>` + NAMES + String.raw`)\b`, (m) => { r.ther_out.add(THER[m.g.n]); });
    eat(String.raw`\b` + NAMES + String.raw`\s+pref(?:erred)?\b`);
    eat(String.raw`\bj\s+only\b`, () => tin(THER.josee));
    eat(String.raw`\b(?<n>` + NAMES + String.raw`)\b`, (m) => tin(THER[m.g.n]));
    eat(String.raw`\bfemale(?:\s+therapist)?\b`, () => { r.female = true; });

    // 8. length
    eat(String.raw`(?<![\d:])\b(?<n>30|45|60|90)\b(?:\s*min(?:ute)?s?)?`, (m) => { r.lens = r.lens || new Set(); r.lens.add(parseInt(m.g.n, 10)); });
    eat(String.raw`\b1\s*(?:hr|hour)s?\b`, () => { r.lens = r.lens || new Set(); r.lens.add(60); });

    // 9. contact preferences
    eat(String.raw`\btext(?:\s+only|\s+don'?t call)?\b`, () => r.contact.add("text"));
    eat(String.raw`\blandline\b`, () => r.contact.add("landline"));

    // 10. anything that still looks like a rule is "not understood"
    const risky = String.raw`\d|\bpm\b|\bam\b|\b(?:before|after|until|till|til|except|never|cannot|can't|won't|next)\b|` +
      String.raw`\bno\b|\bnot\b|weekends?|holidays?|\bwedding\b|` + DAYRX.split("\\b").join("") +
      String.raw`|\bfrom\s+(?:\d|` + MONRX + "|" + DAYRX + ")";
    for (const m of t.matchAll(new RegExp(String.raw`\b(?:` + risky + ")", "g"))) r.unknown.push(m[0].trim());
    const prx = new RegExp(String.raw`\b(?:\bpm\b|\bam\b|before|after|until|till|til|never|cannot|can't|won't|not|no|weekends?|` + DAYRX + ")", "g");
    for (const p of parens) for (const m of p.matchAll(prx)) r.unknown.push("(" + m[0] + ")");
    r.unknown = r.unknown.filter((u) => u);
    return r;
  }

  // ------------------------------------------------------------------ people
  function fullName(p) {
    const full = p.names.filter((n) => { const w = words(nameKey(n)); return w.length && w[w.length - 1].length > 1; });
    const pool = full.length ? full : p.names;
    return pool.reduce((best, n) => (n.length > best.length ? n : best), pool[0]);
  }
  const firstLine = (p) => Math.min(...p.lines.map((l) => l.line));
  const lastLine = (p) => Math.max(...p.lines.map((l) => l.line));
  const addedDates = (p) => p.lines.map((l) => l.added).filter((d) => d !== null);
  const firstAdded = (p) => { const d = addedDates(p); return d.length ? Math.min(...d) : null; };
  const lastAdded = (p) => { const d = addedDates(p); return d.length ? Math.max(...d) : null; };

  function merge(rules) {
    const out = newRule();
    for (const r of rules) {
      if (r.ther_in !== null) out.ther_in = new Set(r.ther_in);
      r.ther_out.forEach((x) => out.ther_out.add(x));
      out.female = out.female || r.female; out.prenatal = out.prenatal || r.prenatal; out.postop = out.postop || r.postop;
      if (r.days_in !== null) out.days_in = new Set(r.days_in);
      r.days_out.forEach((x) => out.days_out.add(x));
      if (r.has_time) { out.has_time = true; out.start_min = r.start_min; out.start_max = r.start_max; out.end_max = r.end_max; }
      if (r.lens !== null) out.lens = new Set(r.lens);
      if (r.notice_h !== null) out.notice_h = r.notice_h;
      out.day_before = out.day_before || r.day_before;
      if (r.min_date !== null) out.min_date = r.min_date;
      if (r.max_date !== null) out.max_date = r.max_date;
      out.remove = r.remove || out.remove;
      r.contact.forEach((x) => out.contact.add(x));
      out.health = out.health || r.health;
      out.unknown = out.unknown.concat(r.unknown);
    }
    return out;
  }

  function buildPeople(rows, runDay) {
    const people = [], byPhone = {}, year = parts(runDay)[0];
    for (const row of rows) {
      const line = parseInt(row.line, 10), added = parseAdded(row.added, runDay);
      const rule = parseNote(row.notes || "", year);
      const nk = nameKey(row.name), ph = digits(row.phone);
      let p = ph ? byPhone[ph] || null : null;
      if (p === null && !ph) {
        const w = words(nk), first = w[0], last = w[w.length - 1];
        const cands = people.filter((q) => { const qw = words(nameKey(fullName(q))); return qw[0] === first && qw[qw.length - 1].startsWith(last[0]); });
        if (cands.length === 1) p = cands[0];
      }
      if (p === null) {
        p = { key: nk, phone: ph, lines: [], names: [], rule: null, status: "active", why: "" };
        people.push(p);
        if (ph) byPhone[ph] = p; else rule.unknown.push("phone not given");
      }
      p.names.push(row.name);
      p.lines.push({ line, added, rule });
    }
    for (const p of people) p.rule = merge(p.lines.slice().sort((a, b) => a.line - b.line).map((l) => l.rule));
    return people;
  }

  function sameFirst(a, b) { a = NICK[a] || a; b = NICK[b] || b; return a.slice(0, 1) === b.slice(0, 1); }

  function bookedSince(p, appts) {
    const nk = words(nameKey(fullName(p))), first = nk[0], last = nk[nk.length - 1], cutoff = lastAdded(p);
    for (const a of appts) {
      if (CANCELLED.has(a.status)) continue;
      const an = words(nameKey(a.client_name || ""));
      if (!an.length || an[an.length - 1] !== last || !sameFirst(an[0], first)) continue;
      const booked = parseISO(String(a.booked_at).slice(0, 10));
      if (cutoff !== null && booked !== null && booked > cutoff) return a;
    }
    return null;
  }

  function classify(people, appts, runDay, staleDays = 60) {
    for (const p of people) {
      const r = p.rule, la = lastAdded(p);
      if (r.remove) { p.status = "out of date"; p.why = "note says: " + r.remove; }
      else if (r.max_date !== null && runDay > r.max_date) { p.status = "out of date"; p.why = "availability ended " + iso(r.max_date); }
      else if (la !== null && runDay - la > staleDays) { p.status = "out of date"; p.why = `no contact for ${runDay - la} days`; }
      else {
        const a = bookedSince(p, appts);
        if (a) { p.status = "out of date"; p.why = "booked since asking (" + a.date + ")"; }
        else if (r.unknown.length || la === null) { p.status = "needs review"; p.why = "note not understood: " + ([...new Set(r.unknown)].sort(strSort).join(", ") || "date"); }
        else { p.status = "active"; p.why = ""; }
      }
    }
    return people;
  }

  // ------------------------------------------------------------------ matching
  function parseOpening(row) {
    const start = parseDT(row.date + " " + row.start), canc = parseDT(row.cancelled_at);
    if (start === null || canc === null) throw new Error("Opening " + (row.opening_id || "?") + ": date or time not readable");
    return { id: row.opening_id, start, cancelled: canc, length: parseInt(row.length_min, 10),
      therapist: String(row.therapist).trim(), notice_h: (start - canc) / 60 };
  }

  function check(p, o) {
    const r = p.rule, t = o.therapist, mins = o.start % 1440, day = weekday(Math.floor(o.start / 1440));
    if (r.ther_in && r.ther_in.size && !r.ther_in.has(t)) return "other therapist wanted";
    if (r.ther_out.has(t)) return "therapist excluded";
    if (r.female && !FEMALE.has(t)) return "female therapist only";
    if (r.prenatal && !PRENATAL_OK.has(t)) return "therapist rule";
    if (r.postop && !(r.ther_in && r.ther_in.size) && t !== "Josée Landry") return "therapist rule";
    if (r.days_in !== null && !r.days_in.has(day)) return "day";
    if (r.days_out.has(day)) return "day excluded";
    if (r.start_min !== null && mins < r.start_min) return "too early";
    if (r.start_max !== null && mins >= r.start_max) return "too late";
    if (r.end_max !== null && mins + o.length > r.end_max) return "runs too long";
    const shortest = r.lens && r.lens.size ? Math.min(...r.lens) : DEFAULT_LEN;
    if (o.length < shortest) return "opening too short";
    const need = r.notice_h !== null ? r.notice_h : DEFAULT_NOTICE_H;
    if (o.notice_h < need) return "not enough notice";
    if (r.day_before && Math.floor(o.cancelled / 1440) >= Math.floor(o.start / 1440)) return "needs day before";
    const d = Math.floor(o.start / 1440);
    if (r.min_date !== null && d < r.min_date) return "away";
    if (r.max_date !== null && d > r.max_date) return "availability ended";
    return null;
  }

  const byAsked = (a, b) => ((firstAdded(a) ?? Infinity) - (firstAdded(b) ?? Infinity)) || (firstLine(a) - firstLine(b));
  const needH = (p) => (p.rule.notice_h !== null ? p.rule.notice_h : DEFAULT_NOTICE_H);
  const byFastest = (a, b) => (needH(a) - needH(b)) || byAsked(a, b);

  function match(people, o, top = 3) {
    const fits = [], rejected = [];
    for (const p of people) {
      if (p.status !== "active") { rejected.push([p, p.why]); continue; }
      const why = check(p, o);
      if (why) rejected.push([p, why]); else fits.push(p);
    }
    fits.sort(byAsked);
    return { shown: fits.slice(0, top), fits, rejected };
  }

  function requirements(p, o) {
    const r = p.rule, t = o.therapist, first = (s) => s.split(" ")[0], out = [];
    const day = weekday(Math.floor(o.start / 1440)), dday = Math.floor(o.start / 1440);
    if (r.ther_in && r.ther_in.size) out.push(["Therapist", "only " + [...r.ther_in].sort(strSort).map(first).join(" or "), first(t), false]);
    else if (r.ther_out.size) out.push(["Therapist", "not " + [...r.ther_out].sort(strSort).map(first).join(", "), first(t), false]);
    else if (r.female || r.prenatal || r.postop) out.push(["Therapist", "clinic therapist rule", first(t), false]);
    else out.push(["Therapist", "any", first(t), false]);
    if (r.days_in !== null) out.push(["Day", "only " + [...r.days_in].sort(numSort).map((d) => DAY_ABBR[d]).join("/"), DAY_ABBR[day], false]);
    else if (r.days_out.size) out.push(["Day", "not " + [...r.days_out].sort(numSort).map((d) => DAY_ABBR[d]).join("/"), DAY_ABBR[day], false]);
    const bits = [];
    if (r.start_min !== null) bits.push("from " + _clock(r.start_min));
    if (r.start_max !== null) bits.push("before " + _clock(r.start_max));
    if (r.end_max !== null) bits.push("done by " + _clock(r.end_max));
    if (bits.length) out.push(["Time", bits.join(", "), clock12(o.start % 1440, false) + ` (${o.length} min)`, false]);
    if (r.lens && r.lens.size) out.push(["Length", [...r.lens].sort(numSort).join(" or ") + " min", `${o.length} min`, false]);
    else out.push(["Length", "60 min (assumed)", `${o.length} min`, true]);
    const need = needH(p);
    const nt = (need < 1 ? `${(need * 60).toFixed(0)} min` : `${fmtG(need)} h`) + (r.notice_h === null ? " (assumed)" : "");
    out.push(["Notice", nt, `${fmt1(o.notice_h)} h`, r.notice_h === null]);
    if (r.min_date !== null) out.push(["Available", "from " + fmtBD(r.min_date), fmtBD(dday), false]);
    if (r.max_date !== null) out.push(["Available", "until " + fmtBD(r.max_date), fmtBD(dday), false]);
    return out;
  }

  // ------------------------------------------------------------------ whole run (refill.py)
  function since(p) { const d = firstAdded(p); return d !== null ? fmtBDD(d) : "?"; }
  function fmtWhen(m) { const d = Math.floor(m / 1440), [, mo, dd] = parts(d), mm = m % 1440;
    return `${DAY_ABBR[weekday(d)]} ${MON_ABBR[mo - 1]} ${dd}, ${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`; }
  function fmtCancelled(m) { const d = Math.floor(m / 1440), [, mo, dd] = parts(d);
    return `${DAY_ABBR[weekday(d)]} ${MON_ABBR[mo - 1]} ${dd}, ${clock12(m % 1440, true)}`; }

  function personRow(p, i, total, o, phones, order) {
    const why = order === "asked"
      ? `Asked first: waiting since ${since(p)} (rank ${i} of ${total}) · needs ${fmtG(needH(p))} h notice, this one has ${fmt1(o.notice_h)} h`
      : `Fastest to arrive: needs only ${fmtG(needH(p))} h notice (this one has ${fmt1(o.notice_h)} h) · waiting since ${since(p)}`;
    let ph = "";
    for (const n of p.names) { const v = phones[n]; if (v && v.toLowerCase() !== "same #") { ph = v; break; } }
    return { name: fullName(p), phone: ph, reason: why, look_first: LOOK_FIRST.has(o.therapist),
      text_only: p.rule.contact.has("text"), checks: requirements(p, o) };
  }

  const REQUIRED = {
    openings: ["opening_id", "date", "start", "length_min", "therapist", "cancelled_at"],
    waitlist: ["line", "added", "name", "phone", "notes"],
    appointments: ["client_name", "status", "booked_at", "date"],
    key: ["id", "answer"] };

  function checkColumns(kind, rows) {
    if (!rows.length) return `The ${kind} file is empty.`;
    const miss = REQUIRED[kind].filter((c) => !(c in rows[0]));
    return miss.length ? `The ${kind} file is missing columns: ${miss.join(", ")}.` : null;
  }

  function score(results, keyRows) {
    const k = {}; keyRows.forEach((r) => { k[r.id] = r.answer; });
    let hit = 0; const detail = {};
    for (const r of results) {
      const ans = k[r.id] !== undefined ? k[r.id] : "none";
      const names = ans.trim().toLowerCase() === "none" ? [] : ans.split(";").filter((x) => x.trim()).map((x) => words(x).slice(1).join(" "));
      const want = new Set(names.map(nameKey));
      let ok = true;
      for (const lst of [r.shown, r.shown_reg]) {
        const got = lst.map((s) => nameKey(s.name));
        ok = ok && (want.size ? got.length > 0 && got.every((g) => want.has(g)) : got.length === 0);
      }
      hit += ok ? 1 : 0;
      detail[r.id] = { ok, tanya: names };
    }
    return { hit, detail };
  }

  function run({ openings, waitlist, appointments, today, key }) {
    const runDay = parseISO(today);
    if (runDay === null) throw new Error("The day of use is not a date.");
    const phones = {}; waitlist.forEach((r) => { phones[r.name] = r.phone; });
    const people = classify(buildPeople(waitlist, runDay), appointments, runDay);
    const nOld = people.filter((p) => p.status !== "active").length;
    const results = [], log = []; let changed = 0;
    for (const row of openings) {
      const o = parseOpening(row), m = match(people, o);
      const fitsReg = m.fits.slice().sort(byFastest), shownReg = fitsReg.slice(0, 3);
      const a = new Set(m.shown.map((p) => p.key)), b = new Set(shownReg.map((p) => p.key));
      if (a.size !== b.size || [...a].some((x) => !b.has(x))) changed++;
      const res = { id: o.id, when: fmtWhen(o.start), length: o.length, therapist: o.therapist,
        cancelled: fmtCancelled(o.cancelled), notice_h: round1(o.notice_h),
        funnel: { total: people.length, waiting: people.length - nOld, fit: m.fits.length, shown: m.shown.length },
        shown: m.shown.map((p, i) => personRow(p, i + 1, m.fits.length, o, phones, "asked")),
        shown_reg: shownReg.map((p, i) => personRow(p, i + 1, m.fits.length, o, phones, "reg")),
        more: m.fits.length - m.shown.length,
        ruled_out: m.rejected.filter(([p]) => p.status === "active").map(([p, w]) => ({ name: fullName(p), why: WHY_WORDS[w] || w })),
        others_fit: m.fits.slice(3).map(fullName) };
      res.shown.forEach((s) => log.push([o.id, "shown", s.name, s.reason]));
      m.rejected.forEach(([p, w]) => log.push([o.id, "not shown", fullName(p), p.status === "needs review" ? "note not understood" : w.split(":")[0]]));
      results.push(res);
    }
    const review = people.filter((p) => p.status === "needs review").map((p) => ({ name: fullName(p) }));
    const old = people.filter((p) => p.status === "out of date").map((p) => ({ name: fullName(p), why: p.why }));
    let sc = null;
    if (key && key.length) { sc = score(results, key); results.forEach((r) => { r.check = sc.detail[r.id]; }); }
    return { today, results, needs_review: review, out_of_date: old, score: sc ? sc.hit : null, order_changes: changed, log,
      people_count: people.length };
  }

  const api = { parseCSV, run, checkColumns, parseNote, buildPeople, classify, match, parseOpening, fold, nameKey };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.KettleEngine = api;
})(typeof window !== "undefined" ? window : this);

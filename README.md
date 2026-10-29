# Kettle & Stone: who to call for a late opening

Volta Anchor · Sprint 2 · *Refill Kettle & Stone's late cancellations* · Zhenzhao (Neo) Li

When a client cancels late, the front desk has to find someone on the waitlist who can take the slot. Today that means reading a handwritten book from the top and judging each line from memory. This tool reads the waitlist, drops people who are out of date, and shows the desk **up to 3 people who fit the opening, one at a time**, with a check of each person's own limits. If nobody fits, it says so.

It runs on the desk computer only. **Nothing is sent anywhere, nothing is booked automatically, and no health details appear on screen.** Tanya still makes the call and books in Kneadly.


---

## Results on the sample (Sep 21 – Oct 17, list as of Oct 21)

| Check | Result |
|---|---|
| 44 openings vs Tanya's own answers (both call orders) | **44 / 44** |
| Last week only (O34–O44) | 11 / 11 |
| Tanya's active / out-of-date labels, 45 people | 45 / 45 |
| 20 reworded notes the rules had never seen | 0 wrong people shown, 4 sent to "Needs a look" |
| Taking the top 3 lines of the book instead | 0 / 44 (127 of 132 names wrong) |
| Timed test: book vs tool (10 openings, fixed random seed) | book 91.6 s and 2 of 5 right; **tool 6.9 s and 5 of 5 right** |
| Weekly upkeep: typing 6 new waitlist lines | 3.2 minutes |
| From a fresh download to the results page (Mac) | 3 min 19 s |

**Caveat:** I wrote the rules after reading Tanya's answer key, so 44/44 is a best case. The fair tests are the reworded notes and new files the tool has not seen.

---

## Quick start

You need Python 3.9 or newer (free, from python.org). No other packages.

1. Put this week's three files in the `data` folder, and nothing else:
   - the late openings, the typed waitlist, and the booking export (CSV).
   - File names don't matter; each file is recognised by its columns.
2. Start it:
   - **Mac:** double-click `start.command`. The first time, macOS may block it: open *System Settings → Privacy & Security* and click **Open Anyway**.
   - **Windows:** double-click `start.bat`.
   - **Any computer, from a terminal:** `python3 -m backend.server`
3. The results page opens in the browser by itself. Keep the start window open while you use it.

Check before you trust the page: the **day of use** at the top is today, and there is **no orange box**. An orange box means sample files (`day-of-use.txt` or an answers file) are still in `data`.

**No Python?** Open `fallback/kettle-refill.html` in Chrome, Edge or Safari, drop the three files on it, and press *Show who to call*. It uses the same rules and gives exactly the same names.

The `data` folder ships with the sample, so the first start shows the sample results (44/44 against Tanya's answers, with the orange box). Step-by-step instructions for the desk are in [`HOW-TO-RUN.md`](HOW-TO-RUN.md).

---

## Using the page

- **Left:** every late opening, grouped by day. The number is how many people to call; "–" means nobody fits; ✓ means booked.
- **Right:** the selected opening.
  - `45 in the book → 30 still waiting → 4 fit → 3 to call` shows how the list was narrowed.
  - **Call this one now:** name, phone, why this person is first, and a checklist of their own limits against this opening (for example *Therapist: only Josée or Rachel · this: Josée ✓*).
  - **No answer / said no** moves to the next person; **Booked it** marks the opening filled and tells you to call nobody else. Only one person is highlighted at a time, so two people can't both say yes.
  - **Why the others were not offered:** one line for each person.
- **Who gets the first call:** *Asked first* (Tanya's way) or *Fastest to arrive* (least notice needed first).
- **Bottom:** *Needs a look* (notes the rules couldn't read, never offered) and *Cross these off the book* (out of date).

---

## How it decides (fixed rules, no AI)

1. **Read each note** into fixed limits: therapist (only / not), days, time of day, length, notice and date limits. Lines for one person are joined by phone number ("same #" by first name and last initial), and **the newest line wins**. Tanya's defaults fill gaps: 60 minutes, 2 hours' notice.
2. **Drop people who are out of date:** no contact for over 2 months, moved, number not in service, asked to come off, a date limit passed, or a **booking in the export made after their last line** (same last name and first initial; nicknames like Bob = Robert).
3. **Check every remaining person against the opening:** therapist, the clinic rules (pregnant: Amira or Kelsey only; post-op with no therapist named: Josée; female only), day, start time, finish time, length, notice, date limits. One failed check means no.
4. **Order and show up to 3.**

**When unsure, don't show.** If a note still contains something that looks like a limit after reading (a number, "before", "not", a day), that person goes to *Needs a look* instead of being guessed. A wrong name is worse than a missing one.

**Health details** are recognised only to apply the clinic rules, then dropped. They never appear on screen or in the run log; a health-based rule shows as "clinic therapist rule".

---

## Input files

| File | Needed columns | Comes from |
|---|---|---|
| Late openings | `opening_id, date, start, length_min, therapist, cancelled_at` | the list of late cancellations and no-shows |
| Waitlist | `line, added, name, phone, notes` | Tanya's typed copy of the green book |
| Booking export | `client_name, status, booked_at, date` | Julie's weekly Kneadly export |
| Tanya's answers (optional) | `id, answer` | only for checking; never use in a real run |

Extra columns are ignored. A missing column, a missing file, or two files of the same kind is reported in plain words and nothing is calculated. There is no database: the tool re-reads these files on every run (about 0.3 s), so there is only ever one copy of the data.

---

## Privacy

- The backend listens on `127.0.0.1` only: no other computer can reach it, and it serves only the page, never the data or code files.
- The page makes requests to that computer only. The no-install page has a security setting that blocks every network connection.
- Kept on disk: the files in `data` (as today) and a run log per run in `logs/` (who was shown, and why the others were not; no health details).

---

## Project layout

```
kettle/
├── start.command / start.bat     double-click to start (Mac / Windows)
├── HOW-TO-RUN.md                 steps for the front desk
├── data/                         this week's files (ships with the sample)
├── logs/                         run logs
├── backend/                      the Python program
│   ├── datasource.py             reads the data folder; the one place to swap in a database later
│   ├── parsing.py                notes → limits; who is out of date
│   ├── matching.py               checks each person against an opening; clinic rules
│   ├── service.py                one run: rows in, results out
│   ├── server.py                 serves the page and /api/results on 127.0.0.1
│   └── cli.py                    command-line run, for checks
├── frontend/                     the page (display and call buttons only, no rules)
├── fallback/                     the same rules as one browser page (no Python needed)
│   ├── kettle-refill.html        the built page
│   └── engine.js, app.js, page.html, build.py
├── samples/sep21-oct17/          clean copy of the sample files
├── tests/                        every check (see below), plus the timed test
├── research/value_count.py       Value risk: how many openings a perfect list could fill
└── docs/                         hand-off plan, four-risk research, demo notes, AI conversation
```

---

## Checks

Run everything from the `kettle` folder (about 15 seconds; the browser tests need Playwright and the fallback comparison needs Node):

```bash
bash tests/run_all.sh
```

| Script | What it checks |
|---|---|
| `tests/evaluate.py` | 44 sample openings and the last week against Tanya's answers |
| `tests/test_reworded.py` | 20 notes in wording the rules hadn't seen: no wrong person shown |
| `tests/inspect_people.py` | each person's status against Tanya's active / out-of-date labels |
| `tests/parity/` | backend and fallback page give identical results on 7 data sets, including 400 random notes and 3 run dates |
| `tests/backend_test.py` | 28 end-to-end checks with a real browser: opens on results, call flow, order switch, refresh, plain-language errors, the orange warning, local-only requests, no file access outside the page, no health words on screen |
| `tests/fallback_browser_test.py` | 16 checks of the no-install page |
| `tests/timed/timed-test.html` | the human timed test (book vs tool); results in `tests/timed/results-2026-10-29.txt` |
| `research/value_count.py` | Value risk count: fillable openings at 90, 150 and 210 minutes |

Command-line run of the same rules:

```bash
python3 -m backend.cli --openings OPEN.csv --waitlist WAIT.csv --appointments EXPORT.csv --today YYYY-MM-DD [--key KEY.csv]
```

---

## After hand-off

- **Tanya, Fridays (about 3 minutes):** type the week's new waitlist lines, save the three files in `data`, and cross off the people listed under *Cross these off the book*.
- **Julie:** no new task. **Marc:** optionally switch on the daily report, so the booked check is never more than a day old.
- **Cost:** $0 a month.
- **Switch off:** close the start window, or delete the folder.

Details, including what happens when it gets one wrong, are in [`docs/kettle-stone-hand-off-plan.docx`](docs/kettle-stone-hand-off-plan.docx).

## Known limits

- **It can't reach the clinic's 70% target alone.** Even a perfect list fills about 50–57% of the sample openings, because many cancellations come overnight for mornings, before anyone is free at 10:30. That part needs a process change.
- **The booked check only sees appointments inside the export's dates**; a booking for a later date is missed until the next export.
- **New shorthand** is held back under *Needs a look*, which can mean fewer names.
- **Notice** is counted from the cancellation to the start, as in Tanya's answers, not from when she actually calls.
- **Double entry:** with the paper book, each new person is written twice. Next step: type new people straight into the one sheet and drop the book.
- **Therapists and clinic rules are in the code** (`backend/matching.py`, `backend/parsing.py`). Next step: a settings sheet the desk can edit.
- **Daily use** needs each new opening in the openings file; taking them straight from the booking export is not built yet.
- **Not yet run on the clinic's own Windows computer.**

## Documents

- [`docs/kettle-stone-hand-off-plan.docx`](docs/kettle-stone-hand-off-plan.docx): who looks after it, cost, what happens when it's wrong, and the one-page note for Marc (done check 3)
- [`docs/kettle-stone-four-risk-research.docx`](docs/kettle-stone-four-risk-research.docx): value, feasibility, usability and viability, with pass marks and results
- [`docs/kettle-stone-sprint2-demo-notes.docx`](docs/kettle-stone-sprint2-demo-notes.docx): demo talk track, measurements, and likely questions
- [`docs/ai-conversation-2026-10-29.md`](docs/ai-conversation-2026-10-29.md): the AI conversation from Oct 29

The sample data is simulated and comes from the Volta Anchor discovery materials.

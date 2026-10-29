const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, AlignmentType, LevelFormat, BorderStyle, Footer, PageNumber, PageBreak,
} = require("docx");

const FONT = "Arial";
const W = 9360; // content width, US Letter with 1" margins
const ACC = "35665A", MUT = "6B726E", LINE = "D9D2C3", HEAD_BG = "E6EFE9", FILL_BG = "FFF4D6";

// ---------- helpers
const t = (text, o = {}) => new TextRun({ text, font: FONT, ...o });
function runs(s, base = {}) {
  // **bold** and [[TO FILL: ...]] markers
  const out = [];
  s.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/).forEach((part) => {
    if (!part) return;
    if (part.startsWith("**")) out.push(t(part.slice(2, -2), { ...base, bold: true }));
    else if (part.startsWith("[[")) out.push(t(part.slice(2, -2), { ...base, bold: true, highlight: "yellow" }));
    else out.push(t(part, base));
  });
  return out;
}
const P = (s, o = {}) => new Paragraph({ children: runs(s, o.run || {}), spacing: { after: 120, line: 276 }, ...o.para });
const H1 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(s)], spacing: { before: 320, after: 140 } });
const H2 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(s)], spacing: { before: 220, after: 100 } });
const B = (s, level = 0) => new Paragraph({ numbering: { reference: "bul", level }, children: runs(s), spacing: { after: 60, line: 264 } });
let numInst = 0, lastWasN = false;
const N = (s) => { if (!lastWasN) numInst++; lastWasN = true; const p = new Paragraph({ numbering: { reference: "num", level: 0, instance: numInst }, children: runs(s), spacing: { after: 60, line: 264 } }); p.__isN = true; return p; };
const Q = (s) => new Paragraph({ children: runs(s, { italics: true, color: "3D4743" }), indent: { left: 360 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACC, space: 10 } }, spacing: { after: 120 } });
const NOTE = (s) => new Paragraph({ children: runs(s, { size: 20 }), shading: { type: ShadingType.CLEAR, fill: FILL_BG, color: "auto" },
  spacing: { before: 60, after: 160 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: "C9A227", space: 8 } } });

function table(head, rows, widths) {
  const sum = widths.reduce((a, b) => a + b, 0);
  widths = widths.map((w) => Math.round((w / sum) * W));
  widths[widths.length - 1] += W - widths.reduce((a, b) => a + b, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (s, i, isHead) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders,
    shading: isHead ? { type: ShadingType.CLEAR, fill: HEAD_BG, color: "auto" } : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: String(s).split("\n").map((line) => new Paragraph({ children: runs(line, { size: 19, bold: isHead || undefined }), spacing: { after: 20 } })),
  });
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) => cell(h, i, true)) })]
      .concat(rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) }))),
  });
}
const _table = table;
const gap = () => new Paragraph({ children: [], spacing: { after: 80 } });

// ---------- content
const C = []; const _push = C.push.bind(C); C.push = (x) => { if (!(x && x.__isN)) lastWasN = false; _push(x); if (x instanceof Table) _push(new Paragraph({ children: [], spacing: { after: 120 } })); };
C.push(new Paragraph({ children: [t("Refill Kettle & Stone's late cancellations", { bold: true, size: 40, color: "26302C" })], spacing: { after: 80 } }));
C.push(new Paragraph({ children: [t("Sprint 2 demo notes · Zhenzhao (Neo) Li · Volta Anchor · demo Friday, October 30, 2026", { size: 20, color: MUT })], spacing: { after: 200 } }));
C.push(NOTE("All figures are measured: on the sample files (Sep 21 to Oct 17, list as of Oct 21) or quoted from the discovery materials."));

// 0. talk track
C.push(H1("0. The 3-minute talk track"));
C.push(table(["Time", "What I say"], [
  ["0:00–0:30\nThe problem", "Only 3 of about 11 late openings a week get refilled: about 8 empty hours and $920 a week, while 45 people wait. Tanya can't work on them before 10:30, and when she can, she reads a handwritten book from the top and judges each line from memory. Her words: \"They're on page three. I never get to page three.\""],
  ["0:30–1:00\nWhat I built", "A small tool that runs on the clinic computer only. Nothing is sent anywhere and nothing is booked automatically. It reads the book, drops people who are out of date, and for each opening shows up to 3 people who fit, one at a time, with a check of their own limits against the opening. Tanya still makes the call."],
  ["1:00–1:45\nWhat improved", "Reading from the top, the first right person is at line 16 (median), and Tanya passes 14 people on the way, 8 of them out of date. In 14 of 34 openings the first right person is below line 20. With the page she reads nothing: the first name shown is right. Against Tanya's own answers: 44 of 44 on the sample, 11 of 11 on the last week. Taking the top 3 of the book scores 0 of 44. In my timed test: about 90 seconds and 2 of 5 right with the book, about 7 seconds and 5 of 5 right with the tool."],
  ["1:45–2:15\nLive run", "Load this week's 10 openings and show the result."],
  ["2:15–2:45\nWhat it does not do", "It won't reach 70% by itself. Even a perfect list gets to about 50–57% of openings, because many cancel overnight and start before 11:30, before anyone is free. That part needs a process change, not a better list."],
  ["2:45–3:00\nWhy she'd use it", "It answers her own test: \"Someone cancels, I look, and in ten seconds I know who to call.\" It costs $0 a month, and it never calls two people at once."],
], [16, 84]));

// 1. problem
C.push(H1("1. The problem"));
C.push(P("**Result today.** About 11 late openings a week (late cancellations and no-shows), 3 refilled (27%). In the four-week sample: 44 openings, 12 refilled. The target is 7 in 10 (70%), which would be 31 of the 44."));
C.push(P("**Cost.** About 8 empty hours and $920 of booked time a week. The clinic keeps 40% (about $368 a week) and the therapist 60%. Marc: \"I don't want to lose Dave.\""));
C.push(P("**Why the openings stay empty: two separate causes.**"));
C.push(N("**Finding the right person is slow and unreliable.** The book has no columns: \"There's no column for which therapist, or how long, or what time, or how much notice.\" Tanya starts at line 1 and judges each line from memory. A newer line for the same person may sit further down. Dead lines are never crossed off. Bethany on Saturdays \"just calls from the top and gives up after three.\""));
C.push(N("**Nobody is free when most cancellations arrive.** Most come \"at night\" or \"an hour before\". Tanya is on confirmation calls from 8:00 to 9:15 and checking clients in from 9:00, so her first real breather is about 10:30. \"The mornings, I mostly write off.\" Oct 29 follow-up: \"Can anyone act on a cancellation before 10:30?\" \"Nobody, honestly.\""));
C.push(P("This sprint works on cause 1. Cause 2 is reported honestly with numbers (section 13)."));
C.push(H2("A typical day at the desk"));
C.push(table(["Time", "What Tanya is doing", "Can she refill an opening?"], [
  ["Night to 8:00", "Not there. Cancellations arrive online (11 p.m., 2 a.m.) or by voicemail (6:30).", "No one sees them"],
  ["8:00", "Arrives, plays voicemails, sees the night's cancellations.", "Knows, cannot act"],
  ["8:00–9:15", "Confirmation calls for tomorrow and today, 10 to 20 calls.", "No"],
  ["9:00–10:30", "Clinic opens. Check-ins, payments, insurance billing, phone.", "No: \"I can't be on the phone… while a client is standing there\""],
  ["About 10:30", "First breather. Opens the green book for the afternoon openings.", "Yes, from here"],
  ["Rest of day", "About 30 seconds between people. One opening takes 20 to 40 minutes of calling, spread over two hours. Waits about 20 minutes after a voicemail.", "Yes, in pieces"],
], [16, 56, 28]));

// 2. what I built
C.push(H1("2. What I built, and where it fits"));
C.push(P("**Where it goes in her day:** at the 10:30 step. It replaces \"open the book and read from the top\". It does not change her morning, send messages, or touch the booking system."));
C.push(P("**What it is:** a small Python program that runs on the desk computer and opens a results page in the browser. Only that computer can reach it (127.0.0.1), so the data never leaves it. The program does all the matching; the page only shows the results and the call buttons. For a computer without Python, a single browser page (fallback/kettle-refill.html) gives exactly the same names, and it has a setting that blocks every network connection."));
C.push(H2("How it picks people (rules only, no AI)"));
C.push(N("**Read each person's limits from the handwritten note:** therapist, days, time of day, length and notice. Lines for the same person are joined by phone number, and the newest line wins. Tanya's defaults fill gaps: 60 minutes and 2 hours' notice."));
C.push(N("**Drop people who are out of date:** more than 2 months since their last line; moved; number not in service; asked to be taken off; date limit passed; or a new booking in the export made after their last line."));
C.push(N("**Check every remaining person against the opening:** therapist (and clinic rules: pregnant clients only with Amira or Kelsey, post-op with Josée, female-only), day, start time, finish time, length and notice. One failed check means no."));
C.push(N("**Order and show up to 3:** asked first (Tanya's way), or fastest to arrive (Marc's \"whoever can get here\"). The order can be switched on screen. One person is highlighted at a time; \"No answer / said no\" moves to the next person, and \"Booked it\" marks the opening filled and greys out the rest."));
C.push(P("**Safety rule:** when the rules can't read a note, that person is never shown. They go to \"Needs a look\". A wrong name is worse than a missing one."));
C.push(H2("What Tanya sees for each opening"));
C.push(B("Time, therapist, length, when it was cancelled and how much notice there is."));
C.push(B("\"45 in the book → 30 still waiting → 4 fit → 3 to call\", so it is clear the names are not random."));
C.push(B("\"Call this one now\": the name and phone number, then a short checklist of that person's own limits against the opening (for example, \"Therapist: only Josée or Rachel · this: Josée ✓\"). No notes and no health details are shown; a health-based rule appears only as \"clinic therapist rule\"."));
C.push(B("\"Why the others were not offered\" (one line each) and \"Taken off the list\" (to cross off in the book)."));

// 3. improvements
C.push(H1("3. What improved: before and after"));
C.push(P("The same 34 sample openings in which at least one person on the list fits. \"Right person\" means a person on Tanya's own answer list for that opening."));
C.push(table(["Measure", "Before: read the book from line 1", "With the page"], [
  ["Lines read before the first right person", "Median 16, mean 19.8, worst 46", "0, because the right people are listed first"],
  ["First right person below line 20", "14 of 34 openings", "Not applicable"],
  ["People passed on the way to the first right one", "Median 14, of whom 8 are out of date", "No out-of-date person is ever shown"],
  ["Names shown that Tanya would accept", "Top 3 of the book: 0 of 44 openings correct; 127 of 132 names wrong", "44 of 44 openings correct; 0 of 93 names wrong"],
  ["Out-of-date people offered", "Top 3 after removing the dead lines: still 0 of 44 correct", "0"],
], [32, 38, 30]));
C.push(P("These are counts of work avoided, measured from the files. They are not minutes; section 6 measures minutes."));

// 4. how the user feels it
C.push(H1("4. How the user feels it"));
C.push(NOTE("Tanya, Marc and Julie could not be reached this week, so I have **no feedback from the real users**. What follows maps each feature to something Tanya or Marc said, plus my timed test acting as someone who doesn't know the clients (like Bethany on Saturdays)."));
C.push(table(["What Tanya or Marc said", "What the page does"], [
  ["\"In ten seconds I know who to call. The right person, the one who'll actually say yes, not the one at the top of page one.\"", "The first name shown is a person whose limits all fit."],
  ["\"They're on page three. I never get to page three.\"", "Every line is checked, so page three counts as much as page one."],
  ["Mel: \"I'd actually put her into one of Dave's spots back in September. I never crossed her off.\"", "Anyone with a booking made after their last line is taken off and listed to cross out."],
  ["\"If I have to read a paragraph, or type more than a name, it's not going to happen at eleven o'clock.\"", "One name and number highlighted, plus a short checklist. No typing."],
  ["\"I'd want to be able to explain it if someone asked why they didn't get the call.\"", "Each name gives its reason, and \"Why the others were not offered\" lists the rest."],
  ["\"That can't happen.\" (two yeses for one slot)", "One person at a time; \"Booked it\" tells you to call nobody else."],
  ["\"I'd never put any of that in a text.\" / Marc: \"nothing a client can read over the counter\"", "No messages. No health details on screen."],
  ["Marc: \"each of them gets a say.\" Josée \"wants to see who it is.\"", "Josée's openings carry \"therapist looks first\"."],
  ["Bethany \"just calls from the top and gives up after three.\"", "Someone who doesn't know the clients gets the same right names."],
], [52, 48]));
C.push(H2("Timed test result"));
C.push(P("With the book I needed **91.6 seconds** on average to name the first person to call, and only **2 of 5** were right. With the tool: **6.9 seconds**, **5 of 5** right. The three wrong picks are the mistakes Tanya described herself: two people had already booked and were never crossed off (\"I never crossed her off\"), and one had changed her limits in a newer line further down (\"the newest line is the right one. If I find it.\")."));

// 5. testing
C.push(H1("5. Testing: what was tested, how long it took, and the limits"));
C.push(table(["Test", "What it shows", "Result", "Time to run"], [
  ["Sample: 44 openings vs Tanya's answers, both orders", "The names shown are names Tanya would pick", "44 of 44", "0.3 s"],
  ["Last week only (O34–O44)", "Stand-in for Friday", "11 of 11", "Same run"],
  ["Tanya's active / out-of-date labels for all 45 people", "Nobody dead is treated as waiting, and nobody waiting is dropped", "45 of 45 agree", "Same run"],
  ["The 5 people who \"got in\" (W09/W31, W15, W19/W35, W21, W25)", "Already-booked people are never offered", "5 of 5 caught; Bob = Robert matched", "Same run"],
  ["20 reworded notes the rules had not seen (\"no Dave please\", \"after 4 only\", \"Mon/Wed only\"…)", "What happens with new shorthand", "0 wrong people shown; 1 held back; 4 sent to \"needs a look\"", "< 1 s"],
  ["Python backend vs the no-install browser page: 7 data sets incl. 400 random notes and 3 run dates", "Both versions use exactly the same rules", "0 differences in any field; run logs identical (14,645 rows)", "About 10 s"],
  ["Backend end to end: 28 checks (opens straight on the results, call flow, order switch, refresh, plain-language errors, warning when sample files are left in, only local requests, can't read other files)", "The real setup works as written in HOW-TO-RUN", "28 of 28 pass; 0 outside requests; 0 script errors", "About 15 s"],
  ["No-install page: 16 checks (upload, wrong file refused, call flow, order switch, run log, phone width)", "The fallback works as described", "16 of 16 pass; 0 network requests; 0 script errors", "6.6 s"],
  ["Health words in all output (sample and reworded notes)", "Privacy", "0 found", "Same runs"],
  ["Two runs, same input", "Same answer every time", "Identical", "Same runs"],
  ["Human timed test (section 6)", "Does it save time for a person?", "Book: 91.6 s, 2 of 5 right. Tool: 6.9 s, 5 of 5 right", "About 15 min"],
  ["Rehearsal on my Mac from a fresh download, following HOW-TO-RUN", "Someone else could start it from the written steps", "3 min 19 s to the results page, incl. the one-time macOS \"Open Anyway\" step", "3 min 19 s"],
], [30, 26, 26, 18]));
C.push(H2("Limits I want to state up front"));
C.push(B("**The 44 of 44 is optimistic.** I read Tanya's full answer key before writing the rules. The fair tests are the reworded notes and Friday's new files."));
C.push(B("**Notice is counted from the cancellation time,** because that is how Tanya marked her answers, not from when she actually calls. For someone who needs only 30 minutes, a call at 12:15 for a 12:30 start could be too late in real life."));
C.push(B("**The \"already booked\" check** matches a booking to a person by last name and first initial, with nicknames such as Bob = Robert, so two people with the same surname and initial could be confused. It only sees appointments inside the export's dates: someone who booked a date after the export would be missed. On the sample it caught all 5 people Tanya marked as booked since asking, and all 45 of her labels agree. A daily report that includes upcoming bookings would close the gap."));
C.push(B("**New shorthand** is held back rather than guessed. Held-back people are missed until someone rewrites the note."));

// 6. time saved
C.push(H1("6. Time saved, and how it was measured"));
C.push(P("**What I can say without a stopwatch:** reading from the top passes a median of 14 people (8 of them out of date) before the first right one, and Tanya says one opening costs 20 to 40 minutes of calling spread over two hours. I have no measurement of how much of that is reading the book."));
C.push(H2("Timed test (run on Thursday, October 29)"));
C.push(N("A fixed random seed picks 10 sample openings, covering: many fits, only 1 or 2 fits, nobody fits, a Josée opening, and one with a clinic rule. The seed makes sure they aren't hand-picked."));
C.push(N("**Round 1 (without the page):** for 5 openings, I get the opening and the waitlist spreadsheet only. The clock runs until I name the first person to call (or \"nobody\")."));
C.push(N("**Round 2 (with the page):** for the other 5 openings, the clock runs until I name the first person to call from the page."));
C.push(N("Each answer is scored against Tanya's list for that opening. Using different openings in each round stops round 2 being faster just because I have seen them."));
C.push(N("**How to read the result:** I don't know the clients, so this measures someone like Bethany, not Tanya. Tanya knows people, but she is also interrupted at the counter."));
C.push(table(["Round", "Opening", "Seconds", "Name given", "Right? (Tanya's list)"], [
    ["Book", "O40", "115", "Mel Arsenault", "No (Tanya: nobody; Mel had already booked)"],
  ["Book", "O32", "179.6", "Claudette R", "No (had already booked)"],
  ["Book", "O42", "39", "Tina Saulnier", "No (newer line: must finish by 2:30)"],
  ["Book", "O41", "95.6", "Shawn Duguay", "Yes"],
  ["Book", "O12", "28.8", "Carole Mazerolle", "Yes"],
  ["Tool", "O11", "9.3", "Chantal Maltais", "Yes"],
  ["Tool", "O30", "9", "Shawn Duguay", "Yes"],
  ["Tool", "O24", "6.8", "Lorraine Johnson", "Yes"],
  ["Tool", "O31", "2.1", "Nobody fits", "Yes"],
  ["Tool", "O18", "7.4", "Ginette Losier", "Yes"],
], [16, 16, 14, 30, 24]));
C.push(P("**Summary line for the demo:** \"Without the tool: about 90 seconds and 2 of 5 right. With it: about 7 seconds and 5 of 5 right.\" Limits: the tester was me, not Tanya, and I asked what some shorthand meant during round 1, so the book times include that. Five openings per round is a small sample."));

// 7. hours
C.push(H1("7. Build time: plan vs actual"));
C.push(table(["Risk (planned hours)", "What was done", "Actual hours"], [
  ["Value (3)", "Counted the 44 openings: no-shows, when Tanya is free, fillable at 90 / 150 / 210 minutes (value_count.py). Worked out the real numbers and Tanya's day.", "3"],
  ["Feasibility (6)", "Note reader and matcher; out-of-date rules; booking-export check; checked against the key, the last week and 20 reworded notes. Includes my own offline work on what the matching and the data should look like.", "4"],
  ["Usability (4)", "Desk page: one person at a time, a checklist per person, \"why the others\", order switch; flag and order-change counts; timed test.", "4.5"],
  ["Viability (7, incl. 2 flex)", "Nothing leaves the computer: local backend plus a no-install page, proven identical; health-word scans; cost; export-lag check; run steps; hand-off plan and one-page note; demo preparation; rehearsal.", "5"],
  ["Total (20)", "", "16.5"],
], [22, 58, 20]));
C.push(P("**Where the 2 flex hours went:** my plan said they should go to the first risk that came out partial, which was Value. That result needed an honest report, not more work, so I kept them in Viability, where making it run without help mattered most (Marc: \"Julie can't babysit it\"). I should have written this note on Wednesday. Demo preparation is counted under Viability too, because most of it is the hand-off plan and the steps to run it."));

// 8. why use
C.push(H1("8. Why Tanya would use it, and why she might not"));
C.push(H2("Why she would"));
C.push(B("It finds people she never reaches, and it stops her calling people who already got in."));
C.push(B("It fits her 30 seconds between clients: one name, no typing, no paragraph to read."));
C.push(B("She can explain every choice to a client who asks."));
C.push(B("It can't double-book or text anyone, so it breaks none of her rules."));
C.push(B("Bethany can use it on Saturdays without knowing the clients."));
C.push(H2("Why she might not (said up front)"));
C.push(B("Typing the week's new lines: about 3 minutes a week (6 lines took me 3.2 minutes), and each person is written twice, once in the book and once in the sheet. Tanya: \"it has to take less time than the book, not more.\""));
C.push(B("Josée's openings need Josée to look first, and Tanya says \"I don't have time to run to Josée between clients.\""));
C.push(B("The morning openings still can't be saved by a list."));
C.push(B("Every day the opening has to get into the page. Friday uses the given openings file; daily use needs one small extra step (section 13)."));

// 9. done checks
C.push(H1("9. The three done checks"));
C.push(table(["Done check", "Evidence", "Status"], [
  ["1. For each late opening, show up to 3 people from the waitlist who fit and would say yes, or nobody.", "The page and results file show up to 3 names or \"Nobody fits\" for every opening. Sample: 34 openings with names, 10 with nobody (8 are no-shows).", "Done"],
  ["2. On Friday's 10 new openings, at least 8 match Tanya's answers, and nobody unsuitable or out of date is offered.", "Self-tests: 44 of 44 overall, 11 of 11 on the last week, 0 wrong people on 20 reworded notes. The real check is live on Friday, because Tanya's answers are not handed out.", "Friday"],
  ["3. A written plan: who looks after it, what it costs to run, and what happens when it gets one wrong.", "Sections 11 and 12 of this document.", "Done"],
], [36, 50, 14]));

// 10. four risks
C.push(H1("10. The four risks: what the plan said and what happened"));
C.push(table(["Risk", "Pass mark in my plan", "Result", "Verdict"], [
  ["Value", "8 or more extra openings fillable means the list is useful; the list alone reaches the target only if the total reaches 31 of 44.", "At the 150-minute rule: 10 extra, total 22 of 44 (50%). At 90 minutes: 13 extra, 25 of 44 (57%). At 210 minutes: 8 extra, 20 of 44 (45%).", "**Partly validated.** The list is worth building, but it can't reach 70% alone."],
  ["Feasibility", "Pauline, Normand and Mel correct; ≤ 5 rows not understood; no \"got in\" person shown; Marc's schedule (Tue, Thu, Sat) inferred; two runs identical; ≥ 9 of 11 on the last week; 15–20 test rows.", "All correct; 0 not understood; 5 of 5 \"got in\" caught; schedule inferred (not needed for matching); identical; 11 of 11; 20 rows, 0 wrong.", "**Validated** (with the optimism caveat)."],
  ["Usability", "\"Therapist looks first\" flag ≤ 40% of openings (Josée only); top-3 order changes ≤ 5; 30-second test passes on 4 of 5 screens.", "Flag 5 of 34 (15%), or 18 of 34 (53%) if Amira, Rachel and Marc were cautious too. 6 order changes: \"regulars first\" can't be computed, because the waitlist people are not in the export, so \"fastest to arrive\" was compared instead. Timed test: with the tool 5 of 5 right in 6.9 s on average (book: 2 of 5, 91.6 s).", "**Mostly validated.** Speed, accuracy and flag share pass; order changes are in the partial band (6–12)."],
  ["Viability", "Health-detail misses 0; cost ≤ $30 a month; ≤ 5 steps and ≤ 10 minutes from a clean setup; stale-booking mistakes ≤ 1 of 5.", "0 health words in any output; $0 a month; 5 steps from my written guide; booking-export lag of one week misses 0 of 5 \"got in\" people (an 11-day lag misses 1 of 5). Separate hand count of health details by me and a classmate: not done, because notes never leave the computer.", "**Validated.** Rehearsal from a fresh download on my Mac: 3 min 19 s."],
], [12, 30, 38, 20]));

// 11. hand-off
C.push(H1("11. Hand-off plan (done check 3)"));
C.push(H2("Who looks after it"));
C.push(table(["Who", "When", "What", "Time"], [
  ["Tanya", "Every Friday, when Julie's export arrives", "Type the week's new waitlist lines at the end of the sheet (about 6 a week) and save the export in the folder. Cross off the people the page lists under \"Cross these off the book\".", "About 3 min (6 lines took 3.2 min)"],
  ["Tanya or Bethany", "After a cancellation", "Open the page, call the highlighted person, then press \"No answer\" or \"Booked it\". Book in Kneadly as today.", "Seconds to find the person"],
  ["Tanya", "When someone shows under \"Needs a look\"", "Rewrite that line in plain words (for example \"after 4\", \"not Dave\"). No code change.", "1 min each"],
  ["Julie", "No new task", "Already sends the Friday export.", "0"],
  ["Marc", "Optional, later", "Switch on the daily report (a free setting) if he wants the booked check to be daily.", "Once"],
  ["A technical person", "Only if the clinic wants a new rule", "Edit the rules file and re-run the tests in the package.", "Open question: who (not Julie)"],
], [14, 22, 46, 18]));
C.push(P("**Writing each person twice.** Today the waitlist is a paper book, so with this plan Tanya writes a new person in the book and types them into the sheet on Friday. That is about 3 minutes a week, but it is double entry. The better next step is to drop the paper book and type new people straight into the one sheet on the desk computer, with the same columns and the same shorthand. That sheet then is the clinic's waitlist database: one copy, no server, nothing for Julie to look after. It needs Tanya, Bethany and the therapists to change a habit, so it should be tried with Tanya first."));
C.push(P("**Changing therapists or clinic rules.** The therapist names, who counts as female, who has prenatal training, who looks first, and the defaults (60 minutes, 2 hours' notice, 2 months) are written in the rules files, so a change today needs a technical person and a test run (tests/run_all.sh). Next step: move them into a small settings sheet in the data folder that Tanya or Julie can edit."));
C.push(P("**Switching it off:** close the program's window, or delete the kettle folder. Nothing is scheduled, nothing runs in the background, and nothing sends."));
C.push(H2("What it costs to run"));
C.push(B("**Money: $0 a month.** No subscription, no AI service, no texting service, no Kneadly plan upgrade. Marc's limit: \"fifty a month, I wouldn't blink. A hundred and fifty, no.\""));
C.push(B("**Time:** about 3 minutes a week of Tanya's typing (measured: 6 lines in 3.2 minutes), against about 85 seconds saved on every opening and fewer wasted calls."));
C.push(B("**Payback (discovery-note figures):** each extra hour refilled is $115 of booked time, about $46 to the clinic and $69 to the therapist."));
C.push(H2("What happens when it gets one wrong"));
C.push(table(["What goes wrong", "How Tanya notices", "Worst outcome", "What to do"], [
  ["Shows someone who doesn't fit (a note read wrongly)", "The checklist under the name doesn't match what the person says", "One wasted call", "Rewrite the note in plain words; report the wording"],
  ["Misses someone who fits", "\"Why the others were not offered\" names them with a reason", "The opening may stay empty, as today", "Same as above; the book is still there"],
  ["Shows someone who already booked (export up to a week old)", "Kneadly shows their booking when she goes to book", "One wasted call", "Cross them off"],
  ["Two people say yes", "Prevented: one person at a time; \"Booked it\" says call nobody else. Kneadly has no hold (Julie can block time by hand).", "The second person waits", "Marc's rule: \"the second one gets a sorry and they're first next time\""],
  ["New shorthand not understood", "The person appears under \"Needs a look\" and is never shown", "That person is missed until fixed", "Rewrite the note"],
  ["The program won't start (no Python)", "The start window says Python is missing; the page says the program is not running", "Back to the green book for that day", "Use the no-install page (fallback/kettle-refill.html), which gives the same names"],
  ["A health detail shows", "Can't happen in a message: nothing is sent. The screen shows only \"clinic therapist rule\".", "None found in testing", "Report it; the page can be closed at once"],
], [24, 30, 20, 26]));

// 12. one page for Marc
C.push(H1("12. One-page note for Marc"));
C.push(P("**What it reads:** three spreadsheets that are already at the desk. The typed waitlist: date, name, phone, note. The Friday booking export: client name, status, date booked, appointment date. The late openings: date, time, therapist, length, when cancelled."));
C.push(P("**Where the data goes:** nowhere. The program runs on the desk computer and only that computer can reach it. The no-install page has a built-in setting that blocks every internet connection. No AI service, no outside company, no texting."));
C.push(P("**What is kept:** the three files stay in the data folder on the desk computer, as they are today. Each run saves a run log in the logs folder on that computer, with names and short reasons and no health details. Nothing is kept anywhere else."));
C.push(P("**Who can see it:** whoever is at the desk screen. It shows names, phone numbers and limits (therapist, day, time, length, notice), never the notes; a health-based rule shows only as \"clinic therapist rule\". That is less than the paper book shows today, which sits on the counter with the full notes."));
C.push(P("**What it needs from you:** nothing this week. No daily report, no plan upgrade, no account. The desk computer needs Python (free) installed once, or the desk uses the no-install page."));
C.push(P("**How to switch it off:** close the program's window, or delete the kettle folder."));
C.push(table(["Marc's reasons to say no", "How this handles it"], [
  ["It ever books two people into one slot", "It never books anyone. One person at a time; \"Booked it\" says call nobody else."],
  ["A health detail in a message, or on a screen a client can see", "It sends no messages. The screen shows no notes or conditions."],
  ["Clients feel pestered, or get offers for times they said they can't do", "It sends nothing, and it only names people whose own limits fit the opening."],
  ["Tanya won't use it, or the therapists lose their say", "One name at a glance, no typing. Josée's openings are flagged for her to look first. Not yet tried with Tanya."],
  ["Costs much more than $50 a month, or Julie has to fix it every week", "$0 a month. No new task for Julie."],
], [42, 58]));

// 13. limits & next
C.push(H1("13. Limits and next steps"));
C.push(B("**It can't reach 70% on its own.** Best case with a perfect list is 22 to 25 of 44 (50 to 57%). The rest are mostly overnight cancellations of openings that start before about 11:30, gone before anyone is free. To go further: Marc switches on the daily report so the list is ready at 8:00; one short call around 9:20 for the soonest afternoon opening; Bethany gets the page on Saturdays."));
C.push(B("**Getting the opening into the page every day.** Friday uses the given openings file. For daily use, the next step is a small \"new opening\" box (therapist, time, length, when cancelled) that adds one opening in a few clicks, or the daily Kneadly report. Not built this week."));
C.push(B("**Josée looking first** needs a simple way for Tanya to show her the three names without walking over (for example, a printed slip or a note in Kneadly). Not decided."));
C.push(B("**Who gets the first call** is still open. Tanya: \"Whoever asked first, I think.\" Marc: \"My regulars, sure… You and Tanya figure out the order.\" The page shows both available orders; \"regulars first\" needs a list of regulars, because the waitlist people are not in the export."));
C.push(B("**Not yet run on the clinic's own Windows computer.** It is tested on Linux and rehearsed on my Mac; start.bat should be tried at the desk during hand-off."));
C.push(H2("Open questions (unanswered; not guessed)"));
C.push(B("Julie: which browser does the desk use? Does Kneadly have an API or AI tools? Does it send an alert when someone cancels? Where does Kneadly store the data? What does the higher plan really cost?"));
C.push(B("Clinic: can the desk computer keep a file on the desktop? Who would change a rule if needed (not Julie)?"));
C.push(B("Tanya: does 5 minutes on Fridays feel like less than the book? (To try with her.)"));

// 14. Q&A
C.push(H1("14. Likely questions from Rishabh, and short answers"));
const qa = [
  ["Why not just use AI to read the notes?", "Rules are explainable, give the same answer every time, cost $0, and keep the health notes on the computer. When a note can't be read, the person is held back instead of guessed at. AI could later turn notes into the same fields (with health words removed first), with the rules still deciding."],
  ["How do you know it's right, if you wrote the rules after seeing the answers?", "I don't fully, and I say so. The fair checks are the 20 reworded notes (0 wrong people) and Friday's new files. Every name also shows its checklist, so Tanya can catch a mistake before she calls."],
  ["What happens on Friday if a note uses shorthand you've never seen?", "That person goes to \"Needs a look\" and isn't shown. Worst case, I show fewer names. I don't show a wrong one."],
  ["Why can't you reach 70%?", "Timing. Many openings cancel overnight and start before Tanya is free at 10:30. Even a perfect list fills 50 to 57% in the sample. The rest needs the daily report or a change at the desk."],
  ["How much time does it save Tanya?", "Measured on a stand-in (me, like Bethany): about 90 seconds and 2 of 5 right with the book, about 7 seconds and 5 of 5 right with the tool. Not measured on Tanya. Counted from the files: the first right person is a median of 16 lines down, and 14 people, 8 of them out of date, are passed on the way."],
  ["Who keeps the list current?", "Tanya on Fridays: type about 6 new lines and cross off what the page lists. Julie: nothing new."],
  ["What if two people say yes?", "The page only ever highlights one person; \"Booked it\" says stop. Kneadly has no hold, so Julie can block time by hand. Marc's rule covers a second yes."],
  ["Why \"asked first\" and not regulars?", "That is Tanya's current rule, and she can explain it. Marc said \"you and Tanya figure out the order\". Regulars can't be identified from the data, so the page shows asked-first and fastest-to-arrive side by side for her to choose."],
  ["What does it cost?", "$0 a month. Tanya's time: about 3 minutes a week to type the new lines (measured)."],
  ["Is there a database?", "No. The tool reads the three spreadsheets the clinic already has and works everything out again on each run (0.3 s), so there is one copy of the data and nothing to install or back up. All the reading sits in one file (backend/datasource.py), so a real database can replace it later without touching the rules."],
  ["Where do the three files come from?", "Julie's weekly Kneadly export, Tanya's typed copy of the green book, and the list of late openings. The tool doesn't create them; it reads them. For daily use, the openings would come straight from the booking export, which is the next step I haven't built."],
  ["What happens when new people join the waitlist?", "Tanya adds their line; the next run picks them up automatically. Right now that means writing them in the book and typing them on Friday (about 3 minutes a week). The better step is to type them straight into the sheet and drop the book, so each person is entered once."],
  ["How does it read the notes without AI?", "The book uses a small set of shorthand: six therapist names, days, times, lengths, notice, a few abbreviations like \"J only\" and \"AB Dave\". Fixed rules pick these out one by one. If anything that looks like a limit is left over (a number, \"before\", \"not\"), the person goes to \"Needs a look\" instead of being guessed."],
  ["What if a therapist joins or leaves?", "Today that needs a change to the rules file and a test run. The next step is a small settings sheet Tanya or Julie can edit."],
  ["What changed since last sprint's feedback?", "Last week the demo replayed saved results. This week the tool runs live on files it hasn't seen, all three done checks are handed in by noon, and the rules give the same answer every time, with one command that re-runs every check."],
  ["Did you keep data you never looked at?", "No. I read Tanya's answer key before writing the rules, so 44 of 44 is a best case. The fair checks are the 20 reworded notes I wrote and today's new files."],
  ["Did you ask questions this week?", "Most of what I needed was already in the updated answers file, so I worked from that. What is still unknown (the desk browser, whether Python can be installed, the call order) only affects the hand-off, and I list it as open questions instead of guessing."],
  ["What would you do with 10 more hours?", "Try it with Tanya for one week, add the \"new opening\" box, and test the Josée look-first step."],
];
qa.forEach(([q, a]) => { C.push(P(`**Q: ${q}**`, { para: { spacing: { after: 40 } } })); C.push(P(a, { para: { indent: { left: 360 }, spacing: { after: 140 } } })); });

// 15. run steps
C.push(H1("15. How to run it, and the files"));
C.push(N("Copy the kettle folder to the computer (once). It needs Python 3.9 or newer; without it, use fallback/kettle-refill.html."));
C.push(N("Each week, empty the data folder and save this week's three files there: late openings, waitlist, booking export."));
C.push(N("Double-click start.command (Mac) or start.bat (Windows) and keep its window open. On a Mac, the first time, allow it under System Settings → Privacy & Security."));
C.push(N("The results page opens by itself. Check that the day is today and that there is no orange box (an orange box means sample files are still in the data folder)."));
C.push(N("Call the person under \"Call this one now\", then press \"No answer / said no\" or \"Booked it\". Book in Kneadly as usual."));
C.push(P("**Files in the package:** backend/ (the Python program: datasource.py reads the data folder, parsing.py and matching.py hold the rules, service.py runs them, server.py serves the page); frontend/ (the page); start.command and start.bat; data/ (this week's files); logs/ (run logs); fallback/kettle-refill.html (the no-install page, same rules); tests/ (run_all.sh runs every check, plus the timed test); research/value_count.py; HOW-TO-RUN.md."));

C.push(H1("16. What I learned"));
C.push(B("**Building was the fast part.** The rules took a few hours with AI. Most of my time went into understanding the problem: what the numbers mean, when Tanya can actually call, who is really on the list."));
C.push(B("**The data is the real bottleneck, not the matching.** 60 lines are 45 people, a third of them are out of date, and limits are mixed with health notes in free text. Cleaner data at the source (one sheet with fixed columns) would help more than smarter rules."));
C.push(B("**Speeding up one step only helps as much as that step matters.** The list is now instant, but waiting for callbacks and nobody being free before 10:30 take more of the time. That is why the list can't reach 70% on its own."));
C.push(B("**Measure before claiming.** I didn't know how much time it saved until I timed it, and the timed test showed something the counts didn't: the book leads you to people who have already booked or changed their limits."));
C.push(B("**Deployment decides whether it gets used.** Who types the list, who fixes a rule, what runs on the desk computer, and what Marc will sign off: these took as much thought as the code."));

const doc = new Document({
  creator: "Zhenzhao (Neo) Li", title: "Kettle & Stone Sprint 2 demo notes",
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: "26302C" } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 30, bold: true, font: FONT, color: ACC }, paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: FONT, color: "26302C" }, paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
      { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } }] },
    { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t("Kettle & Stone · Sprint 2 · page ", { size: 16, color: MUT }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUT })] })] }) },
    children: C,
  }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(process.argv[2] || "demo-notes.docx", buf); console.log("written"); });

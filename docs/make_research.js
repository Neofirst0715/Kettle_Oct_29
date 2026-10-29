const h = require("./docx_helpers.js");
const { t, P, H1, H2, B, N, NOTE, table, MUT, Paragraph } = h;
const C = h.newC();

C.push(new Paragraph({ children: [t("Four-risk research", { bold: true, size: 40, color: "26302C" })], spacing: { after: 60 } }));
C.push(new Paragraph({ children: [t("Refill Kettle & Stone's late cancellations · Sprint 2 · Zhenzhao (Neo) Li · October 29, 2026", { size: 20, color: MUT })], spacing: { after: 200 } }));
C.push(P("This is the research behind my four-risk plan of Monday, October 26. For each risk it gives the question, the pass marks I set in advance, what I did, what came out, and my verdict. All numbers come from the sample files (44 late openings from Sep 21 to Oct 17, the waitlist as of Oct 21, the booking export and Tanya's answer key) and can be re-run with the scripts in the code folder (see the end)."));

C.push(H1("Summary"));
C.push(table(["Risk", "Question", "Verdict", "Main evidence"], [
  ["Value", "Even if it worked perfectly, would the problem go away?", "**Partly validated**", "A better list makes 10 more openings fillable (22 of 44, 50%), but it can't reach 70% (31 of 44) on its own."],
  ["Feasibility", "Can I get it working and tested this week?", "**Validated**", "44 of 44 vs Tanya; 11 of 11 on the last week; 0 wrong people on 20 reworded notes."],
  ["Usability", "Will Tanya use it and trust it in her normal day?", "**Mostly validated**", "Timed test: with the tool 6.9 s and 5 of 5 right; with the book 91.6 s and 2 of 5. Flag share 15%; order changes 6 (partial band). Not yet seen by Tanya."],
  ["Viability", "After I leave, can they keep it running, afford it, and is it allowed?", "**Validated**", "Nothing leaves the computer; $0 a month; 5 run steps; a one-week-old export still catches 5 of 5 booked people."],
], [13, 30, 17, 40]));

// ---------------------------------------------------------------- VALUE
C.push(H1("1. Value"));
C.push(P("**Question.** If the list were perfect, how many of the empty late openings could actually be refilled?"));
C.push(P("**Pass marks set on Monday.** 8 or more extra openings fillable means the list is useful. The list alone reaches the target only if the total reaches 31 of 44. 4 to 7 extra is partial. 3 or fewer means a list alone is not enough."));
C.push(H2("What I did"));
C.push(B("Counted the 44 openings: refilled, no-shows, and whether anyone on Tanya's answer key fits (research/value_count.py)."));
C.push(B("Worked out when someone could first act on each cancellation: weekdays from 10:30 to 20:00 (Tanya: her first real breather is about 10:30) and Saturdays from 9:30 to 15:00 (my assumption, as Bethany is alone). Sundays closed."));
C.push(B("Counted an opening as fillable in time if at least 150 minutes were left between that moment and the start: Tanya's default notice of \"a couple of hours\" (2 h) plus about 30 minutes of calling. I re-counted at 90 and 210 minutes."));
C.push(H2("Results"));
C.push(table(["Count", "Number"], [
  ["Late openings in four weeks", "44"], ["Already refilled", "12 (27%)"], ["No-shows (known only 15 minutes late, never offered)", "8"],
  ["Nobody on the list fits", "10 (the 8 no-shows, plus O31 and O40)"], ["At least one person fits", "34"], ["Not refilled, but someone fits", "22"],
], [70, 30]));
C.push(table(["Time needed before the start", "Extra fillable", "Total refilled", "Share", "Target"], [
  ["90 minutes", "13", "25 of 44", "57%", "31 of 44 (70%)"],
  ["**150 minutes (my rule)**", "**10**", "**22 of 44**", "**50%**", "31 of 44 (70%)"],
  ["210 minutes", "8", "20 of 44", "45%", "31 of 44 (70%)"],
], [32, 16, 18, 12, 22]));
C.push(B("At 150 minutes, 12 openings with a fitting person were too late, and **all 12 start at or before 12:30**. That matches Tanya: \"The mornings, I mostly write off.\""));
C.push(B("The rule is cautious: 4 openings that were in fact refilled (O04, O12, O23, O25) would not count as \"in time\" under it."));
C.push(B("Supporting quotes. Asked what a perfectly sorted list at 8:00 would have changed: \"I still couldn't have called anyone.\" Oct 29: \"Can anyone act on a cancellation before 10:30?\" \"Nobody, honestly.\""));
C.push(H2("Verdict: partly validated"));
C.push(P("The list is worth building: 10 extra openings is above my mark of 8. But even a perfect list fills about half of the openings, not 70%. The rest is a timing problem, because cancellations come overnight and nobody is free before 10:30, so a better list can't solve it. I kept the list and report the rest as a process change: Marc's daily report so the list is ready at 8:00, one short call around 9:20 for the soonest afternoon opening, and the page for Bethany on Saturdays."));
C.push(P("**Not done:** I planned to ask Rishabh whether Tanya could recall when she gave up on a few unfilled openings, to check the 150-minute rule. I did not ask, so the rule stays an assumption, checked only by re-counting at 90 and 210 minutes."));

// ---------------------------------------------------------------- FEASIBILITY
C.push(H1("2. Feasibility"));
C.push(P("**Question.** Can the messy handwritten notes be turned into a list that picks the same people as Tanya, this week, without guessing?"));
C.push(P("**Pass marks set on Monday.** Pauline, Normand and Mel come out right. No more than 5 rows not understood. Nobody who \"got in\" is recommended. Marc's schedule (Tue, Thu, Sat) is inferred. Two runs give identical output. On the held-out last week (O34–O44): 9 of 11 or more validates, 7 to 8 is partial, and below 7, or any unsuitable or expired person, means narrowing. Plus 15 to 20 test rows in new wording."));
C.push(H2("What I did"));
C.push(N("Read each note with fixed rules (no AI) into therapist, days, time of day, length, notice and date limits. Lines for one person are joined by phone number (\"same #\" by first name and last initial), and the newest line wins. Tanya's defaults fill the gaps: 60 minutes, 2 hours' notice."));
C.push(N("Marked people out of date: no contact for over 2 months, moved, number not in service, asked to come off, a date limit passed, or a booking in the export made after their last line (same last name and first initial, with nicknames such as Bob = Robert)."));
C.push(N("Checked every remaining person against each opening: therapist, the clinic rules (pregnant: Amira or Kelsey only; post-op with no therapist named: Josée; female only), day, start time, finish time, length, notice, and date limits. Ordered by who asked first and showed up to 3."));
C.push(N("A note with wording the rules can't read puts that person in \"Needs a look\". They are never shown and never guessed."));
C.push(H2("Results"));
C.push(table(["Pass mark", "Result", ""], [
  ["Pauline (newest line: Mon or Wed mornings), Normand (Dave, after 4), Mel (already booked)", "All three right", "✓"],
  ["≤ 5 rows not understood", "0 of 60", "✓"],
  ["Nobody who \"got in\" recommended (W09/W31, W15, W19/W35, W21, W25)", "5 of 5 marked out of date and never shown", "✓"],
  ["Marc's schedule inferred", "Tue, Thu, Sat from the export. Not needed for matching, because each opening names its therapist.", "✓"],
  ["Two runs identical", "Identical", "✓"],
  ["Last week O34–O44: ≥ 9 of 11", "11 of 11", "✓"],
  ["15–20 test rows in new wording", "20 rows: 0 wrong people shown, 1 held back, 4 sent to \"Needs a look\"", "✓"],
], [50, 42, 8]));
C.push(table(["Other checks", "Result"], [
  ["All 44 openings vs Tanya's answers (both call orders)", "44 of 44"],
  ["Tanya's active / out-of-date labels, 45 people", "45 of 45 agree"],
  ["Taking the top 3 lines of the book instead", "0 of 44; 127 of 132 names wrong"],
  ["Top 3 after removing the dead lines", "0 of 44; 123 of 132 names wrong"],
  ["Python backend vs browser page, 7 data sets (incl. 400 random recombined notes, 3 run dates)", "0 differences in any field; run logs identical (14,645 rows)"],
], [62, 38]));
C.push(H2("Verdict: validated, with one caveat"));
C.push(P("Every pass mark was met. The caveat: I read Tanya's full answer key before writing the rules, so 44 of 44 and 11 of 11 are optimistic. The fairer tests are the 20 reworded notes and Friday's new files."));
C.push(P("**Decision: no AI for reading notes.** The plan allowed AI to turn notes into fields. I dropped it because rules alone met every mark, give the same answer every time, cost nothing, and keep the health notes on the computer. The cost of this choice is that unfamiliar wording is held back, which can mean fewer names but never a wrong one."));

// ---------------------------------------------------------------- USABILITY
C.push(H1("3. Usability"));
C.push(P("**Question.** At 11 a.m., with about 30 seconds between clients, can Tanya see who to call and trust it?"));
C.push(P("**Pass marks set on Monday.** The first name on screen matches the system's first name, and the reason can be repeated, on at least 4 of 5 screens in a 30-second test. The \"therapist looks first\" flag (Josée only) is on 40% of openings or fewer. Asked-first vs regulars-first changes the top 3 in 5 openings or fewer. Partial: a 41–60% flag share or 6–12 changes."));
C.push(H2("What I did"));
C.push(B("Built the desk page itself instead of 5 sample screens. It highlights one person at a time (\"Call this one now\"), with \"No answer / said no\" and \"Booked it\" buttons, so two people can't both be offered the slot. Under each name there is a short checklist of that person's own limits against the opening, with no health details. It also shows \"Why the others were not offered\" and a list of people to cross off the book."));
C.push(B("Counted the flag share and the order changes."));
C.push(B("Replaced the 30-second test with a timed test: 10 openings picked with a fixed random seed (two each of: nobody fits, a Josée opening, only 1–2 fit, many fit, a clinic rule applies). Five are answered from the book and five with the tool, each timed and checked against Tanya's list."));
C.push(H2("Results"));
C.push(table(["Measure", "Result", "Band"], [
  ["\"Therapist looks first\" flag, Josée only", "5 of 34 openings with names (15%)", "Validated (≤ 40%)"],
  ["Same flag if Amira, Rachel and Marc were cautious too", "18 of 34 (53%)", "Would be partial"],
  ["Top-3 changes between two orders", "6 of 44 (order differs in 9)", "Partial (6–12)"],
  ["Timed test, the book (5 openings)", "91.6 s on average (median 95.6 s); 2 of 5 right", ""],
  ["Timed test, the tool (5 other openings)", "6.9 s on average (median 7.4 s); 5 of 5 right", "Validated (≥ 4 of 5)"],
], [44, 34, 22]));
C.push(B("**What went wrong with the book.** All three wrong picks are mistakes Tanya described herself. Two people (Mel, Claudette) had already booked and were never crossed off; the book can't show that, but the tool checks the booking export. One person (Tina) had changed her limits in a newer line further down (\"has to be done by 2:30\"); the tool always uses the newest line. Limits: the tester was me, not Tanya; I asked what some shorthand meant during round 1, so the book times include that; 5 openings per round is a small sample."));
C.push(B("**Regulars first could not be tested.** Only 1 person still waiting appears in the booking export at all (one visit), so \"regulars\" can't be identified. I compared asked-first with fastest-to-arrive (least notice needed first), which is Marc's \"whoever can get here\"."));
C.push(B("**Work saved, counted from the files** (34 openings where someone fits). Reading the book from line 1, the first right person is at line 16 (median; mean 19.8, worst 46), and 14 people are passed on the way, 8 of them out of date. In 14 of 34 openings the first right person is below line 20 (\"I never get to page three\"). With the page, the first name shown is right."));
C.push(H2("Verdict: mostly validated"));
C.push(P("Speed, accuracy and the flag share pass; the order changes fall in the partial band. The page has not been seen by Tanya, so trust in her real day is still untested. The timed test is a stand-in run by me, and I don't know the clients, like Bethany on Saturdays. Still open: who gets the first call (Tanya: \"Whoever asked first, I think\"; Marc: \"You and Tanya figure out the order\"), and how Josée looks first when Tanya \"doesn't have time to run to Josée between clients\"."));

// ---------------------------------------------------------------- VIABILITY
C.push(H1("4. Viability"));
C.push(P("**Question.** After I leave, can the clinic keep it running, is it affordable, and is it allowed with health information?"));
C.push(P("**Pass marks set on Monday.** No health detail gets through, 0 misses on the raw list and 2 or fewer on test rows. Cost $30 a month or less. 5 steps or fewer and 10 minutes or less from a clean setup, with no code changes. Stale-booking mistakes 1 of 5 or fewer. It would be overturned by any raw-list miss, a cost over $50, more than 8 steps, or 4 or more mistakes."));
C.push(P("**What the clinic said.** Marc: \"fifty a month, I wouldn't blink. A hundred and fifty, no. And Julie can't babysit it.\" He also wants \"nothing a client can read over the counter\", and \"Put it on one page.\" The desk has one Windows computer. Health details fall under New Brunswick's health privacy act (PHIPAA)."));
C.push(H2("What I did"));
C.push(B("Kept everything on the computer. The matching runs in a small Python backend that only that computer can reach (127.0.0.1), and the page only displays results. A single browser page, with a setting that blocks every network connection, gives the same names on a computer without Python."));
C.push(B("Scanned every output (screen, run log, results file) for health words, on the sample and on the reworded notes."));
C.push(B("Wrote the run steps for a non-technical person (HOW-TO-RUN.md) and tested them from a fresh copy."));
C.push(B("Tested a stale export by cutting the booking export back by one week and by 11 days."));
C.push(B("Wrote the hand-off plan and a one-page note for Marc (demo notes, sections 11 and 12)."));
C.push(H2("Results"));
C.push(table(["Pass mark", "Result", ""], [
  ["Health details: 0 misses", "0 health words in any output (sample and reworded notes, both versions). The screen shows only \"clinic therapist rule\". Nothing is sent, so nothing can leak in a message.", "✓"],
  ["Cost ≤ $30 a month", "$0: no AI service, texting, subscription or plan upgrade", "✓"],
  ["≤ 5 steps, ≤ 10 minutes, no code changes", "5 steps. From a fresh unzip, the first result in 0.3 s. Rehearsal on my Mac from a fresh download: 3 min 19 s, including the one-time macOS \"Open Anyway\" step", "✓"],
  ["Stale-booking mistakes ≤ 1 of 5", "Export one week old: 0 of 5 booked people missed. 11 days old: 1 of 5 missed.", "✓"],
  ["Only local, can't read other files", "The page talks only to 127.0.0.1. Requests for code or data files return \"not found\".", "✓"],
], [28, 58, 14]));
C.push(table(["Upkeep", "Figure"], [
  ["New waitlist lines a week (27 lines from Sep 21 to Oct 21)", "About 6"],
  ["Time to type them", "3.2 minutes for 6 lines (timed test, part 3)"],
  ["Julie's new work", "None: she already sends the Friday export"],
  ["Who changes a rule if the clinic wants one", "Open: a technical person, not Julie"],
], [60, 40]));
C.push(H2("Verdict: validated"));
C.push(P("Every mark is met. One planned check was not done: a separate hand count of health details in the 60 raw notes by me and a classmate. With no AI and nothing sent anywhere, the question it answered (would a health detail reach an outside service?) no longer arises; the output scan covers what remains."));
C.push(P("**Two bugs found and fixed while testing for the clinic's computer.** The date formatting would have crashed on Windows. Opening the page without starting the program used to hang on \"Loading…\"; it now says how to start it."));

// ---------------------------------------------------------------- APPENDIX
C.push(H1("Assumptions (not from the files)"));
C.push(B("Saturday desk time starts at 9:30 (Bethany arrives at 8:30 and the clinic opens at 9:00)."));
C.push(B("150 minutes is enough time to fill an opening: 2 hours' notice plus about 30 minutes of calling."));
C.push(B("Notice is measured from the cancellation to the start, as in Tanya's answer key, not from when she actually calls."));
C.push(B("Josée is the only therapist who wants to see the person first."));
C.push(B("A booking under the same last name and first initial, made after someone's last line, means they got in."));
C.push(H1("Open questions (unanswered, not guessed)"));
C.push(B("Julie: which browser the desk uses; whether Kneadly has an API or sends cancellation alerts; where Kneadly stores the data; whether a higher plan is really needed and what it costs."));
C.push(B("Marc: switching on the daily report (Julie: \"Give it a few days\")."));
C.push(B("Tanya: which call order she wants; whether 6 lines on Fridays feels like less work than the book; how Josée looks first."));
C.push(H1("How to reproduce"));
C.push(P("From the code folder: **python3 research/value_count.py** (Value), **bash tests/run_all.sh** (Feasibility, Viability and the backend checks, about 15 s), and **tests/timed/timed-test.html** (Usability timed test)."));

h.save("Four-risk research", C, process.argv[2] || "kettle-stone-four-risk-research.docx", "Kettle & Stone · four-risk research");

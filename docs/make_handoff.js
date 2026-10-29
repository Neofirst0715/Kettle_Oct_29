const h = require("./docx_helpers.js");
const { t, P, H1, H2, B, table, MUT, Paragraph } = h;
const C = h.newC();

C.push(new Paragraph({ children: [t("Hand-off plan", { bold: true, size: 40, color: "26302C" })], spacing: { after: 60 } }));
C.push(new Paragraph({ children: [t("Kettle & Stone: who to call for a late opening · Done check 3 · Zhenzhao (Neo) Li · October 30, 2026", { size: 20, color: MUT })], spacing: { after: 200 } }));
C.push(P("What the tool does: when someone cancels late, it shows the desk up to 3 people from the waitlist who fit that opening, one at a time, with a check of each person's own limits. It runs on the desk computer only. It sends no messages and books nothing; Tanya still makes the call and books in Kneadly."));

C.push(H1("1. Who looks after it"));
C.push(table(["Who", "When", "What", "Time"], [
  ["Tanya", "Every Friday, when Julie's export arrives", "Type the week's new waitlist lines at the end of the sheet (about 6 a week). Save the three files in the data folder. Cross off the people the page lists under \"Cross these off the book\".", "About 3 min (measured: 6 lines in 3.2 min)"],
  ["Tanya or Bethany", "After a cancellation", "Start the tool, call the person under \"Call this one now\", press \"No answer\" or \"Booked it\", then book in Kneadly as usual.", "Seconds to find the person"],
  ["Tanya", "When someone is under \"Needs a look\"", "Rewrite that line in plain words, for example \"after 4\", \"not Dave\", \"Mon/Wed only\". No code change.", "1 min each"],
  ["Julie", "No new task", "She already sends the Friday export.", "0"],
  ["Marc", "Optional, later", "Switch on the daily report in the owner account, so the booked check is never more than a day old.", "Once"],
  ["A technical person (open: who)", "Only if a therapist joins or leaves, or a clinic rule changes", "Change the rules file and re-run every check (tests/run_all.sh, about 15 seconds).", "Rare"],
], [16, 22, 44, 18]));
C.push(P("**Writing each person twice.** With the paper book, each new person is written in the book and then typed on Friday. The better next step, to try with Tanya first, is to drop the book and type new people straight into the one sheet on the desk computer, with the same columns and shorthand. That sheet then is the waitlist: one copy, nothing to install, nothing for Julie to look after."));
C.push(P("**Changing therapists or rules.** Therapist names, who has prenatal training, who looks first, and the defaults (60 minutes, 2 hours' notice, 2 months) are in the rules file today. Next step: move them into a small settings sheet that Tanya or Julie can edit."));

C.push(H1("2. What it costs to run"));
C.push(B("**Money: $0 a month.** No subscription, no AI service, no texting, no Kneadly plan upgrade. Marc's limit: \"fifty a month, I wouldn't blink. A hundred and fifty, no.\""));
C.push(B("**Tanya's time:** about 3 minutes a week to type the new lines. In my timed test, finding the first person to call took about 7 seconds with the tool against about 90 seconds with the book."));
C.push(B("**One-time setup:** Python (free) on the desk computer. If it can't be installed, the no-install page (fallback/kettle-refill.html) gives exactly the same names."));

C.push(H1("3. What happens when it gets one wrong"));
C.push(table(["What goes wrong", "How Tanya notices", "Worst outcome", "What to do"], [
  ["Shows someone who doesn't fit (a note read wrongly)", "The checklist under the name doesn't match what the person says on the phone", "One wasted call", "Rewrite that note in plain words"],
  ["Misses someone who fits", "\"Why the others were not offered\" names them with a reason", "The opening may stay empty, as today", "Rewrite the note; the book still works"],
  ["Shows someone who already booked (the export is up to a week old)", "Kneadly shows their booking when she goes to book", "One wasted call", "Cross them off"],
  ["Two people say yes", "Prevented: one person at a time, and \"Booked it\" says call nobody else. Kneadly has no hold; Julie can block time by hand.", "The second person waits", "Marc's rule: \"the second one gets a sorry and they're first next time\""],
  ["Wording the rules have never seen", "The person is listed under \"Needs a look\" and never shown", "That person is missed until fixed", "Rewrite the note"],
  ["Sample or old files left in the data folder", "An orange box at the top of the page", "Wrong day or old answers", "Empty the data folder and save this week's files"],
  ["The program won't start", "The start window says Python is missing, or the page says the program is not running", "Back to the green book for that day", "Use the no-install page"],
], [24, 30, 18, 28]));
C.push(P("**Switching it off:** close the program's window, or delete the kettle folder. Nothing is scheduled, nothing runs in the background, and nothing sends."));

C.push(H1("4. One-page note for Marc"));
C.push(P("**What it reads:** the three spreadsheets already at the desk. The typed waitlist: date, name, phone, note. The Friday booking export: client name, status, date booked, appointment date. The late openings: date, time, therapist, length, when cancelled."));
C.push(P("**Where the data goes:** nowhere. The program runs on the desk computer and only that computer can reach it (127.0.0.1). The no-install page has a built-in setting that blocks every internet connection. No AI service, no outside company, no texting."));
C.push(P("**What is kept:** the files stay in the data folder, as today. Each run saves a run log on that computer, with names and short reasons and no health details."));
C.push(P("**Who can see it:** whoever is at the desk screen. It shows names, phone numbers and limits, never the notes. A health-based rule shows only as \"clinic therapist rule\"."));
C.push(table(["Marc's reasons to say no", "How this handles it"], [
  ["It ever books two people into one slot", "It never books anyone. One person at a time; \"Booked it\" says call nobody else."],
  ["A health detail in a message, or on a screen a client can see", "It sends no messages. The screen shows no notes or conditions."],
  ["Clients feel pestered, or get offers for times they said they can't do", "It sends nothing, and it only names people whose own limits fit the opening."],
  ["Tanya won't use it, or the therapists lose their say", "One name at a glance, no typing. Josée's openings are flagged for her to look first. Not yet tried with Tanya."],
  ["Costs much more than $50 a month, or Julie has to fix it every week", "$0 a month. No new task for Julie."],
], [42, 58]));

C.push(H1("5. Open questions (not guessed)"));
C.push(B("Julie: which browser the desk uses; whether Python can be installed; whether Kneadly has an API or sends cancellation alerts; where it stores the data; whether a higher plan is really needed."));
C.push(B("Marc: switching on the daily report."));
C.push(B("Tanya: which call order she wants (asked first or fastest to arrive); whether she would type into the sheet instead of the book."));
C.push(B("Who changes a rule if the clinic needs one (not Julie)."));

h.save("Hand-off plan", C, process.argv[2] || "hand-off-plan.docx", "Kettle & Stone · hand-off plan");

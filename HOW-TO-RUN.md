# How to run it (for the front desk)

You need: this **kettle** folder and this week's three files (the late openings, the typed waitlist, Julie's Friday booking export).

## Once (first time only)
1. Copy the **kettle** folder onto the computer (for example, onto the Desktop).
2. Check for Python 3.9 or newer. If it's missing, install it from python.org. If you can't install anything, use "No Python?" at the end.

## Each week
3. Open the **data** folder inside **kettle** and **delete everything in it**, including the sample files, `day-of-use.txt` and any answers file. Then save this week's three files there. File names don't matter, but keep only one file of each kind.

## Each time you use it
4. Start it:
   - **Mac:** double-click **start.command**. The first time, macOS may say it "can't be opened" because it was downloaded. In that case, open System Settings → Privacy & Security, scroll down, and click **Open Anyway** (on older macOS, Control-click the file and choose Open). After that it opens normally.
   - **Windows:** double-click **start.bat**.

   A window with text opens, and the page opens in the browser by itself. **Keep that window open** while you use the page.
5. The page shows each opening. Call the person under **"Call this one now"**. Press **No answer / said no** to move to the next person, or **Booked it** when someone says yes. Then book them in Kneadly as usual.

When you're done, close the text window.

## Check before you trust the page
- The **Day of use** at the top should be today.
- There should be **no orange box** above the list. An orange box means sample files are still in the data folder; go back to step 3.

## If something goes wrong
- **"Can't show the list yet":** the page tells you which file is missing or doubled. Fix it in the data folder, then press **Refresh**.
- **"The program is not running":** start it again (step 4).
- **Someone is under "Needs a look":** their note couldn't be read, so they are never offered. Rewrite their line in plain words (for example "after 4", "not Dave", "Mon/Wed only").
- **"Cross these off the book":** these people are out of date. Cross them off the green book.

## No Python?
Double-click **fallback/kettle-refill.html**. It opens in the browser. Drag the three files onto the page, check the day, and press **Show who to call**. It shows exactly the same names.

import csv, re, sys, pathlib
from playwright.sync_api import sync_playwright
U = str(pathlib.Path(__file__).resolve().parent.parent / "samples" / "sep21-oct17") + "/"
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "fallback" / "kettle-refill.html").as_uri()
HEALTH = re.compile(r"sciatica|knee|hip\b|pregnan|post-?op|surgery|migraine|cancer|fibro|shoulder|tmj|concussion|hamstring|hockey|rotator|mva|claim|insurance|deep tissue|prenatal|trimester", re.I)
ok = True
def check(cond, label):
    global ok
    print(("PASS " if cond else "FAIL ") + label); ok &= bool(cond)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1100, "height": 900}, accept_downloads=True)
    pg = ctx.new_page()
    errors, net = [], []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("request", lambda r: net.append(r.url) if not r.url.startswith(("file:", "data:")) else None)
    pg.goto(PAGE)
    pg.screenshot(path=str(ROOT / "out/b0_setup.png"))
    check(pg.is_disabled("#go"), "button disabled before files are loaded")

    # 1. wrong file is refused with a message
    pg.set_input_files("#pick", [str(ROOT / "tests/data/reworded-waitlist.csv"), str(ROOT / "README.md")])
    check("Not recognised" in pg.inner_text("#msg"), "unknown file is reported, not guessed")

    # 2. real files, all at once, in any order, plus Tanya's answers
    pg.set_input_files("#pick", [U + "answer-key-tanya.csv", U + "appointments-2026-09-21-to-2026-10-17.csv",
                                 U + "waitlist-2026-10-21.csv", U + "late-openings-2026-09-21-to-2026-10-17.csv"])
    pg.fill("#today", "2026-10-21")
    pg.screenshot(path=str(ROOT / "out/b1_loaded.png"))
    pg.click("#go")
    lead = pg.inner_text("#lead")
    check("34 of 44" in lead and "44 of 44" in lead, "summary: 34 of 44 have someone · 44 of 44 match Tanya  (" + lead + ")")
    first = pg.inner_text(".p.now .nm")
    check(first == "Amanda Bourgeois", "first opening: call Amanda Bourgeois first")
    pg.screenshot(path=str(ROOT / "out/b2_results.png"), full_page=False)

    # 3. calling flow: no answer -> next person; booked -> filled; undo
    pg.click(".p.now button[data-a=no]")
    check(pg.inner_text(".p.now .nm") == "Joel Bertin", "after 'No answer', Joel Bertin becomes the one to call")
    pg.click(".p.now button[data-a=booked]")
    check("Filled by Joel Bertin" in pg.inner_text(".done-msg"), "after 'Booked it', page says filled, call nobody else")
    check(pg.inner_text(".item.on .n") == "✓", "left list marks the opening as filled")
    pg.screenshot(path=str(ROOT / "out/b3_booked.png"))
    pg.click("button[data-a=undo]")
    check(pg.inner_text(".p.now .nm") == "Amanda Bourgeois", "undo puts the list back")

    # 4. order switch on an opening where the orders differ (an opening where they differ)
    pg.click(".item[data-i='5']")
    a = pg.eval_on_selector_all(".p .nm", "els=>els.map(e=>e.textContent)")
    pg.click("[data-order=fast]")
    f = pg.eval_on_selector_all(".p .nm", "els=>els.map(e=>e.textContent)")
    check(a != f and "Fastest to arrive" in pg.inner_text(".p.now .sub"), f"order switch changes the order ({a} -> {f})")
    pg.screenshot(path=str(ROOT / "out/b4_fast.png"))
    pg.click("[data-order=asked]")

    # 5. every opening: visible text has no health words; nobody-cards show for none
    texts, nones = [], 0
    n = pg.locator(".item").count()
    for i in range(n):
        pg.click(f".item[data-i='{i}']")
        pg.click(".whynot summary")
        t = pg.inner_text("#panel"); texts.append(t)
        nones += "Nobody on the list fits" in t
    full = "\n".join(texts) + pg.inner_text("body")
    hits = sorted(set(m.group(0).lower() for m in HEALTH.finditer(full)))
    check(n == 44 and nones == 10, f"44 openings listed, 10 show nobody ({n}, {nones})")
    check(not hits, f"no health words anywhere on screen {hits}")

    # 6. run log download equals the Python run log
    with pg.expect_download() as d:
        pg.click("#logBtn")
    path = d.value.path()
    got = list(csv.reader(open(path, encoding="utf-8")))
    want = list(csv.reader(open(str(ROOT / "out/run_log.csv"), encoding="utf-8")))
    check(got == want, f"downloaded run log identical to the Python run log ({len(got)} rows)")

    # 7. sample button path
    pg.click("#back"); pg.click("#sampleBtn"); pg.click("#go")
    check("44 of 44" in pg.inner_text("#lead"), "sample button works")

    # 8. phone width
    m = b.new_page(viewport={"width": 390, "height": 844}); m.goto(PAGE); m.click("#sampleBtn"); m.click("#go")
    wide = m.evaluate("document.documentElement.scrollWidth")
    check(wide <= 390, f"no sideways scroll on a phone ({wide}px)")
    m.screenshot(path=str(ROOT / "out/b5_phone.png"), full_page=False)

    check(not net, f"page made no network requests {net[:3]}")
    check(not errors, f"no script errors {errors[:3]}")
    b.close()
print("ALL PASS" if ok else "SOME FAILED"); sys.exit(0 if ok else 1)

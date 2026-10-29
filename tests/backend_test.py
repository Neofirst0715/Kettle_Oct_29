"""End-to-end test of the backend version: start the local server, use the page in a real browser."""
import csv, json, pathlib, re, shutil, socket, subprocess, sys, tempfile, time, urllib.request, urllib.error
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SAMPLE = ROOT / "samples" / "sep21-oct17"
HEALTH = re.compile(r"sciatica|knee|hip\b|pregnan|post-?op|surgery|migraine|cancer|fibro|shoulder|tmj|concussion|hamstring|hockey|rotator|mva|claim|insurance|deep tissue|prenatal|trimester", re.I)
ok = True


def check(cond, label):
    global ok
    print(("PASS " if cond else "FAIL ") + label)
    ok &= bool(cond)


def start(data, logs, port):
    p = subprocess.Popen([sys.executable, "-m", "backend.server", "--no-browser", "--port", str(port), "--data", str(data), "--logs", str(logs)],
                         cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for _ in range(50):
        try:
            socket.create_connection(("127.0.0.1", port), timeout=0.2).close()
            return p
        except OSError:
            time.sleep(0.1)
    raise RuntimeError("server did not start")


def get(port, path):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}{path}") as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


tmp = pathlib.Path(tempfile.mkdtemp())
data, logs = tmp / "data", tmp / "logs"
shutil.copytree(SAMPLE, data)
PORT = 8791
srv = start(data, logs, PORT)
try:
    # ---------- API
    code, body = get(PORT, "/api/results")
    j = json.loads(body)
    check(code == 200 and j["today"] == "2026-10-21", "API answers; day of use taken from day-of-use.txt (sample = Oct 21)")
    check(j["score"] == 44 and len(j["results"]) == 44, f"API: 44 openings, 44 of 44 match Tanya (score {j['score']})")
    ref = json.load(open(ROOT / "out/api_ref.json"))
    same = all(j[k] == ref[k] for k in ("results", "needs_review", "out_of_date", "score", "order_changes"))
    check(same, "API output identical to the tested rules (command-line run)")
    logfile = ROOT / "out/api_ref_log.csv"
    saved = logs / pathlib.Path(j["log_file"]).name
    check(saved.exists() and list(csv.reader(open(saved, encoding="utf-8"))) == list(csv.reader(open(logfile, encoding="utf-8"))),
          "run log saved by the backend and identical to the command-line run log")
    code, _ = get(PORT, "/api/results?today=not-a-date")
    check(code == 400, "bad date is refused with a message")
    for path in ("/backend/server.py", "/../data/waitlist-2026-10-21.csv", "/data/waitlist-2026-10-21.csv", "/%2e%2e/README.md"):
        code, _ = get(PORT, path)
        check(code == 404, f"cannot read files outside the page: {path} -> {code}")

    # ---------- page in a real browser
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1100, "height": 900})
        errors, outside = [], []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("request", lambda r: outside.append(r.url) if not r.url.startswith(f"http://127.0.0.1:{PORT}/") else None)
        pg.goto(f"http://127.0.0.1:{PORT}/")
        pg.wait_for_selector(".p.now .nm")
        check("44 of 44" in pg.inner_text("#lead"), "page opens straight on the results, no upload step")
        check(pg.inner_text(".p.now .nm") == "Amanda Bourgeois", "first opening: call Amanda Bourgeois first")
        w = pg.inner_text("#warn") if pg.is_visible("#warn") else ""
        check("day-of-use.txt" in w and "Tanya's answers" in w, "sample data: orange warning says the day is fixed and an answers file is present")
        pg.screenshot(path=str(ROOT / "out/s1_open.png"))
        pg.click(".p.now button[data-a=no]")
        check(pg.inner_text(".p.now .nm") == "Joel Bertin", "'No answer' moves to Joel Bertin")
        pg.click(".p.now button[data-a=booked]")
        check("Filled by Joel Bertin" in pg.inner_text(".done-msg") and pg.inner_text(".item.on .n") == "✓", "'Booked it' marks the opening filled")
        pg.click(".item[data-i='5']")
        a = pg.eval_on_selector_all(".p .nm", "els=>els.map(e=>e.textContent)")
        pg.click("[data-order=fast]")
        f = pg.eval_on_selector_all(".p .nm", "els=>els.map(e=>e.textContent)")
        check(a != f, f"order switch changes the order ({a} -> {f})")
        pg.click("[data-order=asked]")
        pg.click("#refresh"); pg.wait_for_selector(".p .nm")
        check(pg.locator(".item.on").get_attribute("data-i") == "5" and pg.inner_text(".item[data-i='0'] .n") == "✓",
              "Refresh keeps the open opening and the 'filled' marks")
        texts = []
        for i in range(pg.locator(".item").count()):
            pg.click(f".item[data-i='{i}']"); pg.click(".whynot summary"); texts.append(pg.inner_text("#panel"))
        hits = sorted(set(m.group(0).lower() for m in HEALTH.finditer("\n".join(texts) + pg.inner_text("body"))))
        check(not hits, f"no health words anywhere on screen {hits}")
        pg.fill("#today", "2026-10-30"); pg.dispatch_event("#today", "change"); pg.wait_for_selector(".p .nm")
        code, body = get(PORT, "/api/results?today=2026-10-30")
        check("2026-10-30" in pg.inner_text("#files") or pg.input_value("#today") == "2026-10-30", "changing the day of use reloads the list")
        m = b.new_page(viewport={"width": 390, "height": 844}); m.goto(f"http://127.0.0.1:{PORT}/"); m.wait_for_selector(".p .nm")
        check(m.evaluate("document.documentElement.scrollWidth") <= 390, "no sideways scroll on a phone")
        check(not outside, f"page talks only to this computer {outside[:3]}")
        check(not errors, f"no script errors {errors[:3]}")
        b.close()

    # ---------- Friday rehearsal: only the three files, no answers, no day-of-use
    for f in ("answer-key-tanya.csv", "day-of-use.txt"):
        (data / f).unlink()
    code, body = get(PORT, "/api/results")
    j = json.loads(body)
    import datetime as dt
    check(code == 200 and j["score"] is None and j["today"] == dt.date.today().isoformat() and not j["day_fixed_by_file"],
          "with only the 3 files: runs, day of use = today, no score, no warning")
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(f"http://127.0.0.1:{PORT}/"); pg.wait_for_selector("#list .item")
        check(not pg.is_visible("#warn"), "real-run files: the warning is gone"); b.close()
    shutil.copy(SAMPLE / "waitlist-2026-10-21.csv", data / "waitlist-old.csv")
    code, body = get(PORT, "/api/results")
    check(code == 400 and "two waitlist files" in json.loads(body)["error"], "two waitlist files: refused with a plain message")
    (data / "waitlist-old.csv").unlink(); (data / "appointments-2026-09-21-to-2026-10-17.csv").unlink()
    code, body = get(PORT, "/api/results")
    check(code == 400 and "no booking export" in json.loads(body)["error"], "missing booking export: refused with a plain message")
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(f"http://127.0.0.1:{PORT}/"); pg.wait_for_selector(".state .err")
        check("no booking export" in pg.inner_text(".state"), "the page shows that message to the person at the desk")
        pg.screenshot(path=str(ROOT / "out/s2_error.png")); b.close()
finally:
    srv.terminate()
    out, _ = srv.communicate(timeout=5)

with sync_playwright() as p:     # program not running -> the page explains what to do
    b = p.chromium.launch(); pg = b.new_page()
    pg.route("**/api/results*", lambda route: route.abort())
    pg.goto((ROOT / "frontend" / "index.html").as_uri()); pg.wait_for_selector(".state .err")
    check("not running" in pg.inner_text(".state"), "if the program is not running, the page says how to start it")
    b.close()
check("Keep this window open" in out and "127.0.0.1" in out, "start-up window tells the user to keep it open")
print("ALL PASS" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)

"""Build the fallback page: fallback/kettle-refill.html (no install, no internet; same rules as the backend)."""
import json
import pathlib

HERE = pathlib.Path(__file__).parent
U = HERE.parent / "samples" / "sep21-oct17"
SAMPLE = {
    "openings": "late-openings-2026-09-21-to-2026-10-17.csv",
    "waitlist": "waitlist-2026-10-21.csv",
    "appointments": "appointments-2026-09-21-to-2026-10-17.csv",
    "key": "answer-key-tanya.csv",
}


def script(src):
    return "<script>\n" + src.replace("</script", "<\\/script") + "\n</script>"


page = (HERE / "page.html").read_text(encoding="utf-8")
sample = {"today": "2026-10-21", "names": SAMPLE,
          "files": {k: (U / v).read_text(encoding="utf-8") for k, v in SAMPLE.items()}}
page = page.replace("<!--SAMPLE-->", '<script type="application/json" id="sample">'
                    + json.dumps(sample, ensure_ascii=False).replace("</", "<\\/") + "</script>")
page = page.replace("<!--ENGINE-->", script((HERE / "engine.js").read_text(encoding="utf-8")))
page = page.replace("<!--APP-->", script((HERE / "app.js").read_text(encoding="utf-8")))
out = HERE / "kettle-refill.html"
out.write_text(page, encoding="utf-8")
print(out, f"{out.stat().st_size / 1024:.0f} KB")

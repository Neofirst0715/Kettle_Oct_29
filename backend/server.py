"""Local server for the desk page. Only this computer can reach it (127.0.0.1); nothing goes out.

Start:  python -m backend.server            (from the kettle folder; start.bat does this)
Options: --data FOLDER  --logs FOLDER  --port 8765  --no-browser
"""
import argparse
import csv
import datetime as dt
import hashlib
import json
import pathlib
import sys
import threading
import webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

from .datasource import FolderSource, DataError
from .service import run_all

ROOT = pathlib.Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
STATIC = {"/": ("index.html", "text/html; charset=utf-8"),
          "/app.js": ("app.js", "text/javascript; charset=utf-8"),
          "/style.css": ("style.css", "text/css; charset=utf-8")}
CSP = "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"


class App:
    def __init__(self, data, logs):
        self.source = FolderSource(data)
        self.logs = pathlib.Path(logs)
        self._last_log = None

    def default_day(self):
        """Day of use: today, unless the data folder has a day-of-use.txt (used for the sample, list as of Oct 21)."""
        f = self.source.folder / "day-of-use.txt"
        if f.exists():
            return dt.date.fromisoformat(f.read_text(encoding="utf-8").strip())
        return dt.date.today()

    def results(self, today):
        files = self.source.load()
        out = run_all(files["openings"]["rows"], files["waitlist"]["rows"], files["appointments"]["rows"],
                      today, files["key"]["rows"] if "key" in files else None)
        out["day_fixed_by_file"] = (self.source.folder / "day-of-use.txt").exists()
        out["files"] = [{"kind": k, "name": v["name"], "rows": len(v["rows"])}
                        for k, v in files.items() if not k.startswith("_")]
        out["ignored_files"] = files["_unknown"]
        out["log_file"] = self._write_log(out)
        del out["log"]
        return out

    def _write_log(self, out):
        """One run log per distinct input and day of use: who was shown, and why the others were not."""
        sig = hashlib.sha1(json.dumps([out["today"], out["files"], out["log"]]).encode()).hexdigest()[:8]
        name = f"run-{out['today']}-{sig}.csv"
        path = self.logs / name
        if not path.exists():
            self.logs.mkdir(parents=True, exist_ok=True)
            with open(path, "w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(["opening", "action", "person", "reason"])
                w.writerows(out["log"])
        return f"logs/{name}"


def make_handler(app):
    class Handler(BaseHTTPRequestHandler):
        server_version = "KettleStone"

        def log_message(self, *args):          # keep the window quiet
            pass

        def _send(self, code, body, ctype):
            data = body if isinstance(body, bytes) else body.encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Security-Policy", CSP)
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(data)

        def _json(self, code, obj):
            self._send(code, json.dumps(obj, ensure_ascii=False), "application/json; charset=utf-8")

        def do_GET(self):
            url = urlparse(self.path)
            if url.path in STATIC:
                name, ctype = STATIC[url.path]
                return self._send(200, (FRONTEND / name).read_bytes(), ctype)
            if url.path == "/api/results":
                q = parse_qs(url.query)
                try:
                    today = dt.date.fromisoformat(q["today"][0]) if q.get("today") else app.default_day()
                except ValueError:
                    return self._json(400, {"error": "The day of use is not a date."})
                try:
                    return self._json(200, app.results(today))
                except DataError as e:
                    return self._json(400, {"error": str(e)})
                except Exception as e:                 # a file the rules could not read at all
                    return self._json(500, {"error": f"Could not read the files: {e}"})
            self._send(404, "Not found", "text/plain; charset=utf-8")

    return Handler


def main(argv=None):
    ap = argparse.ArgumentParser(description="Kettle & Stone late openings: local server")
    ap.add_argument("--data", default=str(ROOT / "data"))
    ap.add_argument("--logs", default=str(ROOT / "logs"))
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args(argv)
    app = App(a.data, a.logs)
    httpd = None
    for port in range(a.port, a.port + 20):
        try:
            httpd = ThreadingHTTPServer(("127.0.0.1", port), make_handler(app))
            break
        except OSError:
            continue
    if httpd is None:
        print("Could not start: no free port.")
        return 1
    url = f"http://127.0.0.1:{httpd.server_address[1]}/"
    print("Kettle & Stone: who to call")
    print(f"Running at {url}")
    print("Keep this window open while you use the page. Close it to stop.")
    sys.stdout.flush()
    if not a.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())

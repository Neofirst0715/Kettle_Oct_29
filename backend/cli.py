"""Command line run of the same service, for tests and checks.

  python -m backend.cli --openings OPEN.csv --waitlist WAIT.csv --appointments EXPORT.csv --today 2026-10-21 [--key KEY.csv] [--out out]

Writes out/results.json and out/run_log.csv.
"""
import argparse
import csv
import datetime as dt
import json
import os

from .service import run_all


def rows(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--openings", required=True)
    ap.add_argument("--waitlist", required=True)
    ap.add_argument("--appointments", required=True)
    ap.add_argument("--today", required=True)
    ap.add_argument("--key")
    ap.add_argument("--out", default="out")
    a = ap.parse_args()
    out = run_all(rows(a.openings), rows(a.waitlist), rows(a.appointments), dt.date.fromisoformat(a.today),
                  rows(a.key) if a.key else None)
    os.makedirs(a.out, exist_ok=True)
    log = out.pop("log")
    with open(os.path.join(a.out, "results.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    with open(os.path.join(a.out, "run_log.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["opening", "action", "person", "reason"])
        w.writerows(log)
    r = out["results"]
    print(f"{len(r)} openings · {out['people_count']} people ({len(out['out_of_date'])} out of date, "
          f"{len(out['needs_review'])} need a look) · {sum(1 for x in r if x['shown'])} have someone to call")
    if out["score"] is not None:
        print(f"Check against Tanya's answers (both orders): {out['score']}/{len(r)}")


if __name__ == "__main__":
    main()

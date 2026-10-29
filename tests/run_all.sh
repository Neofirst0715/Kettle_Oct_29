#!/bin/bash
# Run every check. From the kettle folder:  bash tests/run_all.sh
set -e
cd "$(dirname "$0")/.."
S=samples/sep21-oct17
export PYTHONPATH=.
echo "== 1. Sample vs Tanya's answers";      python3 tests/evaluate.py | tail -2
echo "== 2. Reworded notes";                 python3 tests/test_reworded.py | tail -1
echo "== 3. Tanya's active/stale labels";    python3 tests/inspect_people.py | tail -1
echo "== 4. Backend vs browser fallback, 7 data sets"
for c in "$S/waitlist-2026-10-21.csv|2026-10-21" "$S/waitlist-2026-10-21.csv|2026-10-30" "$S/waitlist-2026-10-21.csv|2026-12-01" \
         "tests/data/reworded-waitlist.csv|2026-10-21" "tests/data/reworded-waitlist.csv|2026-11-04" \
         "tests/data/fuzz-waitlist.csv|2026-10-21" "tests/data/fuzz-waitlist.csv|2026-10-30"; do
  W=${c%|*}; D=${c#*|}
  python3 -m backend.cli --openings $S/late-openings-2026-09-21-to-2026-10-17.csv --waitlist $W --appointments $S/appointments-2026-09-21-to-2026-10-17.csv --today $D --out out/p >/dev/null
  node tests/parity/run_node.js $S/late-openings-2026-09-21-to-2026-10-17.csv $W $S/appointments-2026-09-21-to-2026-10-17.csv $D - out/p/js.json
  echo -n "   $(basename $W) $D: "; python3 tests/parity/compare.py out/p/results.json out/p/js.json
done
echo "== 5. Backend end to end (server + page)"
python3 -m backend.cli --openings $S/late-openings-2026-09-21-to-2026-10-17.csv --waitlist $S/waitlist-2026-10-21.csv --appointments $S/appointments-2026-09-21-to-2026-10-17.csv --today 2026-10-21 --key $S/answer-key-tanya.csv --out out/ref >/dev/null
cp out/ref/results.json out/api_ref.json; cp out/ref/run_log.csv out/api_ref_log.csv; cp out/ref/run_log.csv out/run_log.csv
python3 tests/backend_test.py | tail -1
echo "== 6. Fallback page (no Python)";      python3 fallback/build.py >/dev/null; python3 tests/fallback_browser_test.py | tail -1

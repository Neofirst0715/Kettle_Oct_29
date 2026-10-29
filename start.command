#!/bin/bash
# Kettle & Stone: who to call. Double-click to start (Mac). Keep this window open while you use the page.
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1 || ! python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)" >/dev/null 2>&1; then
  echo "Python 3.9 or newer is not installed on this Mac."
  echo "Install it from python.org, or open fallback/kettle-refill.html instead (same results, no Python needed)."
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi
python3 -m backend.server

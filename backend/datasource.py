"""Where the data comes from.

Today: a folder of CSV files (the week's late openings, the typed waitlist, the Friday booking export,
and optionally Tanya's answers). Each file is recognised by its columns, so file names don't matter.

Later: a database (for example the waitlist entered through a form with fixed fields) can replace this
by offering the same load() method that returns the same dictionary.
"""
import csv
import pathlib

KINDS = {
    "openings": ("Late openings", ["opening_id", "date", "start", "length_min", "therapist", "cancelled_at"]),
    "waitlist": ("Waitlist", ["line", "added", "name", "phone", "notes"]),
    "appointments": ("Booking export", ["client_name", "status", "booked_at", "date"]),
    "key": ("Tanya's answers", ["id", "answer"]),
}
REQUIRED = ("openings", "waitlist", "appointments")


class DataError(Exception):
    """A problem a person at the desk can fix (missing file, two files of one kind, wrong columns)."""


def _read(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def _kind(rows):
    cols = set(rows[0].keys()) if rows else set()
    if "opening_id" in cols:
        return "openings"
    if {"line", "notes"} <= cols:
        return "waitlist"
    if "client_name" in cols:
        return "appointments"
    if {"id", "answer"} <= cols:
        return "key"
    return None


class FolderSource:
    def __init__(self, folder):
        self.folder = pathlib.Path(folder)

    def load(self):
        """Return {kind: {"name": file name, "rows": [...]}} or raise DataError with a plain message."""
        if not self.folder.is_dir():
            raise DataError(f"The data folder is missing: {self.folder}")
        found, unknown = {}, []
        for path in sorted(self.folder.glob("*.csv")):
            try:
                rows = _read(path)
            except (UnicodeDecodeError, csv.Error):
                unknown.append(path.name)
                continue
            k = _kind(rows)
            if k is None:
                unknown.append(path.name)
                continue
            if k in found:
                raise DataError(f"There are two {KINDS[k][0].lower()} files in the data folder "
                                f"({found[k]['name']} and {path.name}). Keep only this week's.")
            missing = [c for c in KINDS[k][1] if c not in rows[0]]
            if missing:
                raise DataError(f"{path.name} is missing columns: {', '.join(missing)}.")
            found[k] = {"name": path.name, "rows": rows}
        absent = [KINDS[k][0].lower() for k in REQUIRED if k not in found]
        if absent:
            raise DataError("The data folder has no " + " and no ".join(absent) + " file. "
                            "Save this week's files there and press Refresh.")
        found["_unknown"] = unknown
        return found

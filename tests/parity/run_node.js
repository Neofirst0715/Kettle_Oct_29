// Run the browser engine from the command line, for parity tests only.
const fs = require("fs"), E = require("../../fallback/engine.js");
const [,, openings, waitlist, appointments, today, key, out] = process.argv;
const rd = (f) => E.parseCSV(fs.readFileSync(f, "utf8"));
const res = E.run({ openings: rd(openings), waitlist: rd(waitlist), appointments: rd(appointments), today,
  key: key && key !== "-" ? rd(key) : null });
fs.writeFileSync(out, JSON.stringify(res, null, 1));

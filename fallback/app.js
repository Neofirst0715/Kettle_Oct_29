/* The desk page: load this week's files, show who to call. Everything stays in this browser tab. */
(function () {
  "use strict";
  const E = window.KettleEngine;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KINDS = { openings: "Late openings", waitlist: "Waitlist", appointments: "Booking export", key: "Tanya's answers (optional, for checking only)" };
  const files = {};          // kind -> {name, rows}
  let data = null, sel = 0, order = "asked";
  const state = {};          // opening index -> {skipped:Set, booked:null|name}

  function localToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

  function detect(rows) {
    const h = rows.length ? Object.keys(rows[0]) : [];
    if (h.includes("opening_id")) return "openings";
    if (h.includes("notes") && h.includes("line")) return "waitlist";
    if (h.includes("client_name")) return "appointments";
    if (h.includes("answer") && h.includes("id")) return "key";
    return null;
  }

  function showFiles() {
    const li = Object.keys(KINDS).map((k) => {
      const f = files[k], need = k !== "key";
      return `<li class="${f ? "got" : need ? "need" : "opt"}"><span class="mk">${f ? "✓" : need ? "○" : "·"}</span><span class="k">${esc(KINDS[k])}</span><span class="fn">${f ? esc(f.name) + ` · ${f.rows.length} rows` : need ? "not loaded yet" : ""}</span></li>`;
    }).join("");
    $("#files").innerHTML = li;
    $("#go").disabled = !(files.openings && files.waitlist && files.appointments);
  }

  function msg(text, kind) { const m = $("#msg"); m.textContent = text || ""; m.className = "msg " + (kind || ""); m.hidden = !text; }

  function readFiles(list) {
    msg("");
    const unknown = [];
    return Promise.all([...list].map((f) => f.text().then((txt) => {
      const rows = E.parseCSV(txt), k = detect(rows);
      if (!k) { unknown.push(f.name); return; }
      files[k] = { name: f.name, rows };
    }))).then(() => {
      showFiles();
      if (unknown.length) msg("Not recognised (are these the right files?): " + unknown.join(", "), "warn");
    });
  }

  function loadSample() {
    const s = JSON.parse($("#sample").textContent);
    for (const k of Object.keys(s.files)) files[k] = { name: s.names[k], rows: E.parseCSV(s.files[k]) };
    $("#today").value = s.today;
    showFiles();
    msg("Sample files loaded (Sep 21 – Oct 17, list as of Oct 21). Press “Show who to call”.", "ok");
  }

  function go() {
    msg("");
    for (const k of ["openings", "waitlist", "appointments", "key"]) {
      if (!files[k]) continue;
      const e = E.checkColumns(k, files[k].rows);
      if (e) { msg(e + " Nothing was changed.", "warn"); return; }
    }
    const today = $("#today").value;
    if (!today) { msg("Pick the day of use first.", "warn"); return; }
    try {
      data = E.run({ openings: files.openings.rows, waitlist: files.waitlist.rows, appointments: files.appointments.rows,
        today, key: files.key ? files.key.rows : null });
    } catch (err) { msg("Could not read the files: " + err.message, "warn"); return; }
    for (const k of Object.keys(state)) delete state[k];
    sel = Math.max(0, data.results.findIndex((r) => r.shown.length));
    $("#setup").hidden = true; $("#results").hidden = false; document.body.classList.remove("setup-mode");
    renderAll();
    window.scrollTo(0, 0);
  }

  function st(i) { return state[i] || (state[i] = { skipped: new Set(), booked: null }); }

  function renderAll() {
    const r = data.results, some = r.filter((x) => x.shown.length).length;
    let lead = `<b>${some} of ${r.length}</b> openings have someone to call`;
    if (data.score !== null) lead += ` · both orders match Tanya's answers on <b>${data.score} of ${r.length}</b>`;
    $("#lead").innerHTML = `${lead}. List as of ${esc(data.today)}.`;
    renderList(); renderPanel();
    $("#review").innerHTML = data.needs_review.map((x) => `<li>${esc(x.name)}</li>`).join("") || "<li>None</li>";
    $("#reviewN").textContent = data.needs_review.length;
    $("#old").innerHTML = data.out_of_date.map((x) => `<li>${esc(x.name)} · ${esc(x.why)}</li>`).join("") || "<li>None</li>";
    $("#oldN").textContent = data.out_of_date.length;
  }

  function renderList() {
    let last = "", h = "";
    data.results.forEach((r, i) => {
      const [day, tm] = r.when.split(", ");
      if (day !== last) { h += `<div class="day">${esc(day)}</div>`; last = day; }
      const n = r.shown.length, s = state[i];
      const badge = s && s.booked ? '<span class="n done">✓</span>' : `<span class="n${n ? "" : " z"}">${n || "–"}</span>`;
      h += `<button class="item${i === sel ? " on" : ""}" data-i="${i}"><span class="t">${esc(tm)}</span><span class="th">${esc(r.therapist.split(" ")[0])} · ${r.length} min</span>${badge}</button>`;
    });
    $("#list").innerHTML = h;
  }

  function renderPanel() {
    const r = data.results[sel], f = r.funnel, s = st(sel);
    const people = order === "asked" ? r.shown : r.shown_reg;
    const now = s.booked ? null : people.find((p) => !s.skipped.has(p.name));
    let h = `<h2>${esc(r.when)} · ${r.length} min · ${esc(r.therapist)}</h2>
      <div class="meta">Cancelled ${esc(r.cancelled)} · ${r.notice_h} h notice</div>
      <div class="funnel"><span><b>${f.total}</b> in the book</span><span class="arrow">→</span><span><b>${f.waiting}</b> still waiting</span><span class="arrow">→</span><span><b>${f.fit}</b> fit this opening</span><span class="arrow">→</span><span><b>${f.shown}</b> to call</span></div>`;
    if (!people.length) {
      h += `<div class="none">Nobody on the list fits this one${r.notice_h <= 0.3 ? " (a no-show: it is too late to offer)." : "."}</div>`;
    } else {
      h += `<div class="rule"><b>One person at a time.</b> Wait about 20 minutes after a voicemail before the next call.</div>`;
      if (s.booked) h += `<div class="done-msg">Filled by <b>${esc(s.booked)}</b>. Do not call anyone else. <button class="link" data-a="undo">Undo</button></div>`;
      else if (!now) h += `<div class="done-msg warn">Everyone shown has been tried. <button class="link" data-a="undo">Start again</button></div>`;
      people.forEach((p, q) => {
        const cls = s.booked ? (p.name === s.booked ? "now" : "later") : s.skipped.has(p.name) ? "skipped" : p === now ? "now" : "later";
        const tags = (p.look_first ? '<span class="tag">therapist looks first</span>' : "") + (p.text_only ? '<span class="tag">text only</span>' : "");
        const checks = p.checks.map(([w, rq, g]) => `<li><span class="ck">✓</span><span class="w">${esc(w)}</span><span class="req">${esc(rq)}</span><span class="got">this: ${esc(g)}</span></li>`).join("");
        const btns = cls === "now" && !s.booked ? `<span class="btns"><button data-a="no" data-n="${esc(p.name)}">No answer / said no</button><button class="go" data-a="booked" data-n="${esc(p.name)}">Booked it</button></span>` : "";
        h += `<div class="p ${cls}"><span class="lab">${s.booked ? "Booked" : "Call this one now"}</span><span class="rk">${q + 1}</span><span class="nm">${esc(p.name)}</span><span class="ph">${esc(p.phone)}</span>
          <span class="sub"><span>${esc(p.reason)}</span>${tags}</span><ul class="chks">${checks}</ul>${btns}</div>`;
      });
    }
    if (r.more) h += `<div class="more">+${r.more} more would fit, not shown.</div>`;
    const ro = r.ruled_out;
    h += `<details class="whynot"><summary>Why the others were not offered (${ro.length})</summary>${r.others_fit.length ? `<p>Also fit but not in the top 3: ${esc(r.others_fit.join(", "))}.</p>` : ""}<ul>${ro.map((x) => `<li><b>${esc(x.name)}</b> · ${esc(x.why)}</li>`).join("") || "<li>Nobody</li>"}</ul></details>`;
    if (r.check) h += `<div class="chk ${r.check.ok ? "" : "miss"}">${r.check.ok ? "✓ Matches" : "✗ Differs from"} Tanya's list: ${esc(r.check.tanya.join(", ") || "nobody")}</div>`;
    $("#panel").innerHTML = h;
  }

  function downloadLog() {
    const q = (v) => /[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    const csv = [["opening", "action", "person", "reason"]].concat(data.log).map((r) => r.map(q).join(",")).join("\r\n") + "\r\n";
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `run-log-${data.today}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#today").value = localToday();
    showFiles();
    $("#pick").addEventListener("change", (e) => readFiles(e.target.files));
    const dz = $("#drop");
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
    dz.addEventListener("drop", (e) => readFiles(e.dataTransfer.files));
    $("#sampleBtn").addEventListener("click", loadSample);
    $("#go").addEventListener("click", go);
    $("#back").addEventListener("click", () => { $("#results").hidden = true; $("#setup").hidden = false; document.body.classList.add("setup-mode"); });
    $("#logBtn").addEventListener("click", downloadLog);
    $("#list").addEventListener("click", (e) => { const b = e.target.closest(".item"); if (!b) return; sel = +b.dataset.i; renderList(); renderPanel(); });
    document.querySelectorAll("[data-order]").forEach((b) => b.addEventListener("click", () => {
      order = b.dataset.order; document.querySelectorAll("[data-order]").forEach((x) => x.classList.toggle("on", x === b)); renderPanel();
    }));
    $("#panel").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const s = st(sel);
      if (b.dataset.a === "no") s.skipped.add(b.dataset.n);
      if (b.dataset.a === "booked") s.booked = b.dataset.n;
      if (b.dataset.a === "undo") { s.booked = null; s.skipped.clear(); }
      renderList(); renderPanel();
    });
  });
})();

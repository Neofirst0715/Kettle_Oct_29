/* Desk page. It only asks the local backend for results and shows them; all matching happens in the backend. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let data = null, sel = 0, order = "asked";
  const state = {};   // opening id -> {skipped:Set, booked:null|name}; kept only while the page is open

  function showState(html, isErr) {
    $("#results").hidden = true;
    $("#state").hidden = false;
    $("#state").innerHTML = `<div class="${isErr ? "err" : ""}">${html}</div>`;
  }

  const NOT_RUNNING = "<b>The program is not running</b>Double-click <b>start</b> in the Kettle folder (keep its black window open). The page then opens by itself.";

  function load() {
    if (location.protocol === "file:") { showState(NOT_RUNNING, true); return; }
    showState("Loading…");
    const day = $("#today").value;
    fetch("/api/results" + (day ? "?today=" + encodeURIComponent(day) : ""), { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) { showState(`<b>Can't show the list yet</b>${esc(j.error || "Unknown problem.")}`, true); $("#files").textContent = ""; return; }
        const keep = data && data.results[sel] ? data.results[sel].id : null;
        data = j;
        $("#today").value = j.today;
        const idx = keep ? data.results.findIndex((r) => r.id === keep) : -1;
        sel = idx >= 0 ? idx : Math.max(0, data.results.findIndex((r) => r.shown.length));
        $("#state").hidden = true; $("#results").hidden = false;
        renderAll();
      })
      .catch(() => showState(NOT_RUNNING.replace("The page then opens by itself.", "Then press Refresh."), true));
  }

  function st(id) { return state[id] || (state[id] = { skipped: new Set(), booked: null }); }

  function renderAll() {
    const r = data.results, some = r.filter((x) => x.shown.length).length;
    let lead = `<b>${some} of ${r.length}</b> openings have someone to call`;
    if (data.score !== null) lead += ` · both orders match Tanya's answers on <b>${data.score} of ${r.length}</b>`;
    $("#lead").innerHTML = lead + ". Nothing is sent from here.";
    const warn = [];
    if (data.day_fixed_by_file) warn.push(`The day of use is fixed to <b>${esc(data.today)}</b> by <b>day-of-use.txt</b> in the data folder (that is for the sample). For a real run, delete that file.`);
    if (data.score !== null) warn.push(`A file of <b>Tanya's answers</b> is in the data folder, so each opening shows a check against it. For a real run, remove it.`);
    $("#warn").innerHTML = warn.map((w) => `<p>${w}</p>`).join("");
    $("#warn").hidden = !warn.length;
    const label = { openings: "Openings", waitlist: "Waitlist", appointments: "Booking export", key: "Tanya's answers" };
    $("#files").textContent = "Files: " + data.files.map((f) => `${label[f.kind]} ${f.name} (${f.rows} rows)`).join(" · ") +
      (data.ignored_files.length ? " · ignored: " + data.ignored_files.join(", ") : "") + " · run log saved to " + data.log_file;
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
      const n = r.shown.length, s = state[r.id];
      const badge = s && s.booked ? '<span class="n done">✓</span>' : `<span class="n${n ? "" : " z"}">${n || "–"}</span>`;
      h += `<button class="item${i === sel ? " on" : ""}" data-i="${i}"><span class="t">${esc(tm)}</span><span class="th">${esc(r.therapist.split(" ")[0])} · ${r.length} min</span>${badge}</button>`;
    });
    $("#list").innerHTML = h;
  }

  function renderPanel() {
    const r = data.results[sel], f = r.funnel, s = st(r.id);
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

  document.addEventListener("DOMContentLoaded", () => {
    $("#today").addEventListener("change", load);
    $("#refresh").addEventListener("click", load);
    $("#list").addEventListener("click", (e) => { const b = e.target.closest(".item"); if (!b) return; sel = +b.dataset.i; renderList(); renderPanel(); });
    document.querySelectorAll("[data-order]").forEach((b) => b.addEventListener("click", () => {
      order = b.dataset.order; document.querySelectorAll("[data-order]").forEach((x) => x.classList.toggle("on", x === b)); if (data) renderPanel();
    }));
    $("#panel").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const s = st(data.results[sel].id);
      if (b.dataset.a === "no") s.skipped.add(b.dataset.n);
      if (b.dataset.a === "booked") s.booked = b.dataset.n;
      if (b.dataset.a === "undo") { s.booked = null; s.skipped.clear(); }
      renderList(); renderPanel();
    });
    load();
  });
})();

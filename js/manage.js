/* ═══════════════════════════════════════════
   HOTEL AGAVA — guest booking self-management
   Dead-simple: two big buttons, one action at a time.
   Opened via manage.html?t=<manage_token>
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  var CFG = window.AGAVA_CONFIG || {};
  var statusEl = document.getElementById("mgStatus");
  var card = document.getElementById("mgCard");

  var KA_MONTHS = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];
  var STATUS_KA = { pending: "მოლოდინში", confirmed: "დადასტურებული", cancelled: "გაუქმებული", completed: "დასრულებული" };

  function fmt(iso) { var p = String(iso).split("-"); return parseInt(p[2], 10) + " " + KA_MONTHS[parseInt(p[1], 10) - 1]; }
  function todayISO() { return new Date().toLocaleDateString("sv-SE"); }
  function nights(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var token = (location.search.match(/[?&]t=([0-9a-fA-F-]{36})/) || [])[1];

  if (!CFG.CONFIGURED || !window.supabase) { statusEl.textContent = "სისტემა დროებით მიუწვდომელია."; return; }
  if (!token) { statusEl.textContent = "ბმული არასწორია — ჯავშნის მართვა ვერ მოხერხდა."; return; }

  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  var current = null;

  var el = {
    room: document.getElementById("mgRoom"),
    num: document.getElementById("mgNumber"),
    dates: document.getElementById("mgDates"),
    meta: document.getElementById("mgMeta"),
    statusLine: document.getElementById("mgStatusLine"),
    menu: document.getElementById("mgMenu"),
    datesPanel: document.getElementById("mgDatesPanel"),
    cancelPanel: document.getElementById("mgCancelPanel"),
    mgIn: document.getElementById("mgIn"),
    mgOut: document.getElementById("mgOut")
  };

  function showMenu() {
    el.menu.hidden = false;
    el.datesPanel.hidden = true;
    el.cancelPanel.hidden = true;
    document.getElementById("mgResStatus").textContent = "";
    document.getElementById("mgCancelStatus").textContent = "";
  }
  function showPanel(which) {
    el.menu.hidden = true;
    el.datesPanel.hidden = which !== "dates";
    el.cancelPanel.hidden = which !== "cancel";
  }

  function render(b) {
    current = b;
    el.room.textContent = b.room_name;
    el.num.textContent = "ჯავშანი " + b.booking_number;
    el.dates.textContent = fmt(b.check_in) + "  →  " + fmt(b.check_out);
    el.meta.textContent = nights(b.check_in, b.check_out) + " ღამე · " + b.guests + " სტუმარი" + (b.breakfast ? " · 🍳 საუზმით" : "");
    el.statusLine.innerHTML = '<span class="mg-badge mg-badge--' + b.status + '">' + (STATUS_KA[b.status] || b.status) + "</span>";

    var wa = document.getElementById("mgWa");
    if (wa && CFG.WHATSAPP) {
      wa.href = "https://wa.me/" + CFG.WHATSAPP + "?text=" +
        encodeURIComponent("გამარჯობა! ჩემი ჯავშანია " + b.booking_number + ". მჭირდება დახმარება.");
    }

    var locked = b.status === "cancelled" || b.status === "completed";
    if (locked) {
      el.menu.hidden = false;
      el.menu.innerHTML = '<p style="text-align:center;color:var(--muted);font-size:14px;line-height:1.5">' +
        (b.status === "cancelled" ? "ეს ჯავშანი გაუქმებულია." : "ეს ჯავშანი დასრულებულია.") +
        "<br>ცვლილება ან გაუქმება ვეღარ ხდება.</p>";
      el.datesPanel.hidden = true;
      el.cancelPanel.hidden = true;
    } else {
      el.mgIn.min = todayISO(); el.mgOut.min = todayISO();
      el.mgIn.value = b.check_in; el.mgOut.value = b.check_out;
      showMenu();
    }

    statusEl.hidden = true;
    card.hidden = false;
  }

  function load() {
    sb.rpc("booking_by_token", { p_token: token }).then(function (res) {
      if (res.error || !res.data) { statusEl.textContent = "ჯავშანი ვერ მოიძებნა. შესაძლოა ბმული არასწორია."; return; }
      render(res.data);
    });
  }

  /* ─── navigation ─── */
  document.getElementById("mgBtnDates").addEventListener("click", function () { showPanel("dates"); });
  document.getElementById("mgBtnCancel").addEventListener("click", function () { showPanel("cancel"); });
  document.getElementById("mgBackA").addEventListener("click", showMenu);
  document.getElementById("mgBackB").addEventListener("click", showMenu);

  /* ─── save new dates ─── */
  document.getElementById("mgSaveDates").addEventListener("click", function () {
    var st = document.getElementById("mgResStatus");
    var ci = el.mgIn.value, co = el.mgOut.value;
    if (!ci || !co) { st.textContent = "აირჩიეთ ორივე თარიღი."; st.className = "form-status is-error"; return; }
    if (co <= ci) { st.textContent = "გასვლა შესვლაზე გვიან უნდა იყოს."; st.className = "form-status is-error"; return; }
    if (ci < todayISO()) { st.textContent = "წარსული თარიღი ვერ აირჩევა."; st.className = "form-status is-error"; return; }
    if (nights(ci, co) > 30) { st.textContent = "მაქსიმუმ 30 ღამე."; st.className = "form-status is-error"; return; }

    var btn = document.getElementById("mgSaveDates");
    btn.disabled = true; st.textContent = "ინახება…"; st.className = "form-status";
    sb.rpc("reschedule_booking_by_token", { p_token: token, p_in: ci, p_out: co }).then(function (res) {
      btn.disabled = false;
      if (res.error) {
        st.textContent = /no availability/.test(res.error.message)
          ? "ამ თარიღებზე ოთახი დაკავებულია — სცადეთ სხვა."
          : "ვერ მოხერხდა — სცადეთ თავიდან.";
        st.className = "form-status is-error";
        return;
      }
      st.textContent = "მზადაა! ✓ თარიღები შეიცვალა.";
      st.className = "form-status is-ok";
      setTimeout(load, 900);
    });
  });

  /* ─── cancel ─── */
  document.getElementById("mgDoCancel").addEventListener("click", function () {
    var st = document.getElementById("mgCancelStatus");
    var btn = document.getElementById("mgDoCancel");
    btn.disabled = true; st.textContent = "უქმდება…"; st.className = "form-status";
    sb.rpc("cancel_booking_by_token", { p_token: token }).then(function (res) {
      btn.disabled = false;
      if (res.error) { st.textContent = "ვერ მოხერხდა — მოგვწერეთ WhatsApp-ზე."; st.className = "form-status is-error"; return; }
      st.textContent = "ჯავშანი გაუქმდა.";
      st.className = "form-status is-ok";
      setTimeout(load, 900);
    });
  });

  load();
})();

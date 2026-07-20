/* ═══════════════════════════════════════════
   HOTEL AGAVA — guest booking self-management
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

  if (!CFG.CONFIGURED || !window.supabase) {
    statusEl.textContent = "სისტემა დროებით მიუწვდომელია.";
    return;
  }
  if (!token) {
    statusEl.textContent = "ბმული არასწორია — ჯავშნის მართვა ვერ მოხერხდა.";
    return;
  }

  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  var current = null;

  function render(b) {
    current = b;
    document.getElementById("mgRoom").textContent = b.room_name;
    document.getElementById("mgNumber").textContent = "ჯავშანი " + b.booking_number;

    document.getElementById("mgRows").innerHTML =
      row("სტუმარი", esc(b.guest_name)) +
      row("თარიღები", fmt(b.check_in) + " → " + fmt(b.check_out) + " · " + nights(b.check_in, b.check_out) + " ღამე") +
      row("სტუმრები", b.guests + (b.breakfast ? " · 🍳 საუზმით" : "")) +
      row("სტატუსი", '<span class="mg-badge mg-badge--' + b.status + '">' + (STATUS_KA[b.status] || b.status) + "</span>") +
      '<div class="mg-row mg-total"><span>ჯამური ღირებულება</span><b>' + (b.total_price != null ? Number(b.total_price) + " ₾" : "—") + "</b></div>";

    var locked = b.status === "cancelled" || b.status === "completed";
    document.getElementById("mgReschedule").style.display = locked ? "none" : "";
    document.getElementById("mgCancelSec").style.display = locked ? "none" : "";

    var mgIn = document.getElementById("mgIn"), mgOut = document.getElementById("mgOut");
    mgIn.min = todayISO(); mgOut.min = todayISO();
    mgIn.value = b.check_in; mgOut.value = b.check_out;

    statusEl.hidden = true;
    card.hidden = false;
  }
  function row(label, val) {
    return '<div class="mg-row"><span>' + label + "</span><b>" + val + "</b></div>";
  }

  function load() {
    sb.rpc("booking_by_token", { p_token: token }).then(function (res) {
      if (res.error || !res.data) {
        statusEl.textContent = "ჯავშანი ვერ მოიძებნა. შესაძლოა ბმული არასწორია.";
        return;
      }
      render(res.data);
    });
  }

  document.getElementById("mgSaveDates").addEventListener("click", function () {
    var st = document.getElementById("mgResStatus");
    var ci = document.getElementById("mgIn").value, co = document.getElementById("mgOut").value;
    if (!ci || !co) { st.textContent = "აირჩიეთ ორივე თარიღი."; st.className = "form-status is-error"; return; }
    if (co <= ci) { st.textContent = "გასვლის თარიღი შესვლაზე გვიან უნდა იყოს."; st.className = "form-status is-error"; return; }
    if (ci < todayISO()) { st.textContent = "წარსული თარიღი ვერ აირჩევა."; st.className = "form-status is-error"; return; }
    if (nights(ci, co) > 30) { st.textContent = "მაქსიმუმ 30 ღამე."; st.className = "form-status is-error"; return; }

    var btn = document.getElementById("mgSaveDates");
    btn.disabled = true; st.textContent = "ინახება…"; st.className = "form-status";
    sb.rpc("reschedule_booking_by_token", { p_token: token, p_in: ci, p_out: co }).then(function (res) {
      btn.disabled = false;
      if (res.error) {
        st.textContent = /no availability/.test(res.error.message)
          ? "ამ თარიღებზე ოთახი დაკავებულია — სცადეთ სხვა თარიღები."
          : "ცვლილება ვერ მოხერხდა — სცადეთ თავიდან.";
        st.className = "form-status is-error";
        return;
      }
      st.textContent = "თარიღები განახლდა ✓ ჯავშანი მოლოდინშია — დაგიდასტურებთ.";
      st.className = "form-status is-ok";
      load();
    });
  });

  document.getElementById("mgCancel").addEventListener("click", function () {
    if (!confirm("ნამდვილად გააუქმებთ ჯავშანს?")) return;
    var st = document.getElementById("mgCancelStatus");
    var btn = document.getElementById("mgCancel");
    btn.disabled = true; st.textContent = "უქმდება…"; st.className = "form-status";
    sb.rpc("cancel_booking_by_token", { p_token: token }).then(function (res) {
      btn.disabled = false;
      if (res.error) {
        st.textContent = "გაუქმება ვერ მოხერხდა — დაგვიკავშირდით WhatsApp-ზე.";
        st.className = "form-status is-error";
        return;
      }
      st.textContent = "ჯავშანი გაუქმდა.";
      st.className = "form-status is-ok";
      load();
    });
  });

  load();
})();

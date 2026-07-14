/* ═══════════════════════════════════════════
   HOTEL AGAVA — admin panel logic (Supabase)
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  var CFG = window.AGAVA_CONFIG || {};
  var loginView = document.getElementById("loginView");
  var appView = document.getElementById("appView");

  if (!CFG.CONFIGURED || !window.supabase) {
    loginView.hidden = false;
    document.getElementById("loginStatus").textContent =
      "Supabase არ არის კონფიგურირებული — შეავსე .env.local და გაუშვი: python scripts/gen-config.py";
    return;
  }

  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

  var ROOM_TYPES = [];        /* from DB */
  var rtById = {};

  var STATUS_KA = {
    pending: "მოლოდინში",
    confirmed: "დადასტურებული",
    cancelled: "გაუქმებული",
    completed: "დასრულებული"
  };
  var KA_MONTHS = ["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"];
  var KA_DAYS = ["კვ","ორ","სა","ოთ","ხუ","პა","შა"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function todayISO() { return new Date().toLocaleDateString("sv-SE"); }
  function iso(d) { return d.toLocaleDateString("sv-SE"); }
  function fmtKa(isoStr) {
    var p = isoStr.split("-");
    return parseInt(p[2], 10) + " " + KA_MONTHS[parseInt(p[1], 10) - 1].slice(0, 3);
  }
  function nights(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
  function statusBadge(st) { return '<span class="badge badge--' + st + '">' + STATUS_KA[st] + "</span>"; }

  /* date inputs: one click opens calendar */
  document.addEventListener("click", function (e) {
    var d = e.target;
    if (d.tagName === "INPUT" && d.type === "date" && typeof d.showPicker === "function") {
      try { d.showPicker(); } catch (err) { /* gesture required / unsupported */ }
    }
  });

  /* ═══ AUTH ═══ */
  sb.auth.getSession().then(function (res) {
    if (res.data.session) enterApp(); else loginView.hidden = false;
  });

  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var st = document.getElementById("loginStatus");
    st.textContent = "მოწმდება…";
    sb.auth.signInWithPassword({
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPass").value
    }).then(function (res) {
      if (res.error) { st.textContent = "არასწორი ელფოსტა ან პაროლი."; return; }
      st.textContent = "";
      enterApp();
    });
  });

  document.getElementById("logoutBtn").addEventListener("click", function () {
    sb.auth.signOut().then(function () { location.reload(); });
  });

  function enterApp() {
    loginView.hidden = true;
    appView.hidden = false;
    loadRoomTypes().then(function () {
      loadDashboard();
      loadBookings();
      renderCalendar();
      renderRoomsAdmin();
      startRealtimeBookings();
    });
  }

  function startRealtimeBookings() {
    sb.channel("realtime_bookings")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "bookings"
      }, function () {
        refreshAll();
      })
      .subscribe();
  }

  /* ═══ NAV ═══ */
  document.querySelectorAll(".side__link").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".side__link").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      document.querySelectorAll(".pane").forEach(function (p) { p.hidden = true; });
      document.getElementById("pane-" + btn.getAttribute("data-pane")).hidden = false;
    });
  });

  /* ═══ DATA ═══ */
  function loadRoomTypes() {
    return sb.from("room_types").select("*").order("sort").then(function (res) {
      ROOM_TYPES = res.data || [];
      rtById = {};
      var fltRoom = document.getElementById("fltRoom");
      var ebRoom = document.getElementById("ebRoom");
      fltRoom.length = 1; ebRoom.length = 0;
      ROOM_TYPES.forEach(function (rt) {
        rtById[rt.id] = rt;
        fltRoom.add(new Option(rt.name, rt.id));
        ebRoom.add(new Option(rt.name, rt.id));
      });
    });
  }

  /* ═══ DASHBOARD ═══ */
  function loadDashboard() {
    var t = todayISO();
    var monthStart = t.slice(0, 8) + "01";
    Promise.all([
      sb.from("bookings").select("*, room_types(name)").eq("status", "confirmed").eq("check_in", t),
      sb.from("bookings").select("*, room_types(name)").eq("status", "confirmed").eq("check_out", t),
      sb.from("bookings").select("*, room_types(name)").eq("status", "pending").order("created_at", { ascending: false }),
      sb.from("bookings").select("room_type_id").in("status", ["confirmed", "pending"]).lte("check_in", t).gt("check_out", t),
      sb.from("bookings").select("total_price").in("status", ["confirmed", "completed"]).gte("check_in", monthStart)
    ]).then(function (r) {
      var ins = r[0].data || [], outs = r[1].data || [], pend = r[2].data || [];
      var occ = r[3].data || [], rev = r[4].data || [];
      var totalRooms = ROOM_TYPES.reduce(function (s, rt) { return s + rt.total_rooms; }, 0);
      var occRate = totalRooms ? Math.round(occ.length / totalRooms * 100) : 0;
      var revenue = rev.reduce(function (s, b) { return s + Number(b.total_price || 0); }, 0);

      document.getElementById("statCards").innerHTML =
        card(ins.length, "დღეს შესვლა") +
        card(outs.length, "დღეს გასვლა") +
        card(pend.length, "მოლოდინში") +
        card(occRate + "%", "დღეს დატვირთვა") +
        card(revenue + " ₾", "თვის შემოსავალი");

      var badge = document.getElementById("pendingBadge");
      badge.hidden = !pend.length;
      badge.textContent = pend.length;

      renderBookingRows(document.getElementById("pendingTable"), pend, true);
    });
    function card(num, label) {
      return '<div class="stat-card"><div class="stat-card__num">' + num + '</div><div class="stat-card__label">' + label + "</div></div>";
    }
  }

  /* ═══ BOOKINGS LIST ═══ */
  var allBookings = [];

  function loadBookings() {
    sb.from("bookings").select("*, room_types(name)")
      .order("created_at", { ascending: false }).limit(500)
      .then(function (res) {
        allBookings = res.data || [];
        applyFilters();
      });
  }

  function applyFilters() {
    var st = document.getElementById("fltStatus").value;
    var rm = document.getElementById("fltRoom").value;
    var dt = document.getElementById("fltDate").value;
    var q = document.getElementById("fltSearch").value.trim().toLowerCase();
    var rows = allBookings.filter(function (b) {
      if (st && b.status !== st) return false;
      if (rm && String(b.room_type_id) !== rm) return false;
      if (dt && !(b.check_in <= dt && b.check_out > dt)) return false;
      if (q && (b.guest_name + " " + b.guest_phone).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    renderBookingRows(document.getElementById("bookingsTable"), rows, false);
  }
  ["fltStatus", "fltRoom", "fltDate"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", applyFilters);
  });
  document.getElementById("fltSearch").addEventListener("input", applyFilters);

  function renderBookingRows(table, rows, compact) {
    var head = "<tr><th>N°</th><th>სტუმარი</th><th>ოთახი</th><th>თარიღები</th><th>თანხა</th><th>სტატუსი</th><th></th></tr>";
    if (!rows.length) {
      table.innerHTML = head + '<tr><td colspan="7" class="empty">ჯავშნები არ არის</td></tr>';
      return;
    }
    table.innerHTML = head + rows.map(function (b) {
      var acts = '<div class="row-actions">';
      if (b.status === "pending") {
        acts += '<button class="abtn abtn--sm abtn--ok" data-act="confirmed" data-id="' + b.id + '">დადასტურება</button>';
      }
      if (b.status === "confirmed") {
        acts += '<button class="abtn abtn--sm" data-act="completed" data-id="' + b.id + '">დასრულება</button>';
      }
      if (b.status === "pending" || b.status === "confirmed") {
        acts += '<button class="abtn abtn--sm abtn--danger" data-act="cancelled" data-id="' + b.id + '">გაუქმება</button>';
      }
      acts += '<button class="abtn abtn--sm" data-edit="' + b.id + '">✎</button></div>';
      return "<tr>" +
        "<td><strong>" + esc(b.booking_number) + "</strong><div class='muted'>" + (b.source || "") + "</div></td>" +
        "<td>" + esc(b.guest_name) + "<div class='muted'>" + esc(b.guest_phone) + "</div></td>" +
        "<td>" + esc(b.room_types ? b.room_types.name : "") + "<div class='muted'>" + b.guests + " სტუმარი</div></td>" +
        "<td>" + fmtKa(b.check_in) + " → " + fmtKa(b.check_out) + "<div class='muted'>" + nights(b.check_in, b.check_out) + " ღამე</div></td>" +
        "<td><strong>" + (b.total_price != null ? Number(b.total_price) + " ₾" : "—") + "</strong></td>" +
        "<td>" + statusBadge(b.status) + "</td>" +
        "<td>" + acts + "</td>" +
      "</tr>";
    }).join("");
  }

  /* status change + edit — delegation on both tables */
  document.addEventListener("click", function (e) {
    var actBtn = e.target.closest("[data-act]");
    if (actBtn) {
      var newStatus = actBtn.getAttribute("data-act");
      if (newStatus === "cancelled" && !confirm("ნამდვილად გავაუქმო ეს ჯავშანი?")) return;
      sb.from("bookings").update({ status: newStatus }).eq("id", actBtn.getAttribute("data-id"))
        .then(function (res) {
          if (res.error) { alert("შეცდომა: " + res.error.message); return; }
          refreshAll();
        });
      return;
    }
    var editBtn = e.target.closest("[data-edit]");
    if (editBtn) {
      var b = allBookings.find(function (x) { return x.id === editBtn.getAttribute("data-edit"); });
      if (b) openEdit(b);
    }
  });

  function refreshAll() {
    loadDashboard();
    loadBookings();
    renderCalendar();
  }

  /* ═══ EDIT / ADD MODAL ═══ */
  var editModal = document.getElementById("editModal");

  function openEdit(b) {
    document.getElementById("editTitle").textContent = b ? "ჯავშნის რედაქტირება" : "ახალი ჯავშანი";
    document.getElementById("ebId").value = b ? b.id : "";
    document.getElementById("ebName").value = b ? b.guest_name : "";
    document.getElementById("ebPhone").value = b ? b.guest_phone : "";
    document.getElementById("ebRoom").value = b ? b.room_type_id : (ROOM_TYPES[0] ? ROOM_TYPES[0].id : "");
    document.getElementById("ebGuests").value = b ? b.guests : 2;
    document.getElementById("ebIn").value = b ? b.check_in : todayISO();
    document.getElementById("ebOut").value = b ? b.check_out : "";
    document.getElementById("ebStatus").value = b ? b.status : "confirmed";
    document.getElementById("ebPrice").value = b && b.total_price != null ? Number(b.total_price) : "";
    document.getElementById("ebComment").value = b ? (b.comment || "") : "";
    document.getElementById("editStatus").textContent = "";
    editModal.hidden = false;
  }
  document.getElementById("addBookingBtn").addEventListener("click", function () { openEdit(null); });
  editModal.addEventListener("click", function (e) {
    if (e.target.closest("[data-close-edit]")) editModal.hidden = true;
  });

  document.getElementById("editForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var st = document.getElementById("editStatus");
    var id = document.getElementById("ebId").value;
    var ci = document.getElementById("ebIn").value;
    var co = document.getElementById("ebOut").value;
    if (!ci || !co || co <= ci) { st.textContent = "შეამოწმე თარიღები."; st.className = "amodal__status is-error"; return; }

    var payload = {
      guest_name: document.getElementById("ebName").value.trim(),
      guest_phone: document.getElementById("ebPhone").value.trim(),
      room_type_id: parseInt(document.getElementById("ebRoom").value, 10),
      guests: parseInt(document.getElementById("ebGuests").value, 10) || 2,
      check_in: ci,
      check_out: co,
      status: document.getElementById("ebStatus").value,
      comment: document.getElementById("ebComment").value.trim() || null
    };
    var priceVal = document.getElementById("ebPrice").value;
    payload.total_price = priceVal === "" ? null : Number(priceVal);

    st.textContent = "ინახება…";
    st.className = "amodal__status";

    var q = id
      ? sb.from("bookings").update(payload).eq("id", id)
      : sb.from("bookings").insert(Object.assign({ booking_number: "", source: "admin" }, payload));

    q.then(function (res) {
      if (res.error) { st.textContent = "შეცდომა: " + res.error.message; st.className = "amodal__status is-error"; return; }
      st.textContent = "შენახულია ✓";
      st.className = "amodal__status is-ok";
      setTimeout(function () { editModal.hidden = true; }, 500);
      refreshAll();
    });
  });

  /* ═══ CALENDAR ═══ */
  var calCursor = new Date();
  calCursor.setDate(1);

  document.getElementById("calPrev").addEventListener("click", function () { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar(); });
  document.getElementById("calNext").addEventListener("click", function () { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar(); });

  function renderCalendar() {
    var y = calCursor.getFullYear(), m = calCursor.getMonth();
    var daysIn = new Date(y, m + 1, 0).getDate();
    var mStart = iso(new Date(y, m, 1));
    var mEnd = iso(new Date(y, m + 1, 1));
    document.getElementById("calLabel").textContent = KA_MONTHS[m] + " " + y;
    document.getElementById("calDetail").hidden = true;

    Promise.all([
      sb.from("bookings").select("*").in("status", ["pending", "confirmed"]).lt("check_in", mEnd).gt("check_out", mStart),
      sb.from("blocked_dates").select("*").gte("date", mStart).lt("date", mEnd),
      sb.from("price_overrides").select("*").gte("date", mStart).lt("date", mEnd)
    ]).then(function (r) {
      var bks = r[0].data || [], blocks = r[1].data || [], prices = r[2].data || [];
      var t = todayISO();

      var head = "<tr><th></th>";
      for (var d = 1; d <= daysIn; d++) {
        var dayIso = iso(new Date(y, m, d));
        head += '<th class="' + (dayIso === t ? "today" : "") + '">' + d + "<br>" + KA_DAYS[new Date(y, m, d).getDay()] + "</th>";
      }
      head += "</tr>";

      var body = ROOM_TYPES.map(function (rt) {
        var row = '<td class="room-name" title="' + esc(rt.name) + '">' + esc(rt.name) + "</td>";
        for (var d = 1; d <= daysIn; d++) {
          var dayIso = iso(new Date(y, m, d));
          var booked = bks.filter(function (b) {
            return b.room_type_id === rt.id && b.check_in <= dayIso && b.check_out > dayIso;
          }).length;
          var block = blocks.find(function (bl) { return bl.room_type_id === rt.id && bl.date === dayIso; });
          var po = prices.find(function (p) { return p.room_type_id === rt.id && p.date === dayIso; });
          var free = rt.total_rooms - booked - (block ? block.rooms_blocked : 0);

          var cls, txt;
          if (dayIso < t) { cls = "c-past"; txt = booked || ""; }
          else if (block && free <= 0 && !booked) { cls = "c-block"; txt = "✕"; }
          else if (free <= 0) { cls = "c-full"; txt = booked; }
          else if (booked > 0 || block) { cls = "c-part"; txt = free; }
          else { cls = "c-free"; txt = free; }

          row += '<td class="day ' + cls + (po ? " has-price" : "") + (dayIso === t ? " today" : "") +
            '" data-day="' + dayIso + '" data-rt="' + rt.id + '" title="' + esc(rt.name) + " · " + dayIso + '">' + txt + "</td>";
        }
        return "<tr>" + row + "</tr>";
      }).join("");

      document.getElementById("calTable").innerHTML = head + body;
      window._calData = { bks: bks, blocks: blocks, prices: prices };
    });
  }

  document.getElementById("calTable").addEventListener("click", function (e) {
    var cell = e.target.closest("td.day");
    if (!cell || cell.classList.contains("c-past")) return;
    showDayDetail(cell.getAttribute("data-day"), parseInt(cell.getAttribute("data-rt"), 10));
  });

  function showDayDetail(dayIso, rtId) {
    var rt = rtById[rtId];
    var data = window._calData || { bks: [], blocks: [], prices: [] };
    var dayBookings = data.bks.filter(function (b) {
      return b.room_type_id === rtId && b.check_in <= dayIso && b.check_out > dayIso;
    });
    var block = data.blocks.find(function (bl) { return bl.room_type_id === rtId && bl.date === dayIso; });
    var po = data.prices.find(function (p) { return p.room_type_id === rtId && p.date === dayIso; });

    var el = document.getElementById("calDetail");
    el.hidden = false;
    el.innerHTML =
      "<h4>" + esc(rt.name) + " — " + fmtKa(dayIso) + "</h4>" +
      (dayBookings.length
        ? "<ul>" + dayBookings.map(function (b) {
            return "<li><strong>" + esc(b.booking_number) + "</strong> · " + esc(b.guest_name) + " · " +
              esc(b.guest_phone) + " · " + fmtKa(b.check_in) + "→" + fmtKa(b.check_out) + " " + statusBadge(b.status) + "</li>";
          }).join("") + "</ul>"
        : '<p class="muted" style="font-size:13px">ამ დღეს ჯავშანი არ არის.</p>') +
      '<div class="cal-detail__actions">' +
        '<button class="abtn abtn--sm" id="cdBlock">' + (block ? "ბლოკის მოხსნა" : "დღის დაბლოკვა") + "</button>" +
        '<input type="number" id="cdPrice" min="0" placeholder="ფასი ₾" value="' + (po ? Number(po.price) : "") + '">' +
        '<button class="abtn abtn--sm" id="cdSetPrice">ფასის შენახვა</button>' +
        (po ? '<button class="abtn abtn--sm abtn--danger" id="cdDelPrice">სპეც. ფასის წაშლა</button>' : "") +
        '<span class="muted" style="font-size:12px">საბაზო: ' + Number(rt.base_price) + " ₾</span>" +
      "</div>";

    document.getElementById("cdBlock").onclick = function () {
      var q = block
        ? sb.from("blocked_dates").delete().eq("id", block.id)
        : sb.from("blocked_dates").insert({ room_type_id: rtId, date: dayIso, rooms_blocked: rt.total_rooms, reason: "admin" });
      q.then(function (res) {
        if (res.error) alert("შეცდომა: " + res.error.message);
        renderCalendar();
      });
    };
    document.getElementById("cdSetPrice").onclick = function () {
      var v = document.getElementById("cdPrice").value;
      if (v === "" || Number(v) < 0) return;
      sb.from("price_overrides").upsert({ room_type_id: rtId, date: dayIso, price: Number(v) }, { onConflict: "room_type_id,date" })
        .then(function (res) {
          if (res.error) alert("შეცდომა: " + res.error.message);
          renderCalendar();
        });
    };
    var del = document.getElementById("cdDelPrice");
    if (del) del.onclick = function () {
      sb.from("price_overrides").delete().eq("id", po.id).then(function () { renderCalendar(); });
    };
  }

  /* ═══ ROOMS ADMIN ═══ */
  function renderRoomsAdmin() {
    document.getElementById("roomsAdmin").innerHTML = ROOM_TYPES.map(function (rt) {
      return '<div class="room-row" data-rt="' + rt.id + '">' +
        '<div class="room-row__name">' + esc(rt.name) + "<small>" + esc(rt.bed_type || "") + " · " + (rt.room_size || "—") + " მ² · მაქს. " + rt.max_guests + " სტუმარი</small></div>" +
        '<div><label>ფასი ₾/ღამე</label><input type="number" min="0" class="rr-price" value="' + Number(rt.base_price) + '"></div>' +
        '<div><label>ოთახების რაოდ.</label><input type="number" min="0" class="rr-total" value="' + rt.total_rooms + '"></div>' +
        '<label class="switch"><input type="checkbox" class="rr-visible"' + (rt.visible ? " checked" : "") + "> საიტზე ჩანს</label>" +
        '<button class="abtn abtn--gold abtn--sm rr-save">შენახვა</button>' +
      "</div>";
    }).join("");
  }

  document.getElementById("roomsAdmin").addEventListener("click", function (e) {
    var btn = e.target.closest(".rr-save");
    if (!btn) return;
    var row = btn.closest(".room-row");
    var id = parseInt(row.getAttribute("data-rt"), 10);
    btn.textContent = "ინახება…";
    sb.from("room_types").update({
      base_price: Number(row.querySelector(".rr-price").value),
      total_rooms: parseInt(row.querySelector(".rr-total").value, 10),
      visible: row.querySelector(".rr-visible").checked
    }).eq("id", id).then(function (res) {
      btn.textContent = res.error ? "შეცდომა" : "შენახულია ✓";
      setTimeout(function () { btn.textContent = "შენახვა"; }, 1400);
      loadRoomTypes().then(renderCalendar);
    });
  });
})();

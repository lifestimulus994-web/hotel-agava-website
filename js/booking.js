/* ═══════════════════════════════════════════
   HOTEL AGAVA — booking wizard, room detail, hero search
   Supabase-backed. Fallback: WhatsApp when not configured.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  var CFG = window.AGAVA_CONFIG || {};
  var sb = null;
  if (CFG.CONFIGURED && window.supabase) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  }

  var ROOMS = window.AGAVA_ROOMS || [];
  var roomBySlug = {};
  ROOMS.forEach(function (r) { roomBySlug[r.slug] = r; });

  /* room_types from DB merged by slug: {id, base_price, max_guests, ...} */
  var DB = { loaded: false, bySlug: {}, byId: {} };

  function loadRoomTypes() {
    if (!sb) return Promise.resolve();
    return sb.from("room_types").select("*").order("sort").then(function (res) {
      if (res.error || !res.data) return;
      DB.loaded = true;
      res.data.forEach(function (rt) {
        DB.bySlug[rt.slug] = rt;
        DB.byId[rt.id] = rt;
        var room = roomBySlug[rt.slug];
        if (room) room.price = Number(rt.base_price);
        /* refresh card price + visibility */
        var tile = document.querySelector('[data-room-slug="' + rt.slug + '"]');
        if (tile) {
          var priceEl = tile.querySelector(".room-tile__price");
          if (priceEl) priceEl.innerHTML = Number(rt.base_price) + " ₾<span>/ღამე</span>";
          tile.style.display = rt.visible ? "" : "none";
        }
      });
      refreshPublicViews();
    });
  }

  function refreshPublicViews() {
    if (document.getElementById("bwRooms") && state && state.checkIn && state.checkOut) {
      renderRooms(state.avail || null);
    }
    if (state && state.chosen) {
      renderSummary("bwSummary");
    }
  }

  loadRoomTypes();
  if (sb) {
    window.setInterval(function () {
      loadRoomTypes();
    }, 5000);
  }

  /* ─── helpers ─── */
  var KA_MONTHS = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];
  function fmtDate(iso) {
    var p = iso.split("-");
    return parseInt(p[2], 10) + " " + KA_MONTHS[parseInt(p[1], 10) - 1];
  }
  function todayISO() {
    return new Date().toLocaleDateString("sv-SE"); /* YYYY-MM-DD local */
  }
  function nightsBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function waLink(text) {
    return "https://wa.me/" + CFG.WHATSAPP + "?text=" + encodeURIComponent(text);
  }

  /* ═══════════ MODAL MANAGEMENT ═══════════ */
  var bookingModal = document.getElementById("bookingModal");
  var roomModal = document.getElementById("roomModal");
  var lastFocused = null;

  function openModal(m) {
    lastFocused = document.activeElement;
    m.hidden = false;
    document.body.classList.add("modal-open");
    var f = m.querySelector("input, select, button:not(.modal__close)");
    if (f) f.focus();
  }
  function closeModal(m) {
    m.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocused) lastFocused.focus();
  }
  [bookingModal, roomModal].forEach(function (m) {
    m.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var els = m.querySelectorAll("button, input, select, textarea, a[href]");
      var vis = Array.prototype.filter.call(els, function (el) { return el.offsetParent !== null; });
      if (!vis.length) return;
      var first = vis[0], last = vis[vis.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!bookingModal.hidden) closeModal(bookingModal);
    else if (!roomModal.hidden) closeModal(roomModal);
  });

  /* ═══════════ BOOKING WIZARD ═══════════ */
  var panes = {
    1: document.getElementById("bwStep1"),
    2: document.getElementById("bwStep2"),
    3: document.getElementById("bwStep3"),
    success: document.getElementById("bwSuccess")
  };
  var stepsBar = document.getElementById("wizardSteps");
  var state = { checkIn: null, checkOut: null, guests: 2, avail: null, chosen: null, preferSlug: null };

  var bwIn = document.getElementById("bwIn");
  var bwOut = document.getElementById("bwOut");
  var bwGuests = document.getElementById("bwGuests");
  bwIn.min = todayISO();
  bwOut.min = todayISO();

  function showPane(key) {
    Object.keys(panes).forEach(function (k) { panes[k].hidden = (k !== String(key)); });
    var idx = key === "success" ? 3 : key - 1;
    stepsBar.style.display = key === "success" ? "none" : "";
    Array.prototype.forEach.call(stepsBar.children, function (li, i) {
      li.classList.toggle("is-active", i === idx);
      li.classList.toggle("is-done", i < idx);
    });
  }

  function openWizard(preferSlug) {
    state.preferSlug = preferSlug || null;
    showPane(1);
    document.getElementById("bwStatus1").textContent = "";
    openModal(bookingModal);
  }

  /* Step 1 → availability */
  document.getElementById("bwDatesForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var status = document.getElementById("bwStatus1");
    var ci = bwIn.value, co = bwOut.value;
    if (!ci || !co) { status.textContent = "აირჩიეთ ორივე თარიღი."; status.className = "form-status is-error"; return; }
    if (co <= ci) { status.textContent = "გასვლის თარიღი შესვლაზე გვიან უნდა იყოს."; status.className = "form-status is-error"; return; }
    if (ci < todayISO()) { status.textContent = "წარსული თარიღი ვერ აირჩევა."; status.className = "form-status is-error"; return; }
    if (nightsBetween(ci, co) > 30) { status.textContent = "მაქსიმუმ 30 ღამე."; status.className = "form-status is-error"; return; }

    state.checkIn = ci; state.checkOut = co;
    state.guests = parseInt(bwGuests.value, 10);

    if (!sb) { renderRooms(null); showPane(2); return; } /* demo mode */

    status.textContent = "მოწმდება ხელმისაწვდომობა…";
    status.className = "form-status";
    sb.rpc("check_availability", { p_in: ci, p_out: co }).then(function (res) {
      if (res.error) {
        status.textContent = "შეცდომა — სცადეთ თავიდან ან მოგვწერეთ WhatsApp-ზე.";
        status.className = "form-status is-error";
        return;
      }
      status.textContent = "";
      state.avail = {};
      (res.data || []).forEach(function (row) { state.avail[row.slug] = row; });
      renderRooms(state.avail);
      showPane(2);
    });
  });

  /* Step 2 render */
  function renderRooms(avail) {
    var nights = nightsBetween(state.checkIn, state.checkOut);
    document.getElementById("bwRangeLabel").innerHTML =
      fmtDate(state.checkIn) + " — " + fmtDate(state.checkOut) +
      " · " + nights + " ღამე · " + state.guests + " სტუმარი";

    var wrap = document.getElementById("bwRooms");
    wrap.innerHTML = "";
    var shown = 0;

    ROOMS.forEach(function (room) {
      var dbrt = DB.bySlug[room.slug];
      var maxGuests = dbrt ? dbrt.max_guests : parseInt((room.specs[1] || {}).text, 10) || 2;
      if (maxGuests < state.guests) return;
      if (dbrt && !dbrt.visible) return;

      var a = avail ? avail[room.slug] : null;
      var free = a ? a.available : null;
      var total = a ? Number(a.total_price) : room.price * nights;
      var soldOut = avail && (!a || free < 1);

      var el = document.createElement("div");
      el.className = "bw-room" + (soldOut ? " is-soldout" : "") +
        (state.preferSlug === room.slug && !soldOut ? " is-preferred" : "");
      el.innerHTML =
        '<img src="' + room.images[0] + '" alt="" loading="lazy">' +
        '<div class="bw-room__info">' +
          "<h4>" + esc(room.name) + "</h4>" +
          '<p class="bw-room__meta">' + Math.round(total / nights) + " ₾/ღამე · " + nights + " ღამე" +
            (free !== null && free > 0 && free <= 2 ? ' · <span class="bw-room__left">დარჩა ' + free + '</span>' : "") +
          "</p>" +
          '<p class="bw-room__total">' + (soldOut ? "ამ თარიღებზე დაკავებულია" : "ჯამში: <strong>" + total + " ₾</strong>") + "</p>" +
        "</div>" +
        (soldOut ? "" : '<button type="button" class="btn btn--gold bw-room__pick" data-pick="' + room.slug + '">არჩევა</button>');
      wrap.appendChild(el);
      shown++;
    });

    if (!shown) {
      wrap.innerHTML = '<p class="bw-empty">ამ პარამეტრებით ოთახი ვერ მოიძებნა — სცადეთ სხვა თარიღები ან მოგვწერეთ WhatsApp-ზე.</p>';
    }
    if (avail === null) {
      var note = document.createElement("p");
      note.className = "bw-demo-note";
      note.textContent = "ხელმისაწვდომობა დადასტურდება ოპერატორის მიერ.";
      wrap.appendChild(note);
    }
  }

  document.getElementById("bwRooms").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-pick]");
    if (!btn) return;
    var slug = btn.getAttribute("data-pick");
    var room = roomBySlug[slug];
    var a = state.avail ? state.avail[slug] : null;
    var nights = nightsBetween(state.checkIn, state.checkOut);
    state.chosen = {
      slug: slug,
      roomTypeId: a ? a.room_type_id : (DB.bySlug[slug] ? DB.bySlug[slug].id : null),
      name: room.name,
      nights: nights,
      total: a ? Number(a.total_price) : room.price * nights
    };
    renderSummary("bwSummary");
    document.getElementById("bwStatus3").textContent = "";
    showPane(3);
  });

  function renderSummary(elId) {
    var c = state.chosen;
    document.getElementById(elId).innerHTML =
      '<div class="bw-summary__room">' + esc(c.name) + "</div>" +
      '<div class="bw-summary__row"><span>' + fmtDate(state.checkIn) + " — " + fmtDate(state.checkOut) +
      "</span><span>" + c.nights + " ღამე · " + state.guests + " სტუმარი</span></div>" +
      '<div class="bw-summary__row bw-summary__total"><span>ჯამური ღირებულება</span><span>' + c.total + " ₾</span></div>" +
      '<div class="bw-summary__note">გადახდა — ადგილზე, სასტუმროში. უფასო გაუქმება ჩამოსვლამდე 24 სთ-ით ადრე.</div>';
  }

  /* back buttons */
  document.addEventListener("click", function (e) {
    var back = e.target.closest("[data-bw-back]");
    if (back) showPane(parseInt(back.getAttribute("data-bw-back"), 10));
  });

  /* Step 3 → create booking */
  document.getElementById("bwGuestForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var status = document.getElementById("bwStatus3");
    var name = document.getElementById("bwName").value.trim();
    var surname = document.getElementById("bwSurname").value.trim();
    var phone = document.getElementById("bwPhone").value.trim();
    var email = document.getElementById("bwEmail").value.trim();
    var comment = document.getElementById("bwComment").value.trim();

    if (name.length < 2 || surname.length < 2) { status.textContent = "შეავსეთ სახელი და გვარი."; status.className = "form-status is-error"; return; }
    if (phone.replace(/\D/g, "").length < 9) { status.textContent = "შეიყვანეთ სწორი ტელეფონი."; status.className = "form-status is-error"; return; }

    var fullName = name + " " + surname;
    var waText = "გამარჯობა! მინდა დაჯავშნა:\n" +
      "🏨 " + state.chosen.name + "\n" +
      "📅 " + state.checkIn + " → " + state.checkOut + " (" + state.chosen.nights + " ღამე)\n" +
      "👤 " + state.guests + " სტუმარი — " + fullName + "\n" +
      "📞 " + phone + (comment ? "\n💬 " + comment : "");

    if (!sb) {
      /* demo mode: WhatsApp booking */
      window.open(waLink(waText), "_blank", "noopener");
      status.textContent = "ჯავშნის დეტალები გაიგზავნა WhatsApp-ით — დაასრულეთ იქ.";
      status.className = "form-status is-ok";
      return;
    }

    var btn = document.getElementById("bwSubmit");
    btn.disabled = true;
    status.textContent = "იგზავნება…";
    status.className = "form-status";

    sb.rpc("create_booking", {
      p_room_type_id: state.chosen.roomTypeId,
      p_in: state.checkIn,
      p_out: state.checkOut,
      p_guests: state.guests,
      p_name: fullName,
      p_phone: phone,
      p_email: email || null,
      p_comment: comment || null
    }).then(function (res) {
      btn.disabled = false;
      if (res.error) {
        var msg = /no availability/.test(res.error.message)
          ? "სამწუხაროდ, ეს ოთახი ახლახან დაიკავეს — სცადეთ სხვა თარიღები."
          : "შეცდომა — სცადეთ თავიდან ან მოგვწერეთ WhatsApp-ზე.";
        status.textContent = msg;
        status.className = "form-status is-error";
        return;
      }
      var b = res.data;
      document.getElementById("bwNumber").textContent = b.booking_number;
      renderSummary("bwSuccessSummary");
      document.getElementById("bwWhatsApp").href =
        waLink("გამარჯობა! დავჯავშნე ოთახი საიტიდან — ჯავშნის ნომერი: " + b.booking_number +
               " (" + state.chosen.name + ", " + state.checkIn + " → " + state.checkOut + "). გთხოვთ დამიდასტუროთ.");
      showPane("success");
      this && this.reset && this.reset();
      document.getElementById("bwGuestForm").reset();
    });
  });

  /* ═══════════ ROOM DETAIL MODAL ═══════════ */
  function openRoomDetail(slug) {
    var room = roomBySlug[slug];
    if (!room) return;
    var dbrt = DB.bySlug[slug] || {};
    var amen = dbrt.amenities || ["Wi-Fi", "TV", "კონდიციონერი", "აბაზანა"];
    var price = dbrt.base_price ? Number(dbrt.base_price) : room.price;

    var thumbs = room.images.map(function (src, i) {
      return '<button type="button" class="room-detail__thumb' + (i === 0 ? " is-active" : "") +
        '" data-gallery-idx="' + i + '"><img src="' + src + '" alt="" loading="lazy"></button>';
    }).join("");

    document.getElementById("roomDetail").innerHTML =
      '<div class="room-detail__gallery">' +
        '<img class="room-detail__main" id="rdMain" src="' + room.images[0] + '" alt="' + esc(room.alt) + '">' +
        (room.images.length > 1 ? '<div class="room-detail__thumbs">' + thumbs + "</div>" : "") +
      "</div>" +
      '<div class="room-detail__body">' +
        '<span class="room-detail__badge">' + esc(room.badge) + "</span>" +
        '<h3 id="rmTitle">' + esc(room.name) + "</h3>" +
        '<p class="room-detail__price">' + price + ' ₾ <span>/ღამე</span> · <span class="muted">' + esc(room.count) + "</span></p>" +
        '<ul class="room-detail__specs">' +
          room.specs.map(function (s) { return "<li>" + esc(s.text) + "</li>"; }).join("") +
        "</ul>" +
        '<div class="room-detail__amenities">' +
          amen.map(function (a) { return "<span>" + esc(a) + "</span>"; }).join("") +
        "</div>" +
        '<p class="room-detail__policy">გადახდა ადგილზე · უფასო გაუქმება ჩამოსვლამდე 24 სთ-ით ადრე · შესვლა 13:00, გასვლა 12:00</p>' +
        '<div class="room-detail__actions">' +
          '<button type="button" class="btn btn--gold" data-room="' + slug + '">დაჯავშნა</button>' +
          '<a class="btn btn--dark" href="' + waLink("გამარჯობა! მაინტერესებს: " + room.name) + '" target="_blank" rel="noopener">WhatsApp</a>' +
          '<a class="btn btn--ghost-dark" href="tel:' + CFG.PHONE + '">დარეკვა</a>' +
        "</div>" +
      "</div>";
    openModal(roomModal);
  }

  roomModal.addEventListener("click", function (e) {
    var th = e.target.closest("[data-gallery-idx]");
    if (!th) return;
    var idx = parseInt(th.getAttribute("data-gallery-idx"), 10);
    var slug = document.querySelector("#roomDetail [data-room]").getAttribute("data-room");
    document.getElementById("rdMain").src = roomBySlug[slug].images[idx];
    roomModal.querySelectorAll(".room-detail__thumb").forEach(function (t) { t.classList.remove("is-active"); });
    th.classList.add("is-active");
  });

  /* ═══════════ GLOBAL CLICK DELEGATION ═══════════ */
  document.addEventListener("click", function (e) {
    var view = e.target.closest("[data-view-room]");
    if (view) { openRoomDetail(view.getAttribute("data-view-room")); return; }

    var book = e.target.closest("[data-room]");
    if (book && book.hasAttribute("data-room") && !book.closest("#bwRooms")) {
      if (!roomModal.hidden) closeModal(roomModal);
      openWizard(book.getAttribute("data-room"));
      return;
    }

    if (e.target.closest("[data-open-booking]")) { openWizard(); return; }
    if (e.target.closest("[data-close-booking]")) { closeModal(bookingModal); return; }
    if (e.target.closest("[data-close-room]")) { closeModal(roomModal); return; }
  });

  /* ═══════════ DATE INPUTS: one click opens calendar ═══════════ */
  document.addEventListener("click", function (e) {
    var d = e.target;
    if (d.tagName === "INPUT" && d.type === "date" && typeof d.showPicker === "function") {
      try { d.showPicker(); } catch (err) { /* needs gesture / unsupported — native behavior stays */ }
    }
  });

  /* ═══════════ QUICK BOOKING FORM (contact section) ═══════════ */
  var qbForm = document.getElementById("quickBookForm");
  var qbIn = document.getElementById("qbIn");
  var qbOut = document.getElementById("qbOut");
  var qbRoom = document.getElementById("qbRoom");
  var qbGuests = document.getElementById("qbGuests");
  qbIn.min = todayISO();
  qbOut.min = todayISO();
  qbIn.addEventListener("change", function () {
    if (qbOut.value && qbOut.value <= qbIn.value) qbOut.value = "";
    qbOut.min = qbIn.value || todayISO();
    updateQbTotal();
  });
  qbOut.addEventListener("change", updateQbTotal);
  qbRoom.addEventListener("change", updateQbTotal);

  function fillQbRooms() {
    qbRoom.length = 0;
    ROOMS.forEach(function (r) {
      var dbrt = DB.bySlug[r.slug];
      if (dbrt && !dbrt.visible) return;
      var price = dbrt ? Number(dbrt.base_price) : r.price;
      qbRoom.add(new Option(r.name + " — " + price + " ₾/ღამე", r.slug));
    });
  }
  fillQbRooms();

  function updateQbTotal() {
    var el = document.getElementById("qbTotal");
    var slug = qbRoom.value;
    if (!qbIn.value || !qbOut.value || qbOut.value <= qbIn.value || !slug) { el.hidden = true; return; }
    var n = nightsBetween(qbIn.value, qbOut.value);
    var room = roomBySlug[slug];
    var dbrt = DB.bySlug[slug];
    var price = dbrt ? Number(dbrt.base_price) : room.price;
    el.hidden = false;
    el.innerHTML = n + " ღამე × " + price + " ₾ ≈ <strong>" + (n * price) + " ₾</strong>";
  }

  qbForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var status = document.getElementById("qbStatus");
    var success = document.getElementById("qbSuccess");
    success.hidden = true;

    var ci = qbIn.value, co = qbOut.value;
    var slug = qbRoom.value;
    var guests = parseInt(qbGuests.value, 10);
    var name = document.getElementById("qbName").value.trim();
    var surname = document.getElementById("qbSurname").value.trim();
    var phone = document.getElementById("qbPhone").value.trim();
    var email = document.getElementById("qbEmail").value.trim();
    var comment = document.getElementById("qbComment").value.trim();

    function err(msg) { status.textContent = msg; status.className = "form-status is-error"; }
    if (!ci || !co) return err("აირჩიეთ თარიღები.");
    if (co <= ci) return err("გასვლის თარიღი შესვლაზე გვიან უნდა იყოს.");
    if (ci < todayISO()) return err("წარსული თარიღი ვერ აირჩევა.");
    if (nightsBetween(ci, co) > 30) return err("მაქსიმუმ 30 ღამე.");
    if (name.length < 2 || surname.length < 2) return err("შეავსეთ სახელი და გვარი.");
    if (phone.replace(/\D/g, "").length < 9) return err("შეიყვანეთ სწორი ტელეფონი.");

    var room = roomBySlug[slug];
    var dbrt = DB.bySlug[slug];
    var maxGuests = dbrt ? dbrt.max_guests : parseInt((room.specs[1] || {}).text, 10) || 2;
    if (guests > maxGuests) return err("ამ ოთახში მაქსიმუმ " + maxGuests + " სტუმარია — აირჩიეთ სხვა ოთახი.");

    var fullName = name + " " + surname;
    var waText = "გამარჯობა! მინდა დაჯავშნა:\n🏨 " + room.name +
      "\n📅 " + ci + " → " + co + "\n👤 " + guests + " სტუმარი — " + fullName +
      "\n📞 " + phone + (comment ? "\n💬 " + comment : "");

    if (!sb) {
      window.open(waLink(waText), "_blank", "noopener");
      status.textContent = "ჯავშნის დეტალები გაიგზავნა WhatsApp-ით — დაასრულეთ იქ.";
      status.className = "form-status is-ok";
      return;
    }

    var btn = document.getElementById("qbSubmit");
    btn.disabled = true;
    status.textContent = "იგზავნება…";
    status.className = "form-status";

    sb.rpc("create_booking", {
      p_room_type_id: dbrt ? dbrt.id : null,
      p_in: ci, p_out: co, p_guests: guests,
      p_name: fullName, p_phone: phone,
      p_email: email || null, p_comment: comment || null
    }).then(function (res) {
      btn.disabled = false;
      if (res.error) {
        err(/no availability/.test(res.error.message)
          ? "ამ თარიღებზე ეს ოთახი დაკავებულია — სცადეთ სხვა თარიღები."
          : "შეცდომა — სცადეთ თავიდან ან მოგვწერეთ WhatsApp-ზე.");
        return;
      }
      status.textContent = "";
      qbForm.reset();
      document.getElementById("qbTotal").hidden = true;
      document.getElementById("qbNumber").textContent = res.data.booking_number;
      document.getElementById("qbWhatsApp").href =
        waLink("გამარჯობა! დავჯავშნე ოთახი საიტიდან — ჯავშნის ნომერი: " + res.data.booking_number +
               " (" + room.name + ", " + ci + " → " + co + "). გთხოვთ დამიდასტუროთ.");
      success.hidden = false;
    });
  });

  /* refresh quick-form room prices once DB loads */
  var qbRefresh = setInterval(function () {
    if (DB.loaded) { fillQbRooms(); updateQbTotal(); clearInterval(qbRefresh); }
  }, 700);
  setTimeout(function () { clearInterval(qbRefresh); }, 8000);
})();

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
  /* ═══════════ SITE IMAGES (Supabase-backed) ═══════════
     Source of truth: site_images table + site-photos storage bucket.
     Shared helpers live in js/content.js → window.AGAVA_STORE. */
  var STORE = window.AGAVA_STORE;

  function setContentStatus(message, isOk) {
    var el = document.getElementById("contentStatus");
    if (!el) return;
    el.textContent = message;
    el.className = "content-status" + (isOk === true ? " is-ok" : isOk === false ? " is-error" : "");
  }

  /* ordered list of blocks: fixed sections + one per room type */
  function contentBlocks() {
    var blocks = [
      { key: "about", title: "ჩვენს შესახებ", hint: "ფოტოები „ჩვენს შესახებ“ სექციაში" },
      { key: "gallery_breakfast", title: "გალერეა — საუზმე", hint: "საუზმის განყოფილება გალერეაში" },
      { key: "gallery_hotel", title: "გალერეა — სასტუმრო", hint: "სასტუმროსა და ოთახების განყოფილება გალერეაში" }
    ];
    ROOM_TYPES.forEach(function (rt) {
      blocks.push({ key: "room:" + rt.slug, title: "ოთახი — " + rt.name, hint: "ამ ოთახის ბარათის ფოტოები (სლაიდერი + ჯავშანი)" });
    });
    return blocks;
  }

  /* live array reference in the store (created if missing) — mutate directly */
  function listRef(key) {
    if (!STORE) return [];
    if (key.indexOf("room:") === 0) {
      var slug = key.slice(5);
      return STORE.roomImages[slug] || (STORE.roomImages[slug] = []);
    }
    return STORE.sections[key] || (STORE.sections[key] = []);
  }
  function sortByOrder(arr) {
    arr.sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
    return arr;
  }

  function reloadAndRender() {
    if (!STORE) return Promise.resolve();
    return STORE.reload().then(renderContentAdmin);
  }

  function cardHTML(key, item) {
    return '<div class="content-card" draggable="true" data-key="' + esc(key) + '" data-id="' + item.id + '">' +
      '<img class="content-card__img" src="' + esc(item.url) + '" alt="" loading="lazy">' +
      '<div class="content-card__fields">' +
        '<input type="text" value="' + esc(item.alt || "") + '" data-id="' + item.id + '" data-field="alt" placeholder="Alt ტექსტი">' +
        '<input type="text" value="' + esc(item.caption || "") + '" data-id="' + item.id + '" data-field="caption" placeholder="კაპტიონი">' +
      '</div>' +
      '<div class="content-card__actions">' +
        '<button type="button" class="content-card__move" data-action="move" data-key="' + esc(key) + '" data-id="' + item.id + '" data-dir="-1">▲</button>' +
        '<button type="button" class="content-card__move" data-action="move" data-key="' + esc(key) + '" data-id="' + item.id + '" data-dir="1">▼</button>' +
        '<button type="button" class="content-card__remove" data-action="remove" data-key="' + esc(key) + '" data-id="' + item.id + '" data-url="' + esc(item.url) + '">წაშლა</button>' +
      '</div></div>';
  }
  function listHTML(key, items) {
    return items.length
      ? items.map(function (it) { return cardHTML(key, it); }).join("")
      : '<div class="muted">ფოტოები ჯერ არ არის.</div>';
  }
  /* re-render ONLY one block's list — avoids rebuilding every block/image */
  function renderBlockList(key) {
    var host = document.getElementById("contentAdmin");
    if (!host) return;
    var block = host.querySelector('.content-block[data-section="' + key + '"]');
    if (!block) return;
    var list = block.querySelector(".content-list");
    if (list) list.innerHTML = listHTML(key, sortByOrder(listRef(key)));
  }

  function renderContentAdmin() {
    var host = document.getElementById("contentAdmin");
    if (!host) return;
    if (!STORE || !STORE.configured) {
      host.innerHTML = '<div class="muted">Supabase არ არის კონფიგურირებული — ფოტოების მართვა მიუწვდომელია.</div>';
      return;
    }

    host.innerHTML = contentBlocks().map(function (block) {
      var items = sortByOrder(listRef(block.key));
      var groupClass = block.key.indexOf("room:") === 0 ? " content-block--room" : "";
      return '<div class="content-block' + groupClass + '" data-section="' + esc(block.key) + '">' +
        '<div class="content-block__head"><div>' +
          '<div class="content-block__title">' + esc(block.title) + '</div>' +
          '<div class="content-block__hint">' + esc(block.hint) + '</div>' +
        '</div>' +
        '<label class="content-upload-btn abtn abtn--sm"><input class="content-upload" type="file" accept="image/*" multiple data-key="' + esc(block.key) + '" hidden>+ ფოტოს დამატება</label>' +
        '</div>' +
        '<div class="content-upload-drop" data-dropzone="' + esc(block.key) + '">ჩააგდე ფოტო აქ ან დააჭირე ღილაკს ზემოთ</div>' +
        '<div class="content-list">' + listHTML(block.key, items) + '</div></div>';
    }).join("");
  }

  function handleUpload(key, files) {
    if (!STORE) return;
    var pending = Array.prototype.filter.call(files || [], function (f) { return f && f.type && f.type.indexOf("image/") === 0; });
    if (!pending.length) return;
    setContentStatus("იტვირთება… (" + pending.length + ")");
    var arr = listRef(key);
    var base = arr.length;
    /* upload in parallel; append each row to the live list as it lands */
    Promise.all(pending.map(function (file, i) {
      return STORE.uploadFile(file).then(function (up) {
        return STORE.insertImage(key, up.url, file.name, "", base + i);
      }).then(function (row) {
        if (row) { arr.push(row); renderBlockList(key); }
        return row;
      });
    })).then(function () {
      renderBlockList(key);
      setContentStatus("ატვირთულია ✓", true);
    }).catch(function (err) {
      setContentStatus("შეცდომა: " + (err && err.message || err), false);
      reloadAndRender();
    });
  }

  function removeImg(key, id, url) {
    if (!STORE) return;
    if (!confirm("წავშალო ეს ფოტო?")) return;
    var arr = listRef(key);
    var idx = -1;
    arr.forEach(function (r, i) { if (String(r.id) === String(id)) idx = i; });
    if (idx >= 0) arr.splice(idx, 1);
    renderBlockList(key);                 /* instant */
    setContentStatus("იშლება…");
    STORE.deleteImage(id, url).then(function () {
      setContentStatus("წაშლილია ✓", true);
    }).catch(function (err) {
      setContentStatus("შეცდომა: " + (err && err.message || err), false);
      reloadAndRender();
    });
  }

  function persistOrder(key, arr) {
    STORE.setOrder(arr).then(function () {
      setContentStatus("შენახულია ✓", true);
    }).catch(function (err) {
      setContentStatus("შეცდომა: " + (err && err.message || err), false);
      reloadAndRender();
    });
  }

  function moveImg(key, id, dir) {
    if (!STORE) return;
    var arr = listRef(key);
    var idx = -1;
    arr.forEach(function (r, i) { if (String(r.id) === String(id)) idx = i; });
    var to = idx + dir;
    if (idx < 0 || to < 0 || to >= arr.length) return;
    var tmp = arr[idx]; arr[idx] = arr[to]; arr[to] = tmp;
    arr.forEach(function (r, i) { r.sort = i; });
    renderBlockList(key);                 /* instant */
    persistOrder(key, arr);
  }

  function reorderByDrop(key, fromId, toId) {
    if (!STORE || String(fromId) === String(toId)) return;
    var arr = listRef(key);
    var from = -1, to = -1;
    arr.forEach(function (r, i) {
      if (String(r.id) === String(fromId)) from = i;
      if (String(r.id) === String(toId)) to = i;
    });
    if (from < 0 || to < 0) return;
    var item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
    arr.forEach(function (r, i) { r.sort = i; });
    renderBlockList(key);                 /* instant */
    persistOrder(key, arr);
  }

  var contentHost = document.getElementById("contentAdmin");

  contentHost.addEventListener("change", function (e) {
    var input = e.target;
    if (input.matches(".content-upload")) {
      handleUpload(input.getAttribute("data-key"), input.files);
      input.value = "";
      return;
    }
    if (input.matches("[data-field]")) {
      var id = input.getAttribute("data-id");
      var field = input.getAttribute("data-field");
      var val = input.value;
      var card = input.closest(".content-card");
      var key = card && card.getAttribute("data-key");
      if (key) {
        listRef(key).forEach(function (r) { if (String(r.id) === String(id)) r[field] = val; });
      }
      var patch = {}; patch[field] = val;
      setContentStatus("ინახება…");
      STORE.updateImage(id, patch).then(function () {
        setContentStatus("შენახულია ✓", true);
      }).catch(function (err) {
        setContentStatus("შეცდომა: " + (err && err.message || err), false);
      });
    }
  });

  contentHost.addEventListener("click", function (e) {
    var rm = e.target.closest("[data-action='remove']");
    if (rm) { removeImg(rm.getAttribute("data-key"), rm.getAttribute("data-id"), rm.getAttribute("data-url")); return; }
    var mv = e.target.closest("[data-action='move']");
    if (mv) { moveImg(mv.getAttribute("data-key"), mv.getAttribute("data-id"), parseInt(mv.getAttribute("data-dir"), 10)); }
  });

  contentHost.addEventListener("dragstart", function (e) {
    var card = e.target.closest(".content-card");
    if (!card) return;
    card.classList.add("is-dragging");
    e.dataTransfer.setData("text/plain", card.getAttribute("data-key") + ":" + card.getAttribute("data-id"));
  });

  contentHost.addEventListener("dragend", function () {
    document.querySelectorAll(".content-card.is-dragging").forEach(function (n) { n.classList.remove("is-dragging"); });
    document.querySelectorAll(".content-card.is-drop-target").forEach(function (n) { n.classList.remove("is-drop-target"); });
  });

  contentHost.addEventListener("dragover", function (e) {
    var card = e.target.closest(".content-card");
    if (card) {
      e.preventDefault();
      document.querySelectorAll(".content-card.is-drop-target").forEach(function (n) { n.classList.remove("is-drop-target"); });
      card.classList.add("is-drop-target");
    }
  });

  contentHost.addEventListener("drop", function (e) {
    var dz = e.target.closest(".content-upload-drop");
    if (dz && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      e.preventDefault();
      dz.classList.remove("is-active");
      handleUpload(dz.getAttribute("data-dropzone"), e.dataTransfer.files);
      return;
    }
    var card = e.target.closest(".content-card");
    if (!card) return;
    e.preventDefault();
    var data = e.dataTransfer.getData("text/plain");
    if (!data) return;
    var parts = data.split(":");
    var fromKey = parts[0], fromId = parts.slice(1).join(":");
    var toKey = card.getAttribute("data-key");
    var toId = card.getAttribute("data-id");
    if (fromKey === toKey) reorderByDrop(fromKey, fromId, toId);
    document.querySelectorAll(".content-card.is-drop-target").forEach(function (n) { n.classList.remove("is-drop-target"); });
  });

  contentHost.addEventListener("dragenter", function (e) {
    var dz = e.target.closest(".content-upload-drop");
    if (dz) dz.classList.add("is-active");
  });

  contentHost.addEventListener("dragleave", function (e) {
    var dz = e.target.closest(".content-upload-drop");
    if (dz) dz.classList.remove("is-active");
  });

  document.getElementById("saveContentBtn").addEventListener("click", function () {
    setContentStatus("ნახლდება…");
    reloadAndRender().then(function () { setContentStatus("განახლდა ✓", true); });
  });

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
      return STORE ? STORE.load() : null;
    }).then(function () {
      renderContentAdmin();
      renderBreakfastSettings();
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
      var targetPane = document.getElementById("pane-" + btn.getAttribute("data-pane"));
      if (targetPane) targetPane.hidden = false;
      if (btn.getAttribute("data-pane") === "content") renderContentAdmin();
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
        "<td>" + esc(b.guest_name) + "<div class='muted'>" + esc(b.guest_phone) + "</div>" +
          (b.comment ? "<div class='row-comment'>💬 " + esc(b.comment) + "</div>" : "") + "</td>" +
        "<td>" + esc(b.room_types ? b.room_types.name : "") +
          (b.room_no ? " <span class='room-no'>#" + esc(b.room_no) + "</span>" : "") +
          "<div class='muted'>" + b.guests + " სტუმარი" + (b.breakfast ? " · 🍳 საუზმე" : "") + "</div></td>" +
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

  function fillRoomNoOptions(rtId, selected) {
    var sel = document.getElementById("ebRoomNo");
    if (!sel) return;
    var rt = rtById[rtId];
    var nums = (rt && rt.room_numbers) || [];
    sel.innerHTML = '<option value="">—</option>' +
      nums.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + "</option>"; }).join("");
    sel.value = selected || "";
  }

  function openEdit(b) {
    document.getElementById("editTitle").textContent = b ? "ჯავშნის რედაქტირება" : "ახალი ჯავშანი";
    document.getElementById("ebId").value = b ? b.id : "";
    document.getElementById("ebName").value = b ? b.guest_name : "";
    document.getElementById("ebPhone").value = b ? b.guest_phone : "";
    var rtId = b ? b.room_type_id : (ROOM_TYPES[0] ? ROOM_TYPES[0].id : "");
    document.getElementById("ebRoom").value = rtId;
    document.getElementById("ebGuests").value = b ? b.guests : 2;
    document.getElementById("ebIn").value = b ? b.check_in : todayISO();
    document.getElementById("ebOut").value = b ? b.check_out : "";
    document.getElementById("ebStatus").value = b ? b.status : "confirmed";
    document.getElementById("ebPrice").value = b && b.total_price != null ? Number(b.total_price) : "";
    document.getElementById("ebComment").value = b ? (b.comment || "") : "";
    fillRoomNoOptions(parseInt(rtId, 10), b ? b.room_no : "");
    document.getElementById("ebBreakfast").checked = b ? !!b.breakfast : false;
    document.getElementById("editStatus").textContent = "";
    editModal.hidden = false;
  }

  document.getElementById("ebRoom").addEventListener("change", function () {
    fillRoomNoOptions(parseInt(this.value, 10), "");
  });
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
      comment: document.getElementById("ebComment").value.trim() || null,
      room_no: document.getElementById("ebRoomNo").value || null,
      breakfast: document.getElementById("ebBreakfast").checked
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
        '<div class="room-row__name">' + esc(rt.name) + "<small>" + esc(rt.bed_type || "") + " · " + (rt.room_size || "—") + " მ²</small></div>" +
        '<div><label>ფასი ₾/ღამე</label><input type="number" min="0" class="rr-price" value="' + Number(rt.base_price) + '"></div>' +
        '<div><label>ოთახების რაოდ.</label><input type="number" min="0" class="rr-total" value="' + rt.total_rooms + '"></div>' +
        '<div><label>მაქს. სტუმარი</label><input type="number" min="1" class="rr-guests" value="' + rt.max_guests + '"></div>' +
        '<div class="room-row__nums"><label>ოთახის ნომრები (მძიმით)</label><input type="text" class="rr-nums" placeholder="მაგ.: 410, 411" value="' + esc((rt.room_numbers || []).join(", ")) + '"></div>' +
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
    var numsInput = row.querySelector(".rr-nums");
    var nums = numsInput
      ? numsInput.value.split(/[,\s]+/).map(function (s) { return s.trim(); }).filter(Boolean)
      : [];
    sb.from("room_types").update({
      base_price: Number(row.querySelector(".rr-price").value),
      total_rooms: parseInt(row.querySelector(".rr-total").value, 10),
      max_guests: parseInt(row.querySelector(".rr-guests").value, 10) || 1,
      room_numbers: nums,
      visible: row.querySelector(".rr-visible").checked
    }).eq("id", id).then(function (res) {
      btn.textContent = res.error ? "შეცდომა" : "შენახულია ✓";
      setTimeout(function () { btn.textContent = "შენახვა"; }, 1400);
      loadRoomTypes().then(renderCalendar);
    });
  });

  /* ═══ BREAKFAST SETTINGS (price + menu) ═══ */
  function renderBreakfastSettings() {
    var host = document.getElementById("breakfastSettings");
    if (!host || !STORE) return;
    var price = STORE.setting("breakfast_price", "30");
    var menu = STORE.setting("breakfast_menu", "");
    host.innerHTML =
      '<div class="bset__head"><strong>საუზმის პარამეტრები</strong>' +
        '<button class="abtn abtn--gold abtn--sm" id="bsetSave">შენახვა</button>' +
        '<span class="content-status" id="bsetStatus"></span>' +
      '</div>' +
      '<div class="bset__grid">' +
        '<div class="bset__fld"><label>ფასი ₾ (თითო სტუმარზე / ღამეზე)</label>' +
          '<input type="number" min="0" id="bsetPrice" value="' + esc(price) + '"></div>' +
        '<div class="bset__fld bset__fld--wide"><label>საუზმის მენიუ (ჩანს ჯავშნის დროს)</label>' +
          '<textarea id="bsetMenu" rows="2" placeholder="ომლეტი • ხაჭაპური • ყავა…">' + esc(menu) + '</textarea></div>' +
      '</div>';
  }

  document.getElementById("breakfastSettings").addEventListener("click", function (e) {
    if (!e.target.closest("#bsetSave")) return;
    var status = document.getElementById("bsetStatus");
    var price = document.getElementById("bsetPrice").value;
    var menu = document.getElementById("bsetMenu").value;
    status.textContent = "ინახება…";
    status.className = "content-status";
    Promise.all([
      STORE.setSetting("breakfast_price", String(Number(price) || 0)),
      STORE.setSetting("breakfast_menu", menu)
    ]).then(function () {
      status.textContent = "შენახულია ✓";
      status.className = "content-status is-ok";
    }).catch(function (err) {
      status.textContent = "შეცდომა: " + (err && err.message || err);
      status.className = "content-status is-error";
    });
  });
})();

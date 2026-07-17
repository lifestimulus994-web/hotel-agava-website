/* ═══════════════════════════════════════════
   HOTEL AGAVA — shared image store (Supabase-backed)
   Public pages read; admin panel writes.
   Loaded BEFORE main.js / booking.js / admin.js.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  var CFG = window.AGAVA_CONFIG || {};
  var BUCKET = "site-photos";

  var sb = null;
  if (CFG.CONFIGURED && window.supabase) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  }

  var KNOWN_SECTIONS = ["about", "rooms", "gallery_breakfast", "gallery_hotel"];

  var store = {
    sb: sb,
    bucket: BUCKET,
    configured: !!sb,
    loaded: false,
    /* section -> [{id, url, alt, caption, sort}] (only what DB returned) */
    sections: {},
    /* slug -> [{id, url, alt, caption, sort}] */
    roomImages: {},
    load: load,
    reload: load,
    uploadFile: uploadFile,
    insertImage: insertImage,
    updateImage: updateImage,
    deleteImage: deleteImage,
    setOrder: setOrder,
    /* helpers for public renderers: return DB rows or [] */
    section: function (key) { return store.sections[key] || []; },
    room: function (slug) { return store.roomImages[slug] || []; }
  };
  window.AGAVA_STORE = store;

  function groupRows(rows) {
    var sections = {};
    var roomImages = {};
    rows.forEach(function (r) {
      if (typeof r.section === "string" && r.section.indexOf("room:") === 0) {
        var slug = r.section.slice(5);
        (roomImages[slug] = roomImages[slug] || []).push(r);
      } else {
        (sections[r.section] = sections[r.section] || []).push(r);
      }
    });
    return { sections: sections, roomImages: roomImages };
  }

  function load() {
    if (!sb) {
      store.loaded = true;
      return Promise.resolve(store);
    }
    return sb.from("site_images").select("*").order("sort", { ascending: true })
      .then(function (res) {
        if (!res.error && res.data) {
          var g = groupRows(res.data);
          store.sections = g.sections;
          store.roomImages = g.roomImages;
        }
        store.loaded = true;
        return store;
      })
      .catch(function () {
        store.loaded = true;
        return store;
      });
  }

  /* ─── Storage upload → returns { url, path } ─── */
  function uploadFile(file) {
    if (!sb) return Promise.reject(new Error("supabase not configured"));
    var name = (file && file.name) || "photo.jpg";
    var ext = (name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    var path = "img/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    return sb.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false })
      .then(function (res) {
        if (res.error) throw res.error;
        var pub = sb.storage.from(BUCKET).getPublicUrl(path);
        return { url: pub.data.publicUrl, path: path };
      });
  }

  /* ─── DB CRUD ─── */
  function insertImage(section, url, alt, caption, sort) {
    if (!sb) return Promise.reject(new Error("supabase not configured"));
    return sb.from("site_images")
      .insert({ section: section, url: url, alt: alt || "", caption: caption || "", sort: sort || 0 })
      .select().then(function (res) {
        if (res.error) throw res.error;
        return res.data && res.data[0];
      });
  }

  function updateImage(id, fields) {
    if (!sb) return Promise.reject(new Error("supabase not configured"));
    return sb.from("site_images").update(fields).eq("id", id).then(function (res) {
      if (res.error) throw res.error;
      return true;
    });
  }

  function deleteImage(id, url) {
    if (!sb) return Promise.reject(new Error("supabase not configured"));
    return sb.from("site_images").delete().eq("id", id).then(function (res) {
      if (res.error) throw res.error;
      /* best-effort storage cleanup for files we uploaded */
      var marker = "/" + BUCKET + "/";
      if (url && url.indexOf(marker) !== -1) {
        var path = url.split(marker)[1];
        if (path) sb.storage.from(BUCKET).remove([path]);
      }
      return true;
    });
  }

  /* rows: ordered array of {id} → writes sort = index */
  function setOrder(rows) {
    if (!sb) return Promise.reject(new Error("supabase not configured"));
    return Promise.all(rows.map(function (r, i) {
      return sb.from("site_images").update({ sort: i }).eq("id", r.id);
    })).then(function () { return true; });
  }

  /* exported for renderers that want the known top-level sections list */
  store.KNOWN_SECTIONS = KNOWN_SECTIONS;
})();

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
    ok: false,          /* true once a DB fetch succeeded → DB is authoritative */
    /* section -> [{id, url, alt, caption, sort}] (only what DB returned) */
    sections: {},
    /* slug -> [{id, url, alt, caption, sort}] */
    roomImages: {},
    /* app_settings key -> value (breakfast_price, breakfast_menu, …) */
    settings: {},
    load: load,
    reload: load,
    uploadFile: uploadFile,
    imageURL: imageURL,
    imageSrcset: imageSrcset,
    insertImage: insertImage,
    updateImage: updateImage,
    deleteImage: deleteImage,
    setOrder: setOrder,
    /* helpers for public renderers: return DB rows or [] */
    section: function (key) { return store.sections[key] || []; },
    room: function (slug) { return store.roomImages[slug] || []; },
    setting: function (key, dflt) {
      var v = store.settings[key];
      return (v === undefined || v === null) ? dflt : v;
    },
    setSetting: setSetting
  };

  function setSetting(key, value) {
    if (!sb) return Promise.reject(new Error("supabase not configured"));
    return sb.from("app_settings").upsert({ key: key, value: value }, { onConflict: "key" })
      .then(function (res) {
        if (res.error) throw res.error;
        store.settings[key] = value;
        return true;
      });
  }
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
    return Promise.all([
      sb.from("site_images").select("*").order("sort", { ascending: true }),
      sb.from("app_settings").select("*")
    ]).then(function (res) {
      var imgRes = res[0], setRes = res[1];
      if (imgRes && !imgRes.error && imgRes.data) {
        var g = groupRows(imgRes.data);
        store.sections = g.sections;
        store.roomImages = g.roomImages;
        store.ok = true;
      }
      if (setRes && !setRes.error && setRes.data) {
        var s = {};
        setRes.data.forEach(function (row) { s[row.key] = row.value; });
        store.settings = s;
      }
      store.loaded = true;
      return store;
    }).catch(function () {
      store.loaded = true;
      return store;
    });
  }

  // Preserve the original database URLs while serving optimized copies of
  // the two legacy camera uploads. Admin deletion still uses the original.
  function imageURL(url) {
    var legacy = {
      "1792317136180-bdjnen.jpeg": "/assets/jacuzzi-upload-39.webp",
      "1792317136181-7wujcs.jpeg": "/assets/jacuzzi-upload-38.webp"
    };
    var prefix = CFG.SUPABASE_URL + "/storage/v1/object/public/site-photos/img/";
    return url && url.indexOf(prefix) === 0 && legacy[url.slice(prefix.length)] || url;
  }

  function imageSrcset(url) {
    var prefix = CFG.SUPABASE_URL + "/storage/v1/object/public/site-photos/img/";
    if (!url || url.indexOf(prefix) !== 0) return "";
    var match = /^(.*-photo)-([0-9]+)w\.webp$/.exec(url);
    if (!match) return "";
    var width = Number(match[2]);
    return [480, 800].filter(function (w) { return w < width; }).concat(width)
      .map(function (w) { return match[1] + "-" + w + "w.webp " + w + "w"; }).join(", ");
  }

  /* All admin photo entry points share this preparation/upload path. */
  async function uploadFile(file) {
    if (!sb) return Promise.reject(new Error("supabase not configured"));
    if (!window.AGAVA_PREPARE_PHOTO) throw new Error("განაახლეთ ადმინის გვერდი და ხელახლა ატვირთეთ ფოტო.");
    var variants = await window.AGAVA_PREPARE_PHOTO(file);
    var base = "img/" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) + "-photo";
    var uploaded = [], path;
    try {
      // Publish the primary URL only after every responsive variant exists.
      for (var variant of variants) {
        path = base + "-" + variant.width + "w.webp";
        var res = await sb.storage.from(BUCKET).upload(path, variant.blob, {
          cacheControl: "31536000", contentType: "image/webp", upsert: false
        });
        if (res.error) throw res.error;
        uploaded.push(path);
      }
      var pub = sb.storage.from(BUCKET).getPublicUrl(path);
      return { url: pub.data.publicUrl, path: path };
    } catch (err) {
      if (uploaded.length) await sb.storage.from(BUCKET).remove(uploaded).catch(function () {});
      throw err;
    }
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
        if (path) {
          var match = /^(.*-photo)-([0-9]+)w\.webp$/.exec(path);
          var paths = match ? [480, 800].filter(function (w) { return w < Number(match[2]); }).concat(Number(match[2]))
            .map(function (w) { return match[1] + "-" + w + "w.webp"; }) : [path];
          sb.storage.from(BUCKET).remove(paths);
        }
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

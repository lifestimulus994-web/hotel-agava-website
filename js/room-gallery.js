/* ═══════════════════════════════════════════
   HOTEL AGAVA — room detail gallery (/rooms/<slug>/)

   The thumbnails under the main photo were generated as real <button>
   elements and fully styled (pointer cursor, gold .is-active border),
   but no script ever listened for the click, so they did nothing.

   The swap copies the thumb's own src/srcset — NOT its data-src, which
   points at the heavier .jpg fallback and would drop the responsive set.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  var main = document.getElementById("rdpMain");
  var strip = document.querySelector(".rdp-thumbs");
  if (!main || !strip) return;

  /* read once: the thumbs declare a sizes written for the 84px strip,
     the main slot needs its own */
  var MAIN_SIZES = main.getAttribute("sizes") || "100vw";

  function show(btn) {
    var img = btn.querySelector("img");
    var src = img && img.getAttribute("src");
    if (!src) return;

    main.setAttribute("src", src);

    var ss = img.getAttribute("srcset");
    if (ss) main.setAttribute("srcset", ss);
    else main.removeAttribute("srcset");
    main.setAttribute("sizes", MAIN_SIZES);

    /* keep the box ratio honest so the swap cannot shift layout */
    var w = img.getAttribute("width");
    var h = img.getAttribute("height");
    if (w) main.setAttribute("width", w);
    if (h) main.setAttribute("height", h);

    /* the first photo carries fetchpriority=high for LCP; once the guest
       has clicked, the page is long painted and the hint would only
       compete with whatever else is still loading */
    main.removeAttribute("fetchpriority");

    var all = strip.querySelectorAll(".rdp-thumb");
    for (var i = 0; i < all.length; i++) {
      var on = all[i] === btn;
      all[i].classList.toggle("is-active", on);
      if (on) all[i].setAttribute("aria-current", "true");
      else all[i].removeAttribute("aria-current");
    }
  }

  /* one listener on the strip: the buttons are <button>, so Enter and
     Space already fire click and keyboard users are covered */
  strip.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".rdp-thumb");
    if (btn && strip.contains(btn)) show(btn);
  });

  /* ── Photos managed in the admin panel ──
     The page ships with the photos it was built with. The hotel can add,
     remove and reorder a room's photos at any time, so the current list is
     read from the database and the strip is rebuilt when it differs. If the
     request fails, the built-in photos simply stay. */
  var CFG = window.AGAVA_CONFIG;
  var slugMatch = /\/rooms\/([a-z0-9-]+)\/?$/.exec(location.pathname);
  if (!CFG || !CFG.CONFIGURED || !slugMatch || !window.fetch) return;

  var BUCKET = CFG.SUPABASE_URL + "/storage/v1/object/public/site-photos/img/";
  var LEGACY = {
    "1792317136180-bdjnen.jpeg": "/assets/jacuzzi-upload-39.webp",
    "1792317136181-7wujcs.jpeg": "/assets/jacuzzi-upload-38.webp"
  };

  /* database URL → { src, srcset, raw } using the light copies where they exist */
  function resolve(url) {
    var raw = url;
    if (url.indexOf(BUCKET) === 0 && LEGACY[url.slice(BUCKET.length)]) url = LEGACY[url.slice(BUCKET.length)];
    if (!/^(https?:)?\/\//.test(url) && url.charAt(0) !== "/") url = "/" + url;
    if (!/^(https?:)?\/\//.test(raw) && raw.charAt(0) !== "/") raw = "/" + raw;
    var m = /^(.*-photo)-([0-9]+)w\.(webp|jpg)$/.exec(url);
    if (m && url.indexOf(BUCKET) === 0) {
      var w = Number(m[2]);
      return { raw: raw, src: url, srcset: [480, 800].filter(function (x) { return x < w; }).concat(w)
        .map(function (x) { return m[1] + "-" + x + "w." + m[3] + " " + x + "w"; }).join(", ") };
    }
    var a = /^\/assets\/(.+?)(?:-\d+w)?\.(?:jpe?g|png|webp)$/i.exec(url);
    if (a) {
      var base = "/assets/" + a[1];
      return { raw: raw, src: base + ".webp",
        srcset: base + "-480w.webp 480w, " + base + "-800w.webp 800w, " + base + ".webp 1600w" };
    }
    return { raw: raw, src: url, srcset: "" };
  }

  /* a light copy that does not exist falls back to the stored original */
  function guard(img, raw) {
    img.addEventListener("error", function () {
      if (img.hasAttribute("srcset")) { img.removeAttribute("srcset"); return; }
      if (raw && img.getAttribute("src") !== raw) img.setAttribute("src", raw);
    });
  }

  fetch(CFG.SUPABASE_URL + "/rest/v1/site_images?select=url&section=eq." +
        encodeURIComponent("room:" + slugMatch[1]) + "&order=sort.asc", {
    headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: "Bearer " + CFG.SUPABASE_ANON_KEY }
  }).then(function (r) { return r.ok ? r.json() : null; }).then(function (rows) {
    if (!rows || !rows.length) return;
    var list = rows.filter(function (r) { return r && r.url; }).map(function (r) { return resolve(r.url); });
    if (!list.length) return;

    var current = Array.prototype.map.call(strip.querySelectorAll(".rdp-thumb img"),
      function (img) { return img.getAttribute("src"); });
    var same = current.length === list.length && list.every(function (it, i) { return it.src === current[i]; });
    if (same) return;

    var alt = main.getAttribute("alt") || "";
    var label = (strip.querySelector(".rdp-thumb") || main).getAttribute("aria-label") || "";
    label = label.replace(/\s*\d+\s*$/, "");

    strip.textContent = "";
    list.forEach(function (it, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rdp-thumb";
      btn.setAttribute("data-src", it.src);
      if (label) btn.setAttribute("aria-label", label + " " + (i + 1));
      var img = document.createElement("img");
      img.alt = alt;
      img.loading = "lazy";
      if (it.srcset) { img.setAttribute("srcset", it.srcset); img.setAttribute("sizes", "84px"); }
      img.setAttribute("src", it.src);
      guard(img, it.raw);
      btn.appendChild(img);
      strip.appendChild(btn);
    });
    main.removeAttribute("width");
    main.removeAttribute("height");
    guard(main, "");
    show(strip.querySelector(".rdp-thumb"));
  }).catch(function () {});
})();

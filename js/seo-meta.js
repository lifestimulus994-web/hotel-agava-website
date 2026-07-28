/* ═══════════════════════════════════════════
   HOTEL AGAVA — per-page SEO overrides (applied at runtime)
   Reads seo_meta for the current path (admin "SEO" module) and
   patches <head>. Only ka pages (lang pages keep their baked,
   translated meta). Baked HTML is the fallback if no override.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  var CFG = window.AGAVA_CONFIG || {};
  if (!CFG.CONFIGURED || !window.supabase) return;

  var path = location.pathname || "/";
  if (/^\/(en|ru|tr)(\/|$)/.test(path)) return;   // localized pages keep baked meta
  if (path.length > 1 && path.charAt(path.length - 1) !== "/") path += "/";

  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  sb.from("seo_meta").select("title,description,og_image,robots").eq("path", path).limit(1)
    .then(function (res) {
      var m = res && res.data && res.data[0];
      if (!m) return;
      if (m.title) {
        document.title = m.title;
        setMeta("property", "og:title", m.title);
        setMeta("name", "twitter:title", m.title);
      }
      if (m.description) {
        setMeta("name", "description", m.description);
        setMeta("property", "og:description", m.description);
        setMeta("name", "twitter:description", m.description);
      }
      if (m.og_image) {
        setMeta("property", "og:image", m.og_image);
        setMeta("name", "twitter:image", m.og_image);
      }
      if (m.robots) setMeta("name", "robots", m.robots);
    });

  function setMeta(attr, val, content) {
    var el = document.querySelector('meta[' + attr + '="' + val + '"]');
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, val); document.head.appendChild(el); }
    el.setAttribute("content", content);
  }
})();

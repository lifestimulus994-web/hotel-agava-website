/* ═══════════════════════════════════════════
   HOTEL AGAVA — per-page SEO overrides (applied at runtime)
   Reads seo_meta for the current path (admin "SEO" module) and
   patches <head>. All four languages use their own path. The publishing workflow also
   bakes these values into HTML for crawlers and social previews.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  var CFG = window.AGAVA_CONFIG || {};
  if (!CFG.CONFIGURED) return;

  var path = location.pathname || "/";
  if (path.length > 1 && path.charAt(path.length - 1) !== "/") path += "/";

  fetch(CFG.SUPABASE_URL + "/rest/v1/seo_meta?select=title,description,og_image,robots&path=eq." + encodeURIComponent(path) + "&limit=1", {
    headers: { apikey: CFG.SUPABASE_ANON_KEY }
  }).then(function (res) {
    if (!res.ok) throw new Error("SEO metadata unavailable");
    return res.json();
  }).then(function (rows) {
      var m = rows && rows[0];
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
    }).catch(function () { /* The published HTML remains the fallback. */ });

  function setMeta(attr, val, content) {
    var el = document.querySelector('meta[' + attr + '="' + val + '"]');
    if (!el) { el = document.createElement("meta"); el.setAttribute(attr, val); document.head.appendChild(el); }
    el.setAttribute("content", content);
  }
})();

/* ═══════════════════════════════════════════
   HOTEL AGAVA — live prices
   The hotel edits prices in the admin panel. Pages built from the repo
   would keep yesterday's figure until the hourly sync runs, so every
   price the guest sees is refreshed from room_types on load. Silent on
   failure: the number already in the HTML stays, and it is never wrong
   by more than one hour.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  var CFG = window.AGAVA_CONFIG || {};
  if (!CFG.CONFIGURED || !CFG.SUPABASE_URL || !window.fetch) return;

  function slugFromPath() {
    var m = location.pathname.match(/\/rooms\/([a-z0-9-]+)\/?$/);
    return m ? m[1] : null;
  }

  /* "150 ₾" / "150 GEL" → the same shape with a new number */
  function setPrice(el, price) {
    if (!el) return;
    var node = el.firstChild;
    if (node && node.nodeType === 3 && /\d/.test(node.nodeValue)) {
      node.nodeValue = node.nodeValue.replace(/\d+/, price);
    } else if (!el.children.length) {
      el.textContent = el.textContent.replace(/\d+/, price);
    }
  }

  fetch(CFG.SUPABASE_URL + "/rest/v1/room_types?select=slug,base_price,visible", {
    headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: "Bearer " + CFG.SUPABASE_ANON_KEY }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (rows) {
      if (!rows || !rows.length) return;
      var own = slugFromPath();
      rows.forEach(function (rt) {
        var price = Number(rt.base_price);
        if (!price) return;

        /* room cards on /rooms/ and the homepage grid */
        var tile = document.querySelector('[data-room-slug="' + rt.slug + '"]');
        if (tile) {
          setPrice(tile.querySelector(".room-tile__price"), price);
          if (rt.visible === false) tile.style.display = "none";
        }
        /* the comparison table, the facts box — anything tagged by slug */
        Array.prototype.forEach.call(
          document.querySelectorAll('[data-price="' + rt.slug + '"]'),
          function (el) { el.textContent = String(price); }
        );
        /* the headline figure on this room's own page */
        if (own === rt.slug) setPrice(document.querySelector(".rdp-price"), price);
      });
    })
    .catch(function () { /* keep what the page already says */ });
})();

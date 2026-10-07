/* ═══════════════════════════════════════════
   HOTEL AGAVA — live prices
   The hotel edits prices in the admin panel. Pages built from the repo
   would keep yesterday's figure until the hourly sync runs, so every
   price the guest sees is refreshed from room_types on load. Silent on
   failure: the number already in the HTML stays, and it is never wrong
   by more than one hour.

   A room can also be on sale. The sale lives in the database, so
   check_availability already charges the reduced figure — this file only
   makes the page show what the guest will actually pay, with the normal
   price struck through beside it.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  var CFG = window.AGAVA_CONFIG || {};
  if (!CFG.CONFIGURED || !CFG.SUPABASE_URL || !window.fetch) return;

  var WITH_SALE = "slug,base_price,sale_price,sale_active,visible";
  var PLAIN = "slug,base_price,visible";

  function slugFromPath() {
    var m = location.pathname.match(/\/rooms\/([a-z0-9-]+)\/?$/);
    return m ? m[1] : null;
  }

  function esc(t) {
    return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* The price sits in markup like <p>150 ₾<span>/ღამე</span></p>, so the
     figure is swapped in place and the rest of the element is left alone:
     rewriting the whole contents would strip the /ღამე wrapper and the
     smaller type that goes with it. The regex skips anything inside a tag,
     so an attribute that happens to hold digits is never touched. The
     original is kept on the element, so running twice never nests. */
  var FIRST_NUMBER = /(^|>)([^<]*?)(\d+)/;

  function money(el, base, sale) {
    if (!el) return;
    if (!el.hasAttribute("data-price-tpl")) el.setAttribute("data-price-tpl", el.innerHTML);
    var tpl = el.getAttribute("data-price-tpl");
    if (!FIRST_NUMBER.test(tpl)) return;
    var shown = sale
      ? '<s class="price-was">' + base + '</s> <span class="price-now">' + sale + "</span>"
      : String(base);
    el.innerHTML = tpl.replace(FIRST_NUMBER, "$1$2" + shown);
  }

  function apply(rows) {
    if (!rows || !rows.length) return;
    var own = slugFromPath();
    rows.forEach(function (rt) {
      var base = Number(rt.base_price);
      if (!base) return;
      var sale = rt.sale_active && rt.sale_price != null ? Number(rt.sale_price) : 0;
      if (!(sale > 0) || sale >= base) sale = 0;

      /* room cards on /rooms/ and the homepage grid */
      var tile = document.querySelector('[data-room-slug="' + rt.slug + '"]');
      if (tile) {
        money(tile.querySelector(".room-tile__price"), base, sale);
        if (sale) tile.classList.add("is-on-sale");
        if (rt.visible === false) tile.style.display = "none";
      }
      /* the comparison table, the facts box — anything tagged by slug */
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-price="' + rt.slug + '"]'),
        function (el) { money(el, base, sale); }
      );
      /* the headline figure on this room's own page */
      if (own === rt.slug) money(document.querySelector(".rdp-price"), base, sale);
    });
  }

  function load(columns, onFail) {
    return fetch(CFG.SUPABASE_URL + "/rest/v1/room_types?select=" + columns, {
      headers: { apikey: CFG.SUPABASE_ANON_KEY, Authorization: "Bearer " + CFG.SUPABASE_ANON_KEY }
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(received)
      .catch(function () { if (onFail) onFail(); });
  }

  /* The room grid on the homepage is not in the HTML: js/main.js draws it
     from window.AGAVA_ROOMS_DATA, and that can happen either side of this
     fetch. So write the figures back into that array for the tiles drawn
     after us, and watch briefly for tiles drawn before the data lands. */
  function seed(rows) {
    var data = window.AGAVA_ROOMS_DATA;
    if (!data || !data.length) return;
    rows.forEach(function (rt) {
      var base = Number(rt.base_price);
      if (!base) return;
      var sale = rt.sale_active && rt.sale_price != null ? Number(rt.sale_price) : 0;
      if (!(sale > 0) || sale >= base) sale = 0;
      for (var i = 0; i < data.length; i++) {
        if (data[i].slug !== rt.slug) continue;
        data[i].price = base;
        data[i].salePrice = sale;
      }
    });
  }

  function watchForTiles(rows) {
    if (!window.MutationObserver) return;
    var seen = 0;
    var obs = new MutationObserver(function () {
      var n = document.querySelectorAll("[data-room-slug]").length;
      if (n && n !== seen) { seen = n; apply(rows); }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 10000);
  }

  function received(rows) {
    if (!rows || !rows.length) return;
    seed(rows);
    apply(rows);
    watchForTiles(rows);
  }

  /* sql/sale.sql may not have been applied yet, in which case asking for
     the sale columns is a 400. Fall back rather than leave prices stale. */
  load(WITH_SALE, function () { load(PLAIN); });
})();

/* ═══════════════════════════════════════════
   HOTEL AGAVA — live prices
   The hotel edits prices in the admin panel. Pages built from the repo
   would keep yesterday's figure until the hourly sync runs, so every
   price the guest sees is refreshed from room_types on load. Silent on
   failure: the number already in the HTML stays, and it is never wrong
   by more than one hour.

   A room can be on sale the whole time, and it can also be cheaper for a
   stretch of dates the hotel picks in the admin calendar. Both live in
   the database and check_availability already charges the reduced figure
   — this file only makes the page show what the guest will actually pay,
   with the normal price struck through beside it.

   The dated discount always carries its dates onto the card. A figure
   that applies to nine nights in November must never sit there looking
   like the everyday price: a guest arriving in December would be quoted
   something they cannot have.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";
  var CFG = window.AGAVA_CONFIG || {};
  if (!CFG.CONFIGURED || !CFG.SUPABASE_URL || !window.fetch) return;

  var WITH_SALE = "slug,base_price,sale_price,sale_active,visible";
  var PLAIN = "slug,base_price,visible";

  /* slug → { price, from, to } for the nearest upcoming dated discount,
     filled in by sql/discounts.sql. Empty until that answer lands, and
     empty forever if the function has not been applied yet. */
  var DISCOUNTS = {};
  var LAST_ROWS = null;

  function slugFromPath() {
    var m = location.pathname.match(/\/rooms\/([a-z0-9-]+)\/?$/);
    return m ? m[1] : null;
  }

  /* i18n.js may not have run yet, so the language is read from the path
     the same way it reads it, rather than from window.AGAVA_LANG */
  function lang() {
    var m = location.pathname.match(/^\/(en|ru|tr)(\/|$)/);
    return m ? m[1] : "ka";
  }

  var MONTHS = {
    ka: ["იანვარს", "თებერვალს", "მარტს", "აპრილს", "მაისს", "ივნისს",
         "ივლისს", "აგვისტოს", "სექტემბერს", "ოქტომბერს", "ნოემბერს", "დეკემბერს"],
    en: ["January", "February", "March", "April", "May", "June",
         "July", "August", "September", "October", "November", "December"],
    ru: ["января", "февраля", "марта", "апреля", "мая", "июня",
         "июля", "августа", "сентября", "октября", "ноября", "декабря"],
    tr: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
         "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
  };
  var DISCOUNT_WORD = { ka: "ფასდაკლება", en: "Discount", ru: "Скидка", tr: "İndirim" };

  /* "5–13 ნოემბერს", or "28 ნოემბერს – 3 დეკემბერს" across a month end.
     All four languages put the day before the month, so one shape fits. */
  function rangeText(from, to) {
    var M = MONTHS[lang()];
    var a = String(from).split("-"), b = String(to).split("-");
    var ad = Number(a[2]), am = Number(a[1]) - 1;
    var bd = Number(b[2]), bm = Number(b[1]) - 1;
    if (am === bm) {
      return (ad === bd ? String(ad) : ad + "–" + bd) + " " + M[am];
    }
    return ad + " " + M[am] + " – " + bd + " " + M[bm];
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

  /* js/main.js draws the homepage grid from rooms-data, which now carries
     salePrice, and scripts/applyprices.js writes the same markup into the
     static pages — so the figure often arrives already wrapped. Reduce it
     back to the plain price before rewriting, or the sale gets wrapped a
     second time and the card shows the price three times over. */
  var SALE_MARKUP = /<s[^>]*class="[^"]*price-was[^"]*"[^>]*>(\d+)<\/s>\s*<span[^>]*class="[^"]*price-now[^"]*"[^>]*>\d+<\/span>/g;

  function plain(html) {
    return html.replace(SALE_MARKUP, "$1");
  }

  function pair(base, sale) {
    return sale
      ? '<s class="price-was">' + base + '</s> <span class="price-now">' + sale + "</span>"
      : String(base);
  }

  function money(el, base, sale) {
    if (!el) return;
    if (!el.hasAttribute("data-price-tpl")) el.setAttribute("data-price-tpl", plain(el.innerHTML));
    var tpl = el.getAttribute("data-price-tpl");
    if (!FIRST_NUMBER.test(tpl)) return;
    el.innerHTML = tpl.replace(FIRST_NUMBER, "$1$2" + pair(base, sale));
  }

  /* Untagged markup (the homepage grid main.js draws) still goes through
     money(); anything that already holds a data-price span is left to it. */
  function untagged(el) {
    return el && !el.querySelector("[data-price]") ? el : null;
  }

  /* What the card has to say about one room: the figure to strike through
     and the figure to put in gold. A dated discount wins over a standing
     sale when it is the lower of the two, because that is what
     check_availability will charge on those nights. */
  function figures(rt) {
    var base = Number(rt.base_price);
    var sale = rt.sale_active && rt.sale_price != null ? Number(rt.sale_price) : 0;
    if (!(sale > 0) || sale >= base) sale = 0;
    var d = DISCOUNTS[rt.slug];
    var dated = d && d.price > 0 && d.price < (sale || base) ? d : null;
    return { base: base, sale: sale, show: dated ? dated.price : sale, dated: dated };
  }

  function drop(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  /* "−25%" over the photo. Only for a dated discount: every room carries a
     standing sale right now, and a red flash on all eight of them would
     say nothing. This one means "these dates only". */
  function saleBadge(tile, f) {
    var media = tile.querySelector(".room-tile__media");
    var badge = tile.querySelector(".room-tile__badge--sale");
    if (!f.dated || !media || !f.base) { drop(badge); return; }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "room-tile__badge room-tile__badge--sale";
      media.appendChild(badge);
    }
    badge.textContent = "−" + Math.round((1 - f.show / f.base) * 100) + "%";
  }

  /* The dates, directly under the price. before === the element the note
     goes after, so the room page can reuse it under its big figure. */
  function dateNote(after, f) {
    if (!after || !after.parentNode) return;
    var note = after.nextElementSibling;
    if (note && note.className !== "price-dates") note = null;
    if (!f.dated) { drop(note); return; }
    if (!note) {
      note = document.createElement("p");
      note.className = "price-dates";
      after.parentNode.insertBefore(note, after.nextSibling);
    }
    note.textContent = DISCOUNT_WORD[lang()] + " " + rangeText(f.dated.from, f.dated.to);
  }

  function apply(rows) {
    if (!rows || !rows.length) return;
    var own = slugFromPath();
    var paid = [];
    rows.forEach(function (rt) {
      var f = figures(rt);
      if (!f.base) return;
      /* the "from X ₾" range stays the everyday one — a nine-night offer
         must not go on record as what the hotel costs */
      if (rt.visible !== false) paid.push(f.sale || f.base);

      /* room cards on /rooms/ and the homepage grid */
      var tile = document.querySelector('[data-room-slug="' + rt.slug + '"]');
      if (tile) {
        money(untagged(tile.querySelector(".room-tile__price")), f.base, f.show);
        tile.classList.toggle("is-on-sale", !!f.show);
        saleBadge(tile, f);
        dateNote(tile.querySelector(".room-tile__meta"), f);
        tile.setAttribute("data-prices-applied", "1");
        if (rt.visible === false) tile.style.display = "none";
      }
      /* every figure tagged by slug holds nothing but the figure, as
         scripts/applyprices.js writes it — so it is rewritten whole.

         A dated discount goes only where its dates go, and they are put
         beside the card price and the room's own headline. The same
         figure dropped into a landing page's prose — "სტანდარტული ღირს
         100 ₾" — or into the comparison table would read as the everyday
         price to someone arriving in December, so those keep the
         standing one. */
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-price="' + rt.slug + '"]'),
        function (el) {
          var dated = el.closest && el.closest(".room-tile__price, .rdp-price");
          el.innerHTML = pair(f.base, dated ? f.show : f.sale);
        }
      );
      /* the headline figure on this room's own page */
      if (own === rt.slug) {
        var rdp = document.querySelector(".rdp-price");
        money(untagged(rdp), f.base, f.show);
        dateNote(rdp, f);
      }
    });
    if (paid.length) {
      Array.prototype.forEach.call(document.querySelectorAll("[data-price-range]"), function (el) {
        el.textContent = Math.min.apply(null, paid) + "–" + Math.max.apply(null, paid);
      });
    }
  }

  function headers() {
    return { apikey: CFG.SUPABASE_ANON_KEY, Authorization: "Bearer " + CFG.SUPABASE_ANON_KEY };
  }

  function load(columns, onFail) {
    return fetch(CFG.SUPABASE_URL + "/rest/v1/room_types?select=" + columns, { headers: headers() })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(received)
      .catch(function () { if (onFail) onFail(); });
  }

  /* price_overrides is closed to anon and should stay closed — the whole
     price calendar is nobody's business. sql/discounts.sql opens exactly
     one window onto it: the nearest upcoming discount per room, dates and
     all. Quiet when that file has not been applied yet; the page then
     shows the standing prices, as it did before. */
  function loadDiscounts() {
    var h = headers();
    h["Content-Type"] = "application/json";
    return fetch(CFG.SUPABASE_URL + "/rest/v1/rpc/public_discounts", {
      method: "POST", headers: h, body: "{}"
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (rows) {
        if (!rows || !rows.length) return;
        rows.forEach(function (r) {
          var p = Number(r.price_sale);
          if (p > 0 && r.date_from) {
            DISCOUNTS[r.room_slug] = { price: p, from: r.date_from, to: r.date_to };
          }
        });
        if (LAST_ROWS) { seed(LAST_ROWS); apply(LAST_ROWS); }
      })
      .catch(function () {});
  }

  /* The room grid on the homepage is not in the HTML: js/main.js draws it
     from window.AGAVA_ROOMS_DATA, and that can happen either side of this
     fetch. So write the figures back into that array for the tiles drawn
     after us, and watch briefly for tiles drawn before the data lands. */
  function seed(rows) {
    var data = window.AGAVA_ROOMS_DATA;
    if (!data || !data.length) return;
    rows.forEach(function (rt) {
      var f = figures(rt);
      if (!f.base) return;
      for (var i = 0; i < data.length; i++) {
        if (data[i].slug !== rt.slug) continue;
        data[i].price = f.base;
        data[i].salePrice = f.show;
      }
    });
  }

  /* main.js redraws the whole grid once the photos land, which throws away
     the badge and the dates along with the tiles that carried them. New
     tiles arrive without the marker, so that redraw is caught too, and a
     tile we have already finished never starts the loop again. */
  function watchForTiles(rows) {
    if (!window.MutationObserver) return;
    var seen = 0;
    var obs = new MutationObserver(function () {
      var tiles = document.querySelectorAll("[data-room-slug]");
      if (!tiles.length) return;
      if (tiles.length !== seen || !tiles[0].hasAttribute("data-prices-applied")) {
        seen = tiles.length;
        apply(rows);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 10000);
  }

  function received(rows) {
    if (!rows || !rows.length) return;
    LAST_ROWS = rows;
    seed(rows);
    apply(rows);
    watchForTiles(rows);
  }

  /* sql/sale.sql may not have been applied yet, in which case asking for
     the sale columns is a 400. Fall back rather than leave prices stale. */
  load(WITH_SALE, function () { load(PLAIN); });
  loadDiscounts();
})();

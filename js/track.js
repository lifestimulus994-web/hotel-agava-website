/* ═══════════════════════════════════════════
   HOTEL AGAVA — GA4 conversion events

   One delegated listener covers every tel: and wa.me link on the site
   (168 of them at the time of writing) without touching the markup, so
   new links are tracked automatically as pages are added.

   booking.js calls agavaTrackBooking after the database response, because only
   it knows whether the booking actually succeeded.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  /* gtag is defined synchronously by js/ga.js, which loads first (defer
     preserves order). Guard anyway: an ad blocker can remove it entirely,
     and a missing analytics tag must never break a phone call. */
  function track(name, params) {
    if (typeof window.gtag !== "function") return;
    try {
      window.gtag("event", name, params || {});
    } catch (err) { /* analytics must stay silent */ }
  }
  window.agavaTrack = track;

  // Use the saved total (including breakfast and calendar prices) in both forms.
  // Booking references are only used locally for deduplication, never sent to GA.
  var sentBookings = Object.create(null);
  window.agavaTrackBooking = function (booking, context) {
    if (!booking || typeof booking.booking_number !== "string" || !booking.booking_number.trim()) return;
    context = context || {};
    var id = booking.booking_number;
    var key = "agava:tracked-booking:" + id;
    if (sentBookings[id]) return;
    try { if (sessionStorage.getItem(key)) return; } catch (err) {}
    if (typeof window.gtag !== "function") return;
    var params = {
      method: context.method === "quick" ? "quick" : "wizard",
      room_slug: context.room_slug,
      nights: Number(booking.nights),
      guests: Number(context.guests),
      page_path: window.location.pathname,
      page_lang: lang()
    };
    if (booking.total_price !== null && booking.total_price !== undefined &&
        booking.total_price !== "" && isFinite(Number(booking.total_price)) && Number(booking.total_price) >= 0) {
      params.value = Number(booking.total_price);
      params.currency = "GEL";
    }
    if (!isFinite(params.nights) || params.nights < 1) delete params.nights;
    if (!isFinite(params.guests) || params.guests < 1) delete params.guests;
    // Explicit allowlist above excludes guest contact data and the manage token.
    try {
      window.gtag("event", "booking_submit", params);
      sentBookings[id] = true;
      try { sessionStorage.setItem(key, "1"); } catch (err) {}
    } catch (err) { /* tracking failure must never hide a saved booking */ }
  };


  function lang() {
    var m = window.location.pathname.match(/^\/(en|ru|tr)(\/|$)/);
    return m ? m[1] : "ka";
  }

  /* capture phase: fires even if something else stops propagation */
  document.addEventListener("click", function (e) {
    var el = e.target;
    if (!el || !el.closest) return;
    var a = el.closest("a[href]");
    if (!a) return;

    var href = a.getAttribute("href") || "";
    var common = { page_path: window.location.pathname, page_lang: lang() };

    if (href.indexOf("tel:") === 0) {
      common.phone_number = href.replace("tel:", "");
      track("phone_click", common);
    } else if (href.indexOf("wa.me") > -1) {
      /* strip the prefilled ?text= — it is long, URL-encoded and identical
         per button, so it would only bloat the GA4 report */
      common.link_url = href.split("?")[0];
      common.prefilled = href.indexOf("?text=") > -1;
      track("whatsapp_click", common);
    }
  }, true);
})();

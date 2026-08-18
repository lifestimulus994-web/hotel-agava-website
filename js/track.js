/* ═══════════════════════════════════════════
   HOTEL AGAVA — GA4 conversion events

   One delegated listener covers every tel: and wa.me link on the site
   (168 of them at the time of writing) without touching the markup, so
   new links are tracked automatically as pages are added.

   booking.js calls agavaTrack("booking_submit", …) itself, because only
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

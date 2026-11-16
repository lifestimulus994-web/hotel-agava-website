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
})();

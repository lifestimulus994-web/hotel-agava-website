/* Google Analytics 4 — Hotel Agava */
(function () {
  /* One gtag.js load, one config call per property — the standard way to
     send the same hits to several GA4 properties. */
  var IDS = ["G-GR7R326P6F", "G-79172LYKGT", "G-1580LL6MH4"];
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + IDS[0];
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag("js", new Date());
  IDS.forEach(function (id) { gtag("config", id); });
})();

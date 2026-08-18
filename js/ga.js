/* Google Analytics 4 — Hotel Agava */
(function () {
  /* Array kept so a second property can be added back with one entry —
     gtag.js loads once and every id in here gets its own config call. */
  var IDS = ["G-79172LYKGT"];
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + IDS[0];
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag("js", new Date());
  IDS.forEach(function (id) { gtag("config", id); });
})();

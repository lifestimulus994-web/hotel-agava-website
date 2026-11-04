/* Shared by home, room, service and generated blog pages. */
(function () {
  "use strict";
  var header = document.querySelector(".navbar__inner");
  var menu = header && header.querySelector(".navbar__nav");
  if (!menu) return;
  menu.id = menu.id || "navMenu";
  var burger = header.querySelector(".navbar__burger");
  if (!burger) {
    burger = document.createElement("button");
    burger.className = "navbar__burger";
    burger.id = "burger";
    burger.innerHTML = "<span></span><span></span><span></span>";
    header.appendChild(burger);
  }
  burger.type = "button";
  burger.setAttribute("aria-controls", menu.id);
  var labels = {
    ka: ["მენიუს გახსნა", "მენიუს დახურვა"],
    en: ["Open menu", "Close menu"],
    ru: ["Открыть меню", "Закрыть меню"],
    tr: ["Menüyü aç", "Menüyü kapat"]
  };
  function setOpen(open) {
    menu.classList.toggle("is-open", open);
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    var text = labels[document.documentElement.lang] || labels.ka;
    burger.setAttribute("aria-label", text[open ? 1 : 0]);
  }
  setOpen(false);
  burger.addEventListener("click", function () {
    setOpen(burger.getAttribute("aria-expanded") !== "true");
  });
  menu.addEventListener("click", function (event) {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      burger.focus();
    }
  });
  window.matchMedia("(min-width: 821px)").addEventListener("change", function (event) {
    if (event.matches) setOpen(false);
  });
})();

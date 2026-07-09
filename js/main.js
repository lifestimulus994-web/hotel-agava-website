/* ═══════════════════════════════════════════
   HOTEL AGAVA — interactions & motion
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─── Navbar: solid on scroll ─── */
  var navbar = document.getElementById("navbar");
  function onScrollNav() {
    navbar.classList.toggle("is-solid", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ─── Mobile menu ─── */
  var burger = document.getElementById("burger");
  var navMenu = document.getElementById("navMenu");
  burger.addEventListener("click", function () {
    var open = navMenu.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "მენიუს დახურვა" : "მენიუს გახსნა");
  });
  navMenu.addEventListener("click", function (e) {
    if (e.target.classList.contains("navbar__link")) {
      navMenu.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    }
  });

  /* ─── Active nav link on scroll ─── */
  var sections = ["hero", "rooms", "services", "gallery", "contact"];
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".navbar__link"));
  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      navLinks.forEach(function (link) {
        link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
      });
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });

  /* ═══════════ ROOMS DATA (real prices) ═══════════ */
  var ROOMS = [
    {
      name: "სტანდარტული ოთახი — 2 სტუმარზე",
      badge: "სტანდარტი",
      price: 120,
      images: [
        "assets/room-standard-2.jpg",
        "assets/room-standard-3.jpg",
        "assets/room-standard-4.jpg",
        "assets/room-standard-5.jpg",
        "assets/room-standard-1.jpg"
      ],
      alt: "სტანდარტული ოთახი ცის ჭერით",
      count: "7 ოთახი",
      specs: [
        { icon: "bed", text: "1 საწოლი" },
        { icon: "guests", text: "2 სტუმარი" },
        { icon: "size", text: "22 მ²" }
      ]
    },
    {
      name: "ლუქსი — 2 სტუმარზე",
      badge: "ლუქსი",
      price: 120,
      images: [
        "assets/room-lux-1.jpg",
        "assets/room-lux-2.jpg",
        "assets/room-lux-3.jpg",
        "assets/room-lux-4.jpg"
      ],
      alt: "ლუქსი ოთახი ბაროკოს სტილში, ცის ჭერით",
      count: "5 ოთახი",
      specs: [
        { icon: "bed", text: "1 King საწოლი" },
        { icon: "guests", text: "2 სტუმარი" },
        { icon: "size", text: "28 მ²" }
      ]
    },
    {
      name: "სუპერლუქსი — 2 სტუმარზე",
      badge: "სუპერლუქსი",
      price: 120,
      images: [
        "assets/room-superlux-1.jpg",
        "assets/room-superlux-2.jpg",
        "assets/room-superlux-3.jpg"
      ],
      alt: "სუპერლუქსი ბაროკოს სტილის ინტერიერით",
      count: "1 ნომერი",
      specs: [
        { icon: "bed", text: "1 King საწოლი" },
        { icon: "guests", text: "2 სტუმარი" },
        { icon: "size", text: "36 მ²" }
      ]
    },
    {
      name: "საოჯახო ოთახი — 3 სტუმარზე",
      badge: "საოჯახო",
      price: 150,
      images: [
        "assets/room-family3-2.jpg",
        "assets/room-family3-3.jpg",
        "assets/room-family3-4.jpg",
        "assets/room-family3-1.jpg"
      ],
      alt: "საოჯახო ოთახი სამ სტუმარზე",
      count: "3 ოთახი",
      specs: [
        { icon: "bed", text: "2 საწოლი" },
        { icon: "guests", text: "3 სტუმარი" },
        { icon: "size", text: "32 მ²" }
      ]
    },
    {
      name: "საოჯახო ოთახი — 4 სტუმარზე",
      badge: "საოჯახო",
      price: 200,
      images: [
        "assets/room-family4-1.jpg"
      ],
      alt: "საოჯახო ოთახი ოთხ სტუმარზე",
      count: "2 ოთახი",
      specs: [
        { icon: "bed", text: "2 საწოლი" },
        { icon: "guests", text: "4 სტუმარი" },
        { icon: "size", text: "38 მ²" }
      ]
    },
    {
      name: "ორ ოთახიანი ლუქსი",
      badge: "ლუქსი",
      price: 200,
      images: [
        "assets/room-twobedlux-1.jpg",
        "assets/room-twobedlux-2.jpg",
        "assets/room-twobedlux-3.jpg",
        "assets/room-twobedlux-4.jpg"
      ],
      alt: "ორ ოთახიანი ლუქსი ცის ჭერით",
      count: "1 ნომერი",
      specs: [
        { icon: "bed", text: "2 ოთახი, 3 საწოლი" },
        { icon: "guests", text: "4 სტუმარი" },
        { icon: "size", text: "45 მ²" }
      ]
    },
    {
      name: "სუპერ ლუქსი ჯაკუზით",
      badge: "VIP ლუქსი",
      price: 300,
      seasonal: true,
      images: [
        "assets/room-jacuzzi-3.jpg",
        "assets/room-jacuzzi-1.jpg",
        "assets/room-jacuzzi-2.jpg",
        "assets/room-jacuzzi-4.jpg"
      ],
      alt: "სუპერ ლუქსი ჯაკუზით, ოქროსფერი ინტერიერი",
      count: "1 ნომერი",
      specs: [
        { icon: "bed", text: "1 King საწოლი" },
        { icon: "guests", text: "2 სტუმარი" },
        { icon: "jacuzzi", text: "ჯაკუზი" }
      ]
    }
  ];

  var SPEC_ICONS = {
    size:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M21 3L3 21M21 3h-6M21 3v6M3 21h6M3 21v-6"/></svg>',
    bed:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 18v-6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 18h20v3H2z"/></svg>',
    guests:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    jacuzzi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 12h16a1 1 0 0 1 1 1 7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7 1 1 0 0 1 1-1z"/><path d="M8 8c0-1 .5-1.5.5-2.5S8 4 8 3M12 8c0-1 .5-1.5.5-2.5S12 4 12 3M16 8c0-1 .5-1.5.5-2.5S16 4 16 3"/></svg>'
  };

  /* ─── Render room grid (Royelle-style tiles) ─── */
  var roomsGrid = document.getElementById("roomsGrid");

  var ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

  function sliderHTML(room) {
    var multi = room.images.length > 1;
    var html = '<div class="room-slider__track">' +
      room.images.map(function (src, idx) {
        return '<img src="' + src + '" alt="' + room.alt + '"' +
          (idx === 0 ? "" : ' loading="lazy" decoding="async"') +
          ' class="room-slider__img' + (idx === 0 ? " is-active" : "") + '">';
      }).join("") +
      "</div>";
    if (multi) {
      html +=
        '<button type="button" class="room-slider__arrow room-slider__arrow--prev" data-dir="-1" aria-label="წინა ფოტო">' + ARROW_SVG + "</button>" +
        '<button type="button" class="room-slider__arrow room-slider__arrow--next" data-dir="1" aria-label="შემდეგი ფოტო">' + ARROW_SVG + "</button>" +
        '<div class="room-slider__dots">' +
          room.images.map(function (_, idx) {
            return '<button type="button" class="room-slider__dot' + (idx === 0 ? " is-active" : "") +
              '" data-idx="' + idx + '" aria-label="ფოტო ' + (idx + 1) + '"></button>';
          }).join("") +
        "</div>";
    }
    return html;
  }

  function initSlider(media, total) {
    if (total < 2) return;
    var imgs = media.querySelectorAll(".room-slider__img");
    var dots = media.querySelectorAll(".room-slider__dot");
    var current = 0;

    function goTo(idx) {
      idx = (idx + total) % total;
      if (idx === current) return;
      imgs[current].classList.remove("is-active");
      dots[current].classList.remove("is-active");
      imgs[idx].classList.add("is-active");
      dots[idx].classList.add("is-active");
      current = idx;
    }

    media.addEventListener("click", function (e) {
      var arrow = e.target.closest(".room-slider__arrow");
      if (arrow) { goTo(current + parseInt(arrow.getAttribute("data-dir"), 10)); return; }
      var dot = e.target.closest(".room-slider__dot");
      if (dot) goTo(parseInt(dot.getAttribute("data-idx"), 10));
    });

    /* swipe */
    var startX = null;
    media.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });
    media.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });
  }

  ROOMS.forEach(function (room, i) {
    var tile = document.createElement("article");
    tile.className = "room-tile reveal";
    if (!prefersReducedMotion) tile.style.setProperty("--d", (i % 3) * 0.08 + "s");
    tile.innerHTML =
      '<div class="room-tile__media room-slider">' +
        sliderHTML(room) +
        '<span class="room-tile__badge">' + room.badge + "</span>" +
        (room.seasonal ? '<span class="room-tile__badge room-tile__badge--season">სეზონური</span>' : "") +
      "</div>" +
      '<div class="room-tile__body">' +
        '<div class="room-tile__meta">' +
          '<p class="room-tile__price">' + room.price + ' ₾<span>/ღამე</span></p>' +
          '<span class="room-tile__count">' + room.count + "</span>" +
        "</div>" +
        '<h3 class="room-tile__title">' + room.name + "</h3>" +
        '<ul class="room-tile__specs">' +
          room.specs.map(function (s) {
            return "<li>" + (SPEC_ICONS[s.icon] || "") + "<span>" + s.text + "</span></li>";
          }).join("") +
        "</ul>" +
        '<button class="btn btn--gold room-tile__btn" data-room="' + room.name + '">დაჯავშნა</button>' +
      "</div>";
    roomsGrid.appendChild(tile);
    initSlider(tile.querySelector(".room-slider"), room.images.length);
  });

  /* CTA tile */
  var ctaTile = document.createElement("article");
  ctaTile.className = "room-tile room-tile--cta reveal";
  ctaTile.innerHTML =
    '<img src="assets/logo.png" alt="" aria-hidden="true">' +
    "<h3>ვერ იპოვეთ სასურველი ოთახი?</h3>" +
    "<p>დაგვიკავშირდით და დაგეხმარებით საუკეთესო არჩევანში — შესვლა 13:00, გასვლა 12:00.</p>" +
    '<button class="btn btn--gold" data-open-booking>დაგვიკავშირდით</button>';
  roomsGrid.appendChild(ctaTile);

  /* ─── Reveal on scroll (whileInView, once:true) ─── */
  var revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ─── Hero parallax (transform-only, rAF-throttled) ─── */
  var heroBgImg = document.querySelector(".hero__bg img");
  if (heroBgImg && !prefersReducedMotion) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < window.innerHeight) {
          heroBgImg.style.transform = "translateY(" + y * 0.22 + "px)";
        }
        ticking = false;
      });
    }, { passive: true });
  }

  /* ─── Animated counters ─── */
  var counters = document.querySelectorAll(".stat__num");
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimal") || "0", 10);
    var suffix = el.getAttribute("data-suffix") || "";
    if (prefersReducedMotion) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }
    var duration = 1600;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 4); /* easeOutQuart */
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  counters.forEach(function (el) { counterObserver.observe(el); });

  /* ─── Review bars fill ─── */
  var reviewBars = document.querySelectorAll(".review-bar__fill");
  if (prefersReducedMotion) {
    reviewBars.forEach(function (el) { el.classList.add("is-filled"); });
  } else {
    var barObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-filled");
          barObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    reviewBars.forEach(function (el) { barObserver.observe(el); });
  }

  /* ═══════════ BOOKING MODAL ═══════════ */
  var modal = document.getElementById("bookingModal");
  var roomSelect = document.getElementById("bfRoom");
  var lastFocused = null;

  ROOMS.forEach(function (room) {
    var opt = document.createElement("option");
    opt.value = room.name;
    opt.textContent = room.name + " — " + room.price + " ₾/ღამე";
    roomSelect.appendChild(opt);
  });

  function openModal(presetRoom) {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    if (presetRoom) roomSelect.value = presetRoom;
    var first = modal.querySelector("input");
    if (first) first.focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener("click", function (e) {
    var openBtn = e.target.closest("[data-open-booking]");
    if (openBtn) { openModal(); return; }
    var roomBtn = e.target.closest("[data-room]");
    if (roomBtn) { openModal(roomBtn.getAttribute("data-room")); return; }
    if (e.target.closest("[data-close-booking]")) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  /* focus trap */
  modal.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var focusables = modal.querySelectorAll("button, input, select, textarea, a[href]");
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  /* date min = today */
  var today = new Date().toISOString().split("T")[0];
  document.getElementById("bfIn").min = today;
  document.getElementById("bfOut").min = today;

  /* ─── Demo form handling ─── */
  function handleForm(formId, statusId, okMsg) {
    var form = document.getElementById(formId);
    var status = document.getElementById(statusId);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var invalid = false;
      form.querySelectorAll("[required]").forEach(function (input) {
        var bad = !input.value.trim();
        input.classList.toggle("is-invalid", bad);
        if (bad) invalid = true;
      });
      if (invalid) {
        status.textContent = "გთხოვთ, შეავსოთ სავალდებულო ველები.";
        status.className = "form-status is-error";
        var firstBad = form.querySelector(".is-invalid");
        if (firstBad) firstBad.focus();
        return;
      }
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      status.textContent = "იგზავნება…";
      status.className = "form-status";
      setTimeout(function () {
        btn.disabled = false;
        form.reset();
        status.textContent = okMsg;
        status.className = "form-status is-ok";
      }, 900);
    });
  }
  handleForm("bookingForm", "bfStatus", "მოთხოვნა მიღებულია! ჩვენ მალე დაგიკავშირდებით. (დემო ვერსია)");
  handleForm("contactForm", "cfStatus", "შეტყობინება გაგზავნილია! გმადლობთ. (დემო ვერსია)");

  /* ─── Footer year ─── */
  document.getElementById("year").textContent = new Date().getFullYear();
})();

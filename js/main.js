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

  /* ═══════════ SECTION IMAGES (about / rooms strip / gallery) ═══════════
     Source of truth: Supabase (js/content.js → AGAVA_STORE).
     Fallback per-section: DEFAULT_CONTENT (used before load, offline, or empty). */
  var DEFAULT_CONTENT = {
    about: [
      { url: "assets/exterior-2.jpg", alt: "სასტუმრო აგავას ნათელი ლობი", caption: "" },
      { url: "assets/exterior-1.jpg", alt: "სასტუმრო აგავას შენობა ღამით", caption: "" }
    ],
    rooms: [
      { url: "assets/room-jacuzzi-1.jpg", alt: "ოთახის ლუქსური ინტერიერი", caption: "" },
      { url: "assets/room-lux-2.jpg", alt: "ლუქსი ცის ჭერით", caption: "" },
      { url: "assets/room-standard-2.jpg", alt: "სტანდარტული ოთახი", caption: "" }
    ],
    gallery_breakfast: [
      { url: "assets/room-lux-2.jpg", alt: "საუზმე", caption: "საუზმე" }
    ],
    gallery_hotel: [
      { url: "assets/room-superlux-2.jpg", alt: "ლუქსი", caption: "სასტუმრო" },
      { url: "assets/exterior-1.jpg", alt: "სასტუმრო", caption: "ჩვენი შენობა" }
    ]
  };

  function sectionItems(key) {
    var store = window.AGAVA_STORE;
    /* once the DB fetch succeeded it is authoritative — an empty section
       means the client cleared it, so DON'T fall back to defaults. */
    if (store && store.ok) return (store.sections && store.sections[key]) || [];
    return DEFAULT_CONTENT[key] || [];
  }

  function renderContent() {
    var aboutHost = document.getElementById("aboutPhotos");
    if (aboutHost) {
      aboutHost.innerHTML = sectionItems("about").map(function (item, index) {
        return '<figure class="about__photo' + (index === 0 ? " about__photo--1" : " about__photo--2") + '"><img src="' + item.url + '" alt="' + (item.alt || "") + '" loading="lazy"></figure>';
      }).join("");
    }

    function renderGallery(hostId, items) {
      var host = document.getElementById(hostId);
      if (!host) return;
      var group = host.closest ? host.closest(".gallery__group") : null;
      if (!items || !items.length) {
        host.innerHTML = "";
        if (group) group.style.display = "none";   /* no lonely heading */
        return;
      }
      if (group) group.style.display = "";
      host.innerHTML = items.map(function (item, index) {
        return '<figure class="gallery__item' + (index % 2 === 0 ? " gallery__item--wide" : "") + ' reveal is-visible"><img src="' + item.url + '" alt="' + (item.alt || "") + '" loading="lazy"><figcaption>' + (item.caption || "") + '</figcaption></figure>';
      }).join("");
    }

    renderGallery("galleryBreakfast", sectionItems("gallery_breakfast"));
    renderGallery("galleryHotel", sectionItems("gallery_hotel"));
  }

  renderContent();

  /* ═══════════ ROOMS DATA (real prices) ═══════════ */
  var ROOMS = [
    {
      slug: "standard",
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
      slug: "lux",
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
      slug: "superlux",
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
      slug: "family3",
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
      slug: "family4",
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
      slug: "twobedlux",
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
        { icon: "guests", text: "5 სტუმარი" },
        { icon: "size", text: "45 მ²" }
      ]
    },
    {
      slug: "jacuzzi-suite",
      name: "ლუქსი ჯაკუზით",
      badge: "ლუქსი",
      price: 300,
      images: [
        "assets/room-jacuzzi-suite-1.jpg",
        "assets/room-jacuzzi-suite-2.jpg",
        "assets/room-jacuzzi-suite-3.jpg"
      ],
      alt: "ლუქსი ჯაკუზით ქალაქის ხედით",
      count: "1 ნომერი",
      specs: [
        { icon: "bed", text: "1 დიდი ორმაგი საწოლი" },
        { icon: "guests", text: "2 სტუმარი" },
        { icon: "size", text: "30 მ²" },
        { icon: "jacuzzi", text: "ჯაკუზი" }
      ]
    },
    {
      slug: "jacuzzi",
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

  window.AGAVA_ROOMS = ROOMS; /* booking.js consumes */

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

  /* apply DB room-card images (AGAVA_STORE) onto ROOMS[].images before build */
  function applyRoomImages() {
    var store = window.AGAVA_STORE;
    if (!store || !store.roomImages) return;
    ROOMS.forEach(function (room) {
      var rows = store.roomImages[room.slug];
      if (rows && rows.length) {
        room.images = rows.map(function (r) { return r.url; });
        if (rows[0].alt) room.alt = rows[0].alt;
      }
    });
  }

  function buildRoomGrid(skipAnim) {
    roomsGrid.innerHTML = "";
    ROOMS.forEach(function (room, i) {
      var tile = document.createElement("article");
      tile.className = "room-tile reveal" + (skipAnim ? " is-visible" : "");
      if (!prefersReducedMotion && !skipAnim) tile.style.setProperty("--d", (i % 3) * 0.08 + "s");
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
          '<div class="room-tile__actions">' +
            '<button class="btn btn--dark" data-view-room="' + room.slug + '">ნახვა</button>' +
            '<button class="btn btn--gold" data-room="' + room.slug + '">დაჯავშნა</button>' +
          "</div>" +
        "</div>";
      tile.setAttribute("data-room-slug", room.slug);
      roomsGrid.appendChild(tile);
      initSlider(tile.querySelector(".room-slider"), room.images.length);
    });

    /* CTA tile */
    var ctaTile = document.createElement("article");
    ctaTile.className = "room-tile room-tile--cta reveal" + (skipAnim ? " is-visible" : "");
    ctaTile.innerHTML =
      '<img src="assets/logo.png" alt="" aria-hidden="true">' +
      "<h3>ვერ იპოვეთ სასურველი ოთახი?</h3>" +
      "<p>დაგვიკავშირდით და დაგეხმარებით საუკეთესო არჩევანში — შესვლა 13:00, გასვლა 12:00.</p>" +
      '<button class="btn btn--gold" data-open-booking>დაგვიკავშირდით</button>';
    roomsGrid.appendChild(ctaTile);
  }

  buildRoomGrid(false);

  /* Load DB-backed images, then re-render sections + room cards */
  if (window.AGAVA_STORE && window.AGAVA_STORE.load) {
    window.AGAVA_STORE.load().then(function () {
      renderContent();
      applyRoomImages();
      buildRoomGrid(true);
    });
  }

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

  /* Booking wizard & modals live in js/booking.js */

  /* ─── Footer year ─── */
  document.getElementById("year").textContent = new Date().getFullYear();
})();

/* ═══════════════════════════════════════════
   HOTEL AGAVA — services data (single source)
   Used by scripts/build-services.mjs to prerender
   /services/<slug>/ landing pages in every language.
   title = dict key (translated by i18n); desc = SEO prose per lang.
   ═══════════════════════════════════════════ */
(function () {
  window.AGAVA_SERVICES_DATA = [
    {
      slug: "wifi",
      title: "უფასო Wi-Fi",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>',
      desc: {
        ka: "უფასო მაღალსიჩქარიანი Wi-Fi სასტუმრო აგავას მთელ ტერიტორიაზე — ოთახებში, ლობიში და ეზოში. დარჩით ონლაინ თბილისში ყოფნისას.",
        en: "Free high-speed Wi-Fi throughout Hotel Agava — in the rooms, lobby and courtyard. Stay connected during your stay in Tbilisi.",
        ru: "Бесплатный высокоскоростной Wi-Fi на всей территории отеля Агава — в номерах, лобби и во дворе. Оставайтесь на связи в Тбилиси.",
        tr: "Otel Agava'nın her yerinde ücretsiz yüksek hızlı Wi-Fi — odalarda, lobide ve avluda. Tiflis'te bağlantıda kalın."
      }
    },
    {
      slug: "parking",
      title: "დაცული პარკინგი",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>',
      desc: {
        ka: "უფასო და დაცული პარკინგი სასტუმრო აგავას ეზოში — თბილისში დასვენებისას თქვენი ავტომობილი უსაფრთხოდაა. ადგილი ყველა სტუმრისთვის.",
        en: "Free, secure parking in Hotel Agava's courtyard — your car is safe while you stay in Tbilisi. Space for every guest.",
        ru: "Бесплатная охраняемая парковка во дворе отеля Агава — ваш автомобиль в безопасности во время отдыха в Тбилиси. Место для каждого гостя.",
        tr: "Otel Agava'nın avlusunda ücretsiz ve güvenli otopark — Tiflis'te konaklarken aracınız güvende. Her misafir için yer."
      }
    },
    {
      slug: "breakfast",
      title: "საუზმე",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 11h18a1 1 0 0 1 1 1 8 8 0 0 1-8 8H10a8 8 0 0 1-8-8 1 1 0 0 1 1-1z"/><path d="M7 11V7a2 2 0 0 1 4 0"/><path d="M13 11V6a2 2 0 0 1 4 0v5"/></svg>',
      desc: {
        ka: "გემრიელი საუზმე ყოველ დილით სასტუმრო აგავაში — მრავალფეროვანი მენიუთი. დღე დაიწყეთ ენერგიულად თბილისში.",
        en: "Delicious breakfast every morning at Hotel Agava — with a varied menu. Start your day right in Tbilisi.",
        ru: "Вкусный завтрак каждое утро в отеле Агава — с разнообразным меню. Начните день правильно в Тбилиси.",
        tr: "Otel Agava'da her sabah zengin menülü lezzetli kahvaltı. Tiflis'te güne enerjik başlayın."
      }
    },
    {
      slug: "transfer",
      title: "ტრანსფერი",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
      desc: {
        ka: "აეროპორტის ტრანსფერი სასტუმრო აგავადან და აეროპორტამდე — წინასწარი მოთხოვნით. კომფორტული ჩამოსვლა და გამგზავრება თბილისში.",
        en: "Airport transfer to and from Hotel Agava — on prior request. A comfortable arrival and departure in Tbilisi.",
        ru: "Трансфер из/в аэропорт отеля Агава — по предварительному запросу. Комфортное прибытие и отъезд в Тбилиси.",
        tr: "Otel Agava'ya havalimanı transferi — ön talep üzerine. Tiflis'te konforlu bir varış ve ayrılış."
      }
    },
    {
      slug: "reception",
      title: "24/7 მიღება",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
      desc: {
        ka: "24/7 რეცეფცია სასტუმრო აგავაში — მიგიღებთ ნებისმიერ საათზე. დახმარება მთელი დღე-ღამის განმავლობაში, ნებისმიერ დროს ჩამოსვლისას.",
        en: "24/7 reception at Hotel Agava — we welcome you at any hour. Assistance around the clock, whenever you arrive.",
        ru: "Круглосуточная стойка регистрации в отеле Агава — мы встретим вас в любое время. Помощь 24/7, когда бы вы ни приехали.",
        tr: "Otel Agava'da 24/7 resepsiyon — sizi her saat karşılıyoruz. Ne zaman gelirseniz gelin, gün boyu yardım."
      }
    },
    {
      slug: "laundry",
      title: "სამრეცხაო და დაუთოება",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20.4 6.5L17 4l-2 2-3-3-3 3-2-2-3.4 2.5c-.4.3-.5.8-.3 1.2L5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8l1.7-4.3c.2-.4.1-.9-.3-1.2z"/></svg>',
      desc: {
        ka: "სამრეცხაოსა და დაუთოების მომსახურება ადგილზე სასტუმრო აგავაში. სისუფთავე და კომფორტი თბილისში ხანგრძლივი ყოფნისას.",
        en: "On-site laundry and ironing service at Hotel Agava. Cleanliness and comfort for longer stays in Tbilisi.",
        ru: "Услуги прачечной и глажки в отеле Агава. Чистота и комфорт для длительного пребывания в Тбилиси.",
        tr: "Otel Agava'da yerinde çamaşır ve ütü hizmeti. Uzun konaklamalar için temizlik ve konfor."
      }
    }
  ];
})();

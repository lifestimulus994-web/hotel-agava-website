/* ═══════════════════════════════════════════
   HOTEL AGAVA — room data (single source of truth)
   Consumed at runtime by main.js/booking.js (window.AGAVA_ROOMS_DATA)
   and at build time by scripts/build-rooms.mjs to prerender
   /rooms/<slug>/ landing pages in every language.
   `desc` = SEO prose per language; `amenities` = dict-translatable tokens.
   ═══════════════════════════════════════════ */
(function () {
  window.AGAVA_ROOMS_DATA = [
    {
      slug: "standard",
      name: "სტანდარტული ოთახი — 2 სტუმარზე",
      badge: "სტანდარტი",
      price: 120,
      images: ["assets/room-standard-2.jpg","assets/room-standard-3.jpg","assets/room-standard-4.jpg","assets/room-standard-5.jpg","assets/room-standard-1.jpg"],
      alt: "სტანდარტული ოთახი ცის ჭერით",
      count: "7 ოთახი",
      specs: [
        { icon: "bed", text: "1 საწოლი" },
        { icon: "guests", text: "2 სტუმარი" },
        { icon: "size", text: "22 მ²" }
      ],
      amenities: ["უფასო Wi-Fi", "კონდიციონერი", "აბაზანა"],
      desc: {
        ka: "სტანდარტული ოთახი სასტუმრო აგავაში — კომფორტული 22 მ² ორ სტუმარზე, ცის ჭერით, კონდიციონერით, უფასო Wi-Fi-თ და აბაზანით. იდეალურია თბილისში მოკლე თუ ხანგრძლივი დასვენებისთვის.",
        en: "Standard room at Hotel Agava — a comfortable 22 m² for two guests with a sky ceiling, air conditioning, free Wi-Fi and a private bathroom. Ideal for a short or long stay in Tbilisi.",
        ru: "Стандартный номер в отеле Агава — комфортные 22 м² на двоих с потолком-небом, кондиционером, бесплатным Wi-Fi и ванной. Идеально для короткого или длительного отдыха в Тбилиси.",
        tr: "Otel Agava'da standart oda — gökyüzü tavanı, klima, ücretsiz Wi-Fi ve banyolu iki misafir için konforlu 22 m². Tiflis'te kısa veya uzun konaklama için ideal."
      }
    },
    {
      slug: "lux",
      name: "ლუქსი — 2 სტუმარზე",
      badge: "ლუქსი",
      price: 120,
      images: ["assets/room-lux-1.jpg","assets/room-lux-2.jpg","assets/room-lux-3.jpg","assets/room-lux-4.jpg"],
      alt: "ლუქსი ოთახი ბაროკოს სტილში, ცის ჭერით",
      count: "5 ოთახი",
      specs: [
        { icon: "bed", text: "1 King საწოლი" },
        { icon: "guests", text: "2 სტუმარი" },
        { icon: "size", text: "28 მ²" }
      ],
      amenities: ["უფასო Wi-Fi", "კონდიციონერი", "მაცივარი", "აბაზანა", "ცის ჭერი"],
      desc: {
        ka: "ლუქსი ოთახი აგავაში — ელეგანტური 28 მ² ბაროკოს სტილში, King საწოლით, ცის ჭერით, მაცივრითა და კონდიციონერით. დახვეწილი კომფორტი თბილისში.",
        en: "Deluxe room at Agava — an elegant 28 m² in baroque style with a King bed, sky ceiling, fridge and air conditioning. Refined comfort in Tbilisi.",
        ru: "Люкс в отеле Агава — элегантные 28 м² в стиле барокко с кроватью King, потолком-небом, холодильником и кондиционером. Изысканный комфорт в Тбилиси.",
        tr: "Agava'da lüks oda — King yatak, gökyüzü tavanı, buzdolabı ve klimalı barok tarzında zarif 28 m². Tiflis'te ince bir konfor."
      }
    },
    {
      slug: "superlux",
      name: "სუპერლუქსი — 2 სტუმარზე",
      badge: "სუპერლუქსი",
      price: 120,
      images: ["assets/room-superlux-1.jpg","assets/room-superlux-2.jpg","assets/room-superlux-3.jpg"],
      alt: "სუპერლუქსი ბაროკოს სტილის ინტერიერით",
      count: "1 ნომერი",
      specs: [
        { icon: "bed", text: "1 King საწოლი" },
        { icon: "guests", text: "2 სტუმარი" },
        { icon: "size", text: "36 მ²" }
      ],
      amenities: ["უფასო Wi-Fi", "კონდიციონერი", "მაცივარი", "აბაზანა", "ცის ჭერი"],
      desc: {
        ka: "სუპერლუქსი — ფართო 36 მ² ოთახი ბაროკოს ინტერიერით, King საწოლითა და ცის ჭერით. მაქსიმალური კომფორტი ორ სტუმარზე სასტუმრო აგავაში, თბილისში.",
        en: "Superior suite — a spacious 36 m² with baroque interior, King bed and sky ceiling. Maximum comfort for two guests at Hotel Agava, Tbilisi.",
        ru: "Суперлюкс — просторные 36 м² с интерьером в стиле барокко, кроватью King и потолком-небом. Максимальный комфорт на двоих в отеле Агава, Тбилиси.",
        tr: "Süper lüks — barok iç mekân, King yatak ve gökyüzü tavanlı geniş 36 m². Tiflis'teki Otel Agava'da iki misafir için maksimum konfor."
      }
    },
    {
      slug: "family3",
      name: "საოჯახო ოთახი — 3 სტუმარზე",
      badge: "საოჯახო",
      price: 150,
      images: ["assets/room-family3-2.jpg","assets/room-family3-3.jpg","assets/room-family3-4.jpg","assets/room-family3-1.jpg"],
      alt: "საოჯახო ოთახი სამ სტუმარზე",
      count: "3 ოთახი",
      specs: [
        { icon: "bed", text: "2 საწოლი" },
        { icon: "guests", text: "3 სტუმარი" },
        { icon: "size", text: "32 მ²" }
      ],
      amenities: ["უფასო Wi-Fi", "კონდიციონერი", "მაცივარი", "აბაზანა"],
      desc: {
        ka: "საოჯახო ოთახი 3 სტუმარზე — 32 მ², ორი საწოლი, კონდიციონერი, მაცივარი და აბაზანა. მოსახერხებელი არჩევანი ოჯახებისთვის თბილისში.",
        en: "Family room for 3 guests — 32 m² with two beds, air conditioning, a fridge and a bathroom. A convenient choice for families in Tbilisi.",
        ru: "Семейный номер на 3 гостей — 32 м², две кровати, кондиционер, холодильник и ванная. Удобный выбор для семей в Тбилиси.",
        tr: "3 misafir için aile odası — iki yatak, klima, buzdolabı ve banyolu 32 m². Tiflis'te aileler için kullanışlı bir seçim."
      }
    },
    {
      slug: "family4",
      name: "საოჯახო ოთახი — 4 სტუმარზე",
      badge: "საოჯახო",
      price: 200,
      images: ["assets/room-family4-1.jpg"],
      alt: "საოჯახო ოთახი ოთხ სტუმარზე",
      count: "2 ოთახი",
      specs: [
        { icon: "bed", text: "2 საწოლი" },
        { icon: "guests", text: "4 სტუმარი" },
        { icon: "size", text: "38 მ²" }
      ],
      amenities: ["უფასო Wi-Fi", "კონდიციონერი", "მაცივარი", "აბაზანა"],
      desc: {
        ka: "საოჯახო ოთახი 4 სტუმარზე — ვრცელი 38 მ², ორი საწოლი და ყველა კომფორტი. სივრცე მთელი ოჯახისთვის სასტუმრო აგავაში, თბილისში.",
        en: "Family room for 4 guests — a spacious 38 m² with two beds and every comfort. Room for the whole family at Hotel Agava, Tbilisi.",
        ru: "Семейный номер на 4 гостей — просторные 38 м², две кровати и весь комфорт. Место для всей семьи в отеле Агава, Тбилиси.",
        tr: "4 misafir için aile odası — iki yatak ve tüm konforlarıyla geniş 38 m². Tiflis'teki Otel Agava'da tüm aile için alan."
      }
    },
    {
      slug: "twobedlux",
      name: "ორ ოთახიანი ლუქსი — 5 სტუმარზე",
      badge: "ლუქსი",
      price: 200,
      images: ["assets/room-twobedlux-1.jpg","assets/room-twobedlux-2.jpg","assets/room-twobedlux-3.jpg","assets/room-twobedlux-4.jpg"],
      alt: "ორ ოთახიანი ლუქსი ცის ჭერით",
      count: "1 ნომერი",
      specs: [
        { icon: "bed", text: "2 ოთახი, 3 საწოლი" },
        { icon: "guests", text: "5 სტუმარი" },
        { icon: "size", text: "45 მ²" }
      ],
      amenities: ["უფასო Wi-Fi", "კონდიციონერი", "მაცივარი", "აბაზანა", "ცის ჭერი"],
      desc: {
        ka: "ორ ოთახიანი ლუქსი — 45 მ², ორი ცალკე ოთახი და სამი საწოლი 5 სტუმრამდე. ცის ჭერი, კონდიციონერი და მაცივარი. საუკეთესო არჩევანი დიდი ჯგუფებისთვის თბილისში.",
        en: "Two-room suite — 45 m² with two separate rooms and three beds for up to 5 guests. Sky ceiling, air conditioning and a fridge. The best choice for larger groups in Tbilisi.",
        ru: "Двухкомнатный люкс — 45 м², две отдельные комнаты и три кровати до 5 гостей. Потолок-небо, кондиционер и холодильник. Лучший выбор для больших компаний в Тбилиси.",
        tr: "İki odalı süit — iki ayrı oda ve 5 misafire kadar üç yataklı 45 m². Gökyüzü tavanı, klima ve buzdolabı. Tiflis'te kalabalık gruplar için en iyi seçim."
      }
    },
    {
      slug: "jacuzzi-suite",
      name: "ლუქსი ჯაკუზით — 2 სტუმარზე",
      badge: "ლუქსი",
      price: 300,
      images: ["assets/room-jacuzzi-suite-1.jpg","assets/room-jacuzzi-suite-2.jpg","assets/room-jacuzzi-suite-3.jpg"],
      alt: "ლუქსი ჯაკუზით ქალაქის ხედით",
      count: "1 ნომერი",
      specs: [
        { icon: "bed", text: "1 დიდი ორმაგი საწოლი" },
        { icon: "guests", text: "2 სტუმარი" },
        { icon: "size", text: "30 მ²" },
        { icon: "jacuzzi", text: "ჯაკუზი" }
      ],
      amenities: ["უფასო Wi-Fi", "კონდიციონერი", "ჯაკუზი", "აბაზანა", "ქალაქის ხედი"],
      desc: {
        ka: "ლუქსი ჯაკუზით — რომანტიკული 30 მ² ოთახი პირადი ჯაკუზით, დიდი ორმაგი საწოლითა და ქალაქის ხედით. განსაკუთრებული დასვენება წყვილებისთვის სასტუმრო აგავაში, თბილისში.",
        en: "King room with spa bath — a romantic 30 m² with a private jacuzzi, a large double bed and a city view. A special getaway for couples at Hotel Agava, Tbilisi.",
        ru: "Люкс с джакузи — романтичные 30 м² с личным джакузи, большой двуспальной кроватью и видом на город. Особый отдых для пар в отеле Агава, Тбилиси.",
        tr: "Jakuzili kral odası — özel jakuzi, geniş çift kişilik yatak ve şehir manzaralı romantik 30 m². Tiflis'teki Otel Agava'da çiftler için özel bir kaçamak."
      }
    },
    {
      slug: "jacuzzi",
      name: "სუპერ ლუქსი ჯაკუზით — 2 სტუმარზე",
      badge: "VIP ლუქსი",
      price: 300,
      seasonal: true,
      images: ["assets/room-jacuzzi-3.jpg","assets/room-jacuzzi-1.jpg","assets/room-jacuzzi-2.jpg","assets/room-jacuzzi-4.jpg"],
      alt: "სუპერ ლუქსი ჯაკუზით, ოქროსფერი ინტერიერი",
      count: "1 ნომერი",
      specs: [
        { icon: "bed", text: "1 King საწოლი" },
        { icon: "guests", text: "2 სტუმარი" },
        { icon: "jacuzzi", text: "ჯაკუზი" }
      ],
      amenities: ["უფასო Wi-Fi", "კონდიციონერი", "ჯაკუზი", "აბაზანა"],
      desc: {
        ka: "სუპერ ლუქსი ჯაკუზით — VIP ოთახი ოქროსფერი ინტერიერით, King საწოლითა და პირადი ჯაკუზით. აგავას ყველაზე პრესტიჟული ნომერი თბილისში.",
        en: "Super suite with jacuzzi — a VIP room with golden interior, a King bed and a private jacuzzi. Agava's most prestigious room in Tbilisi.",
        ru: "Суперлюкс с джакузи — VIP-номер с золотым интерьером, кроватью King и личным джакузи. Самый престижный номер Агавы в Тбилиси.",
        tr: "Jakuzili süper süit — altın rengi iç mekân, King yatak ve özel jakuzili VIP oda. Agava'nın Tiflis'teki en prestijli odası."
      }
    }
  ];
})();

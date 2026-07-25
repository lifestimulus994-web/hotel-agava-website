/* ═══════════════════════════════════════════
   HOTEL AGAVA — i18n (KA default / EN / RU / TR)
   Text-dictionary translation over DOM — no markup changes needed.
   Lang stored in localStorage("agava_lang"); switch = reload.
   ═══════════════════════════════════════════ */
(function () {
  "use strict";

  /* language = URL path (/en/ /ru/ /tr/), else ?lang=, else ka.
     One URL = one language (clean for SEO — no localStorage-based swapping). */
  var LANG = "ka";
  var pathLang = location.pathname.match(/^\/(en|ru|tr)(\/|$)/);
  var queryLang = location.search.match(/[?&]lang=(ka|en|ru|tr)/);
  if (pathLang) LANG = pathLang[1];
  else if (queryLang) LANG = queryLang[1];
  if (LANG !== "en" && LANG !== "ru" && LANG !== "tr") LANG = "ka";
  window.AGAVA_LANG = LANG;
  document.documentElement.lang = LANG;

  /* ─── switcher: swap the language segment, keep the current path
         (so /rooms/lux/ ↔ /en/rooms/lux/, homepage / ↔ /en/) ─── */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-lang]");
    if (!b) return;
    e.preventDefault();
    var L = b.getAttribute("data-lang");
    var rest = location.pathname.replace(/^\/(en|ru|tr)(?=\/|$)/, "");
    if (rest.charAt(0) !== "/") rest = "/" + rest;
    var target = (L === "ka" ? rest : "/" + L + rest) + location.hash;
    if (location.pathname + location.hash !== target) location.href = target;
  });
  document.addEventListener("DOMContentLoaded", function () {
    var sw = document.getElementById("langSwitch");
    if (sw) {
      var cur = sw.querySelector('[data-lang="' + LANG + '"]');
      if (cur) cur.classList.add("is-active");
    }
  });

  if (LANG === "ka") return; /* Georgian = source language, nothing to do */

  var E = LANG === "en" ? 0 : LANG === "ru" ? 1 : 2; /* index into [en, ru, tr] pairs */

  var TR_FALLBACK = {
    /* meta / navbar */
    "სასტუმრო აგავა — Hotel Agava | თბილისი, ბელიაშვილის 161": "Otel Agava — Tiflis | Beliaşvili Cad. 161",
    "სასტუმრო აგავა — Hotel Agava": "Otel Agava — Tiflis",
    "სასტუმრო აგავა · თბილისი": "Otel Agava · Tiflis",
    "ქალაქის ხედი": "Şehir manzarası",
    "ყველა ოთახი": "Tüm odalar",
    "ჯავშნის მართვა — შეცვლა ან გაუქმება:": "Rezervasyon yönetimi — değiştir veya iptal et:",
    "მთავარი ნავიგაცია": "Ana navigasyon",
    "სასტუმრო აგავა — მთავარი": "Otel Agava — ana sayfa",
    "მენიუს გახსნა": "Menüyü aç",
    "მენიუს დახურვა": "Menüyü kapat",
    "მთავარი": "Ana Sayfa",
    "ოთახები და ლუქსები": "Odalar ve Süitler",
    "ოთახები": "Odalar",
    "სერვისები და კომფორტი": "Hizmetler ve Konfor",
    "სერვისები": "Hizmetler",
    "გალერეა": "Galeri",
    "ბლოგი": "Blog",
    "კონტაქტი": "İletişim",

    /* hero */
    "ხუთვარსკვლავიანი კომფორტი": "Beş yıldızlı konfor",
    "მოგესალმებით აგავაში": "Agava'ya hoş geldiniz",
    "მოგესალმებით": "Hoş geldiniz",
    "კომფორტი, ელეგანტურობა და ქართული სტუმართმოყვარეობა თბილისში — თქვენი სრულყოფილი დასვენებისთვის":
      "Tiflis'te konfor, zarafet ve Gürcü misafirperverliği — kusursuz konaklamanız için",
    "ოთახების ნახვა": "Odaları Gör",
    "დასქროლეთ": "Aşağı kaydırın",
    "ჩამოსქროლვა": "Aşağı kaydırın",
    "სასტუმრო": "Otel",
    "აგავა": "AGAVA",

    /* stats */
    "სასტუმროს მაჩვენებლები": "Otel göstergeleri",
    "კომფორტული ნომერი": "Konforlu oda",
    "შეფასება Booking.com-ზე": "Booking.com puanı",
    "სტუმრის შეფასება": "Misafir değerlendirmesi",
    "მომსახურება": "Hizmet",

    /* features */
    "მოსახერხებელი მდებარეობა": "Elverişli konum",
    "მარტივად მისადგომი ადგილმდებარეობა — ქალაქის ცენტრთან და მთავარ გზებთან ახლოს.":
      "Kolay ulaşılabilir konum — şehir merkezine ve ana yollara yakın.",
    "კომფორტული ოთახები": "Konforlu odalar",
    "თანამედროვე და ელეგანტურად მოწყობილი ოთახები — ცის ჭერით და განსაკუთრებული დიზაინით.":
      "Modern ve zarif döşenmiş odalar — gökyüzü tavanları ve özgün tasarımla.",
    "სტუმართმოყვარე პერსონალი": "Misafirperver personel",
    "ჩვენი გუნდი ზრუნავს, რომ თქვენი ყოფნა იყოს სასიამოვნო და დაუვიწყარი — ნებისმიერ დროს.":
      "Ekibimiz, konaklamanızın keyifli ve unutulmaz olması için her an özen gösterir.",
    "საუკეთესო ფასები": "En iyi fiyatlar",
    "მიიღეთ მაქსიმალური კომფორტი ხელმისაწვდომ ფასად — სპეციალური შეთავაზებებით.":
      "Uygun fiyata maksimum konfor — özel tekliflerle.",

    /* about */
    "სასტუმრო, სადაც კომფორტი ხელოვნებას ხვდება": "Konforun sanatla buluştuğu bir otel",
    "სასტუმრო აგავა გთავაზობთ ელეგანტურად მოწყობილ ოთახებს, გამორჩეული ინტერიერით — ცის ჭერებით, კლასიკური ავეჯითა და თბილი განათებით. ჩვენი მიზანია, ყოველი სტუმარი თავს განსაკუთრებულად გრძნობდეს.":
      "Otel Agava, özgün iç mekânlara sahip zarif döşenmiş odalar sunar — gökyüzü tavanları, klasik mobilyalar ve sıcak aydınlatma. Amacımız her misafirin kendini özel hissetmesidir.",
    "ვრცელი ფოიე, მყუდრო ეზო, დაცული პარკინგი და ყურადღებიანი პერსონალი — ყველაფერი თქვენი დასვენებისთვის.":
      "Geniş lobi, şirin avlu, güvenli otopark ve ilgili personel — dinlenmeniz için her şey.",
    "ელეგანტური ლუქსი და სტანდარტული ოთახები": "Zarif süitler ve standart odalar",
    "ოჯახური ნომრები 3–4 სტუმარზე": "3–4 misafir için aile odaları",
    "გაიგეთ მეტი": "Daha fazla bilgi",
    "დახვეწილი და მყუდრო": "Zarif ve huzurlu",
    "თანამედროვე და კომფორტული": "Modern ve konforlu",

    /* services */
    "უფასო Wi-Fi": "Ücretsiz Wi-Fi",
    "მაღალსიჩქარიანი ინტერნეტი სასტუმროს მთელ ტერიტორიაზე.": "Otelin her yerinde yüksek hızlı internet.",
    "დაცული პარკინგი": "Güvenli otopark",
    "უფასო და დაცული ავტოსადგომი სასტუმროს სტუმრებისთვის.": "Otel misafirleri için ücretsiz ve güvenli otopark.",
    "გემრიელი საუზმე ყოველ დილით — მრავალფეროვანი მენიუთი.": "Her sabah zengin menülü lezzetli kahvaltı.",
    "საუზმე": "Kahvaltı",
    "ტრანსფერის სერვისი აეროპორტიდან და აეროპორტამდე — წინასწარი მოთხოვნით.": "Havalimanına gidiş-dönüş transfer hizmeti — ön talep üzerine.",
    "ტრანსფერი": "Transfer",
    "24/7 მიღება": "24/7 resepsiyon",
    "რეცეფცია მუშაობს მთელი დღე-ღამის განმავლობაში.": "Resepsiyon gün boyu açıktır.",
    "სამრეცხაო და დაუთოება": "Çamaşır ve ütü",
    "სამრეცხაოსა და დაუთოების მომსახურება ადგილზე.": "Yerinde çamaşır ve ütü hizmeti.",

    /* reviews */
    "რას ამბობენ სტუმრები": "Misafirler ne diyor",
    "სტუმრების შეფასებები": "Misafir Değerlendirmeleri",
    "შესანიშნავი": "Mükemmel",
    "94 შეფასება · Booking.com": "94 değerlendirme · Booking.com",
    "პერსონალი": "Personel",
    "სისუფთავე": "Temizlik",
    "კომფორტი": "Konfor",
    "ფასი / ხარისხი": "Fiyat / kalite",
    "„ბევრ მაღალი კლასის სასტუმროში ვყოფილვარ და ზოგჯერ უკმაყოფილო დავრჩენილვარ. ამ სასტუმრომ კი სასიამოვნოდ გამაკვირვა — ყველაფერი, რაც მჭირდებოდა, ოთახში იყო და კარგად ორგანიზებული.“":
      "“Birçok üst düzey otelde kaldım ve bazen hayal kırıklığına uğradım. Bu otel beni hoş bir şekilde şaşırttı — ihtiyacım olan her şey odadaydı ve düzenliydi.”",
    "„ერთ-ერთი საუკეთესო სასტუმრო — სისუფთავე, სითბო და კომფორტი. ეზოში პარკინგიც აქვთ, რაც ძალიან მოსახერხებელია. ეზოშივე შეგიძლიათ დაისვენოთ და ყავით დატკბეთ. დიდი რეკომენდაცია ჩვენგან!“":
      "“En iyi otellerden biri — temizlik, sıcaklık ve konfor. Avluda otopark da var, bu çok kullanışlı. Avluda dinlenip kahvenizi yudumlayabilirsiniz. Kesinlikle tavsiye ederiz!”",
    "„კომფორტული სასტუმრო, კარგად მოვლილი ოთახები და მეგობრული, ყურადღებიანი პერსონალი. ატმოსფერო თბილი და მისასალმებელია — სიამოვნებით დავბრუნდები.“":
      "“Konforlu bir otel, bakımlı odalar ve güler yüzlü, ilgili personel. Atmosfer sıcak ve davetkâr — memnuniyetle geri dönerim.”",
    "თორნიკე": "Tornike",
    "თურქია": "Türkiye",
    "საქართველო": "Gürcistan",
    "არაბთა გაერთიანებული საამიროები": "Birleşik Arap Emirlikleri",

    /* gallery + cta */
    "დაათვალიერეთ": "Göz atın",
    "ლობი": "Lobi",
    "ჩვენი შენობა": "Binamız",
    "დაგეგმეთ თქვენი დასვენება აგავაში": "Agava'da tatilinizi planlayın",
    "დაჯავშნეთ ოთახი დღესვე და მიიღეთ საუკეთესო ფასი — პირდაპირ ჩვენგან.": "Bugün oda ayırtın ve en iyi fiyatı alın — doğrudan bizden.",
    "დაჯავშნეთ ახლავე": "Şimdi rezervasyon yap",

    /* FAQ */
    "ხშირად დასმული კითხვები": "Sıkça sorulan sorular",
    "რომელ საათზეა შესვლა და გასვლა?": "Giriş ve çıkış saatleri nedir?",
    "შესვლა (check-in) — 13:00-დან, გასვლა (check-out) — 12:00-მდე. ადრეული შესვლა ან გვიანი გასვლა შესაძლებელია წინასწარი შეთანხმებით, ხელმისაწვდომობის მიხედვით.":
      "Giriş 13:00'ten itibaren, çıkış 12:00'ye kadar. Erken giriş veya geç çıkış, uygunluğa göre önceden anlaşmayla mümkündür.",
    "როგორ ხდება გადახდა?": "Ödeme nasıl yapılır?",
    "გადახდა ხდება ადგილზე, სასტუმროში — ნაღდი ანგარიშსწორებით ან ბარათით. ონლაინ ჯავშნისთვის წინასწარი გადახდა არ არის საჭირო.":
      "Ödeme otelde yerinde yapılır — nakit veya kartla. Online rezervasyon için ön ödeme gerekmez.",
    "როგორია გაუქმების პირობები?": "İptal koşulları nelerdir?",
    "ჯავშნის უფასო გაუქმება შესაძლებელია ჩამოსვლამდე 24 საათით ადრე — დაგვირეკეთ ან მოგვწერეთ WhatsApp-ზე ჯავშნის ნომრის მითითებით.":
      "Rezervasyon, gelişten 24 saat öncesine kadar ücretsiz iptal edilebilir — bizi arayın veya rezervasyon numaranızla WhatsApp'tan yazın.",
    "არის თუ არა პარკინგი?": "Otopark var mı?",
    "დიახ, სასტუმროს აქვს უფასო და დაცული ავტოსადგომი სტუმრებისთვის — ეზოშივე.": "Evet, otelin misafirler için ücretsiz ve güvenli otoparkı var — avluda.",
    "შედის თუ არა საუზმე ფასში?": "Kahvaltı fiyata dahil mi?",
    "საუზმე შესაძლებელია დამატებით — მრავალფეროვანი მენიუთი ყოველ დილით. მიუთითეთ ჯავშნის კომენტარში ან შეუთანხმდით რეცეფციას.":
      "Kahvaltı ek olarak sunulur — her sabah zengin menüyle. Rezervasyon notunda belirtin veya resepsiyonla anlaşın.",
    "დაშვებულია თუ არა შინაური ცხოველები?": "Evcil hayvan kabul ediliyor mu?",
    "შინაური ცხოველების შესახებ გთხოვთ წინასწარ დაგვიკავშირდეთ — განვიხილავთ ინდივიდუალურად.": "Evcil hayvanlar için lütfen önceden bizimle iletişime geçin — her durumu ayrı değerlendiriyoruz.",

    /* contact */
    "დაგვიკავშირდით": "İletişime geçin",
    "მისამართი": "Adres",
    "თბილისი, აკაკი ბელიაშვილის ქ. 161": "Akaki Beliaşvili Cad. 161, Tiflis",
    "ამერიკის საელჩო — 800 მ · სარაჯიშვილის მეტრო — 2.2 კმ · აეროპორტი — 23 კმ": "ABD Büyükelçiliği — 800 m · Sarajişvili metrosu — 2,2 km · Havalimanı — 23 km",
    "ტელეფონი": "Telefon",
    "მოგვწერეთ WhatsApp-ზე": "WhatsApp'tan yazın",
    "ელფოსტა": "E-posta",
    "რეცეფცია — 24/7": "Resepsiyon — 24/7",
    "შესვლა: 13:00 · გასვლა: 12:00": "Giriş: 13:00 · Çıkış: 12:00",
    "სასტუმრო აგავა რუკაზე — ბელიაშვილის 161, თბილისი": "Otel Agava haritada — Beliaşvili Cad. 161, Tiflis",

    /* quick booking form */
    "დაჯავშნეთ ოთახი": "Oda ayırtın",
    "სტუმრების რაოდენობა": "Misafir sayısı",
    "სტუმრები": "Misafirler",
    "1 სტუმარი": "1 misafir",
    "2 სტუმარი": "2 misafir",
    "3 სტუმარი": "3 misafir",
    "4 სტუმარი": "4 misafir",
    "სახელი": "Ad",
    "გვარი": "Soyad",
    "კომენტარი / სპეციალური მოთხოვნა": "Yorum / özel istek",
    "მაგ.: გვიანი ჩამოსვლა, ტრანსფერი…": "Örn.: geç giriş, transfer…",
    "✓ ჯავშანი მიღებულია! ნომერი:": "✓ Rezervasyon alındı! Numara:",
    "WhatsApp-ით დადასტურება": "WhatsApp ile onayla",

    /* footer */
    "კომფორტი, ელეგანტურობა და ქართული სტუმართმოყვარეობა.": "Konfor, zarafet ve Gürcü misafirperverliği.",
    "ნავიგაცია": "Navigasyon",
    "ქვედა ნავიგაცია": "Alt navigasyon",
    "რეცეფცია: 24/7": "Resepsiyon: 24/7",
    "სასტუმრო აგავა · Hotel Agava — ყველა უფლება დაცულია": "Otel Agava — tüm hakları saklıdır",

    /* wizard */
    "ოთახის დაჯავშნა": "Oda rezervasyonu",
    "თარიღები": "Tarihler",
    "მონაცემები": "Bilgiler",
    "შესვლა": "Giriş",
    "გასვლა": "Çıkış",
    "თავისუფალი ოთახების ნახვა": "Boş odaları göster",
    "← თარიღების შეცვლა": "← Tarihleri değiştir",
    "← ოთახის შეცვლა": "← Odayı değiştir",
    "ჯავშანი მიღებულია!": "Rezervasyon alındı!",
    "ჯავშნის ნომერი:": "Rezervasyon numarası:",
    "ჩვენ დაგიდასტურებთ 24 საათის განმავლობაში. სწრაფი დადასტურებისთვის მოგვწერეთ WhatsApp-ზე:":
      "24 saat içinde onaylayacağız. Daha hızlı onay için WhatsApp'tan yazın:",
    "დახურვა": "Kapat",
    "მოწმდება ხელმისაწვდომობა…": "Uygunluk kontrol ediliyor…",
    "იგზავნება…": "Gönderiliyor…",
    "ჯამური ღირებულება": "Toplam tutar",
    "გადახდა — ადგილზე, სასტუმროში. უფასო გაუქმება ჩამოსვლამდე 24 სთ-ით ადრე.": "Ödeme otelde yerinde. Gelişten 24 saat öncesine kadar ücretsiz iptal.",
    "ამ თარიღებზე დაკავებულია": "Bu tarihlerde dolu",
    "არჩევა": "Seç",
    "ხელმისაწვდომობა დადასტურდება ოპერატორის მიერ.": "Uygunluk operatörümüz tarafından onaylanacaktır.",
    "ამ პარამეტრებით ოთახი ვერ მოიძებნა — სცადეთ სხვა თარიღები ან მოგვწერეთ WhatsApp-ზე.": "Bu parametrelere uygun oda bulunamadı — başka tarih deneyin veya WhatsApp'tan yazın.",

    /* validation / statuses */
    "აირჩიეთ ორივე თარიღი.": "Her iki tarihi de seçin.",
    "აირჩიეთ თარიღები.": "Tarihleri seçin.",
    "გასვლის თარიღი შესვლაზე გვიან უნდა იყოს.": "Çıkış tarihi girişten sonra olmalı.",
    "წარსული თარიღი ვერ აირჩევა.": "Geçmiş tarih seçilemez.",
    "მაქსიმუმ 30 ღამე.": "En fazla 30 gece.",
    "შეავსეთ სახელი და გვარი.": "Ad ve soyadı doldurun.",
    "შეიყვანეთ სწორი ტელეფონი.": "Geçerli bir telefon girin.",
    "შეცდომა — სცადეთ თავიდან ან მოგვწერეთ WhatsApp-ზე.": "Hata — tekrar deneyin veya WhatsApp'tan yazın.",
    "სამწუხაროდ, ეს ოთახი ახლახან დაიკავეს — სცადეთ სხვა თარიღები.": "Maalesef bu oda az önce ayırtıldı — başka tarih deneyin.",
    "ამ თარიღებზე ეს ოთახი დაკავებულია — სცადეთ სხვა თარიღები.": "Bu oda bu tarihlerde dolu — başka tarih deneyin.",
    "ჯავშნის დეტალები გაიგზავნა WhatsApp-ით — დაასრულეთ იქ.": "Rezervasyon detayları WhatsApp ile gönderildi — orada tamamlayın.",

    /* room cards / detail */
    "სტანდარტული ოთახი — 2 სტუმარზე": "Standart Oda — 2 misafir",
    "ლუქსი — 2 სტუმარზე": "Lüks Oda — 2 misafir",
    "სუპერლუქსი — 2 სტუმარზე": "Süper Lüks — 2 misafir",
    "საოჯახო ოთახი — 3 სტუმარზე": "Aile Odası — 3 misafir",
    "საოჯახო ოთახი — 4 სტუმარზე": "Aile Odası — 4 misafir",
    "ორ ოთახიანი ლუქსი — 5 სტუმარზე": "İki Odalı Süit — 5 misafir",
    "ლუქსი ჯაკუზით — 2 სტუმარზე": "Jakuzili Kral Odası — 2 misafir",
    "სუპერ ლუქსი ჯაკუზით — 2 სტუმარზე": "Jakuzili Süper Süit — 2 misafir",
    "ორ ოთახიანი ლუქსი": "İki Odalı Süit",
    "ლუქსი ჯაკუზით": "Jakuzili Kral Odası",
    "სუპერ ლუქსი ჯაკუზით": "Jakuzili Süper Süit",
    "სუპერლუქსი": "Süper Lüks",
    "სუპერ ლუქსი": "Süper Süit",
    "1 დიდი ორმაგი საწოლი": "1 çok büyük çift kişilik yatak",
    "VIP ლუქსი": "VIP Süit",
    "ლუქსი": "Lüks",
    "სტანდარტი": "Standart",
    "საოჯახო": "Aile",
    "სეზონური": "Sezonluk",
    "ნახვა": "Gör",
    "დაჯავშნა": "Rezervasyon",
    "დარეკვა": "Ara",
    "წინა ფოტო": "Önceki fotoğraf",
    "შემდეგი ფოტო": "Sonraki fotoğraf",
    "1 King საწოლი": "1 King yatak",
    "1 საწოლი": "1 yatak",
    "2 საწოლი": "2 yatak",
    "3 საწოლი": "3 yatak",
    "ამ ოთახში": "Bu odada",
    "— აირჩიეთ სხვა ოთახი.": "— başka oda seçin.",
    "ჯაკუზი": "Jakuzi",
    "კონდიციონერი": "Klima",
    "მაცივარი": "Buzdolabı",
    "აბაზანა": "Banyo",
    "ცის ჭერი": "Gökyüzü tavan",
    "გადახდა ადგილზე · უფასო გაუქმება ჩამოსვლამდე 24 სთ-ით ადრე · შესვლა 13:00, გასვლა 12:00":
      "Ödeme yerinde · Gelişten 24 saat öncesine kadar ücretsiz iptal · Giriş 13:00, çıkış 12:00",

    /* CTA tile */
    "ვერ იპოვეთ სასურველი ოთახი?": "Aradığınız odayı bulamadınız mı?",
    "დაგვიკავშირდით და დაგეხმარებით საუკეთესო არჩევანში — შესვლა 13:00, გასვლა 12:00.": "Bize ulaşın, en iyi seçimde yardımcı olalım — giriş 13:00, çıkış 12:00.",
    "დაგვიკავშირდით და დაგეხმარებით": "Bize ulaşın, yardımcı olalım",

    /* breakfast add-on */
    "დაამატეთ საუზმე": "Kahvaltı ekle",
    "სტუმარი / ღამე": "misafir / gece",

    /* small tokens */
    "ჯამში:": "Toplam:",
    "/ღამე": "/gece",
    "ოთახი": "Oda",
    "იან": "Oca", "თებ": "Şub", "მარ": "Mar", "აპრ": "Nis",
    "მაი": "May", "ივნ": "Haz", "ივლ": "Tem", "აგვ": "Ağu",
    "სექ": "Eyl", "ოქტ": "Eki", "ნოე": "Kas", "დეკ": "Ara"
  };

  /* ─── literal dictionary: ka → [en, ru] ─── */
  var D = {
    /* meta / navbar */
    "სასტუმრო აგავა — Hotel Agava | თბილისი, ბელიაშვილის 161": ["Hotel Agava — Tbilisi | Beliashvili St 161", "Отель Агава — Тбилиси | ул. Белиашвили 161"],
    "სასტუმრო აგავა — Hotel Agava": ["Hotel Agava — Tbilisi", "Отель Агава — Тбилиси"],
    "სასტუმრო აგავა · თბილისი": ["Hotel Agava · Tbilisi", "Отель Агава · Тбилиси"],
    "ქალაქის ხედი": ["City view", "Вид на город"],
    "ყველა ოთახი": ["All rooms", "Все номера"],
    "ჯავშნის მართვა — შეცვლა ან გაუქმება:": ["Manage booking — change or cancel:", "Управление бронированием — изменить или отменить:"],
    "მთავარი ნავიგაცია": ["Main navigation", "Главная навигация"],
    "სასტუმრო აგავა — მთავარი": ["Hotel Agava — home", "Отель Агава — главная"],
    "მენიუს გახსნა": ["Open menu", "Открыть меню"],
    "მენიუს დახურვა": ["Close menu", "Закрыть меню"],
    "მთავარი": ["Home", "Главная"],
    "ოთახები და ლუქსები": ["Rooms & Suites", "Номера и люксы"],
    "ოთახები": ["Rooms", "Номера"],
    "სერვისები და კომფორტი": ["Services & Comfort", "Услуги и комфорт"],
    "სერვისები": ["Services", "Услуги"],
    "გალერეა": ["Gallery", "Галерея"],
    "ბლოგი": ["Blog", "Блог"],
    "კონტაქტი": ["Contact", "Контакты"],

    /* hero */
    "ხუთვარსკვლავიანი კომფორტი": ["Five-star comfort", "Пятизвёздочный комфорт"],
    "მოგესალმებით აგავაში": ["Welcome to Agava", "Добро пожаловать в Агаву"],
    "მოგესალმებით": ["Welcome", "Добро пожаловать"],
    "კომფორტი, ელეგანტურობა და ქართული სტუმართმოყვარეობა თბილისში — თქვენი სრულყოფილი დასვენებისთვის":
      ["Comfort, elegance and Georgian hospitality in Tbilisi — for your perfect stay",
       "Комфорт, элегантность и грузинское гостеприимство в Тбилиси — для вашего идеального отдыха"],
    "ოთახების ნახვა": ["View Rooms", "Смотреть номера"],
    "დასქროლეთ": ["Scroll down", "Листайте вниз"],
    "ჩამოსქროლვა": ["Scroll down", "Прокрутить вниз"],
    "სასტუმრო": ["Hotel", "Отель"],
    "აგავა": ["AGAVA", "АГАВА"],

    /* stats */
    "სასტუმროს მაჩვენებლები": ["Hotel highlights", "Показатели отеля"],
    "კომფორტული ნომერი": ["Comfortable rooms", "Комфортных номеров"],
    "შეფასება Booking.com-ზე": ["Booking.com rating", "Оценка на Booking.com"],
    "სტუმრის შეფასება": ["Guest reviews", "Отзывов гостей"],
    "მომსახურება": ["Service", "Сервис"],

    /* features */
    "მოსახერხებელი მდებარეობა": ["Convenient location", "Удобное расположение"],
    "მარტივად მისადგომი ადგილმდებარეობა — ქალაქის ცენტრთან და მთავარ გზებთან ახლოს.":
      ["Easily accessible — close to the city centre and main roads.",
       "Легко добраться — рядом с центром города и главными дорогами."],
    "კომფორტული ოთახები": ["Comfortable rooms", "Комфортные номера"],
    "თანამედროვე და ელეგანტურად მოწყობილი ოთახები — ცის ჭერით და განსაკუთრებული დიზაინით.":
      ["Modern, elegantly furnished rooms with sky ceilings and distinctive design.",
       "Современные, элегантно обставленные номера с потолками-небом и особым дизайном."],
    "სტუმართმოყვარე პერსონალი": ["Hospitable staff", "Гостеприимный персонал"],
    "ჩვენი გუნდი ზრუნავს, რომ თქვენი ყოფნა იყოს სასიამოვნო და დაუვიწყარი — ნებისმიერ დროს.":
      ["Our team makes sure your stay is pleasant and memorable — at any hour.",
       "Наша команда заботится о том, чтобы ваше пребывание было приятным и незабываемым — в любое время."],
    "საუკეთესო ფასები": ["Best prices", "Лучшие цены"],
    "მიიღეთ მაქსიმალური კომფორტი ხელმისაწვდომ ფასად — სპეციალური შეთავაზებებით.":
      ["Maximum comfort at an affordable price — with special offers.",
       "Максимальный комфорт по доступной цене — со специальными предложениями."],

    /* about */
    "სასტუმრო, სადაც კომფორტი ხელოვნებას ხვდება": ["A hotel where comfort meets art", "Отель, где комфорт встречается с искусством"],
    "სასტუმრო აგავა გთავაზობთ ელეგანტურად მოწყობილ ოთახებს, გამორჩეული ინტერიერით — ცის ჭერებით, კლასიკური ავეჯითა და თბილი განათებით. ჩვენი მიზანია, ყოველი სტუმარი თავს განსაკუთრებულად გრძნობდეს.":
      ["Hotel Agava offers elegantly furnished rooms with distinctive interiors — sky ceilings, classic furniture and warm lighting. Our goal is to make every guest feel special.",
       "Отель Агава предлагает элегантно обставленные номера с особенными интерьерами — потолками-небом, классической мебелью и тёплым освещением. Наша цель — чтобы каждый гость чувствовал себя особенным."],
    "ვრცელი ფოიე, მყუდრო ეზო, დაცული პარკინგი და ყურადღებიანი პერსონალი — ყველაფერი თქვენი დასვენებისთვის.":
      ["A spacious lobby, cosy courtyard, secure parking and attentive staff — everything for your rest.",
       "Просторное фойе, уютный двор, охраняемая парковка и внимательный персонал — всё для вашего отдыха."],
    "ელეგანტური ლუქსი და სტანდარტული ოთახები": ["Elegant suites and standard rooms", "Элегантные люксы и стандартные номера"],
    "ოჯახური ნომრები 3–4 სტუმარზე": ["Family rooms for 3–4 guests", "Семейные номера на 3–4 гостей"],
    "გაიგეთ მეტი": ["Learn more", "Узнать больше"],
    "დახვეწილი და მყუდრო": ["Refined & cosy", "Изысканно и уютно"],
    "თანამედროვე და კომფორტული": ["Modern & comfortable", "Современно и комфортно"],

    /* services */
    "უფასო Wi-Fi": ["Free Wi-Fi", "Бесплатный Wi-Fi"],
    "მაღალსიჩქარიანი ინტერნეტი სასტუმროს მთელ ტერიტორიაზე.": ["High-speed internet throughout the hotel.", "Высокоскоростной интернет на всей территории отеля."],
    "დაცული პარკინგი": ["Secure parking", "Охраняемая парковка"],
    "უფასო და დაცული ავტოსადგომი სასტუმროს სტუმრებისთვის.": ["Free, secure parking for hotel guests.", "Бесплатная охраняемая парковка для гостей отеля."],
    "გემრიელი საუზმე ყოველ დილით — მრავალფეროვანი მენიუთი.": ["Delicious breakfast every morning — with a varied menu.", "Вкусный завтрак каждое утро — с разнообразным меню."],
    "საუზმე": ["Breakfast", "Завтрак"],
    "ტრანსფერის სერვისი აეროპორტიდან და აეროპორტამდე — წინასწარი მოთხოვნით.": ["Airport transfer service — on prior request.", "Трансфер из/в аэропорт — по предварительному запросу."],
    "ტრანსფერი": ["Transfer", "Трансфер"],
    "24/7 მიღება": ["24/7 reception", "Стойка регистрации 24/7"],
    "რეცეფცია მუშაობს მთელი დღე-ღამის განმავლობაში.": ["The reception desk is open around the clock.", "Стойка регистрации работает круглосуточно."],
    "სამრეცხაო და დაუთოება": ["Laundry & ironing", "Прачечная и глажка"],
    "სამრეცხაოსა და დაუთოების მომსახურება ადგილზე.": ["On-site laundry and ironing service.", "Услуги прачечной и глажки на месте."],

    /* reviews */
    "რას ამბობენ სტუმრები": ["What guests say", "Что говорят гости"],
    "სტუმრების შეფასებები": ["Guest Reviews", "Отзывы гостей"],
    "შესანიშნავი": ["Excellent", "Превосходно"],
    "94 შეფასება · Booking.com": ["94 reviews · Booking.com", "94 отзыва · Booking.com"],
    "პერსონალი": ["Staff", "Персонал"],
    "სისუფთავე": ["Cleanliness", "Чистота"],
    "კომფორტი": ["Comfort", "Комфорт"],
    "ფასი / ხარისხი": ["Value for money", "Цена / качество"],
    "„ბევრ მაღალი კლასის სასტუმროში ვყოფილვარ და ზოგჯერ უკმაყოფილო დავრჩენილვარ. ამ სასტუმრომ კი სასიამოვნოდ გამაკვირვა — ყველაფერი, რაც მჭირდებოდა, ოთახში იყო და კარგად ორგანიზებული.“":
      ["“I have stayed in many high-end hotels and have sometimes been disappointed. This hotel pleasantly surprised me — everything I needed was in the room and well organised.”",
       "«Я бывал во многих отелях высокого класса и иногда оставался недоволен. Этот отель приятно удивил — всё, что мне было нужно, было в номере и хорошо организовано.»"],
    "„ერთ-ერთი საუკეთესო სასტუმრო — სისუფთავე, სითბო და კომფორტი. ეზოში პარკინგიც აქვთ, რაც ძალიან მოსახერხებელია. ეზოშივე შეგიძლიათ დაისვენოთ და ყავით დატკბეთ. დიდი რეკომენდაცია ჩვენგან!“":
      ["“One of the best hotels — cleanliness, warmth and comfort. There is parking in the courtyard, which is very convenient, and you can relax there with a coffee. Highly recommended!”",
       "«Один из лучших отелей — чистота, тепло и комфорт. Во дворе есть парковка, что очень удобно, там же можно отдохнуть за чашкой кофе. Очень рекомендуем!»"],
    "„კომფორტული სასტუმრო, კარგად მოვლილი ოთახები და მეგობრული, ყურადღებიანი პერსონალი. ატმოსფერო თბილი და მისასალმებელია — სიამოვნებით დავბრუნდები.“":
      ["“A comfortable hotel, well-kept rooms and friendly, attentive staff. The atmosphere is warm and welcoming — I would gladly return.”",
       "«Комфортный отель, ухоженные номера и дружелюбный, внимательный персонал. Атмосфера тёплая и гостеприимная — с удовольствием вернусь.»"],
    "თორნიკე": ["Tornike", "Торнике"],
    "თურქია": ["Turkia", "Туркиа"],
    "საქართველო": ["Georgia", "Грузия"],
    "არაბთა გაერთიანებული საამიროები": ["United Arab Emirates", "ОАЭ"],

    /* gallery + cta */
    "დაათვალიერეთ": ["Take a look", "Посмотрите"],
    "ლობი": ["Lobby", "Лобби"],
    "ჩვენი შენობა": ["Our building", "Наше здание"],
    "დაგეგმეთ თქვენი დასვენება აგავაში": ["Plan your stay at Agava", "Спланируйте отдых в Агаве"],
    "დაჯავშნეთ ოთახი დღესვე და მიიღეთ საუკეთესო ფასი — პირდაპირ ჩვენგან.": ["Book a room today and get the best rate — directly from us.", "Забронируйте номер сегодня и получите лучшую цену — напрямую у нас."],
    "დაჯავშნეთ ახლავე": ["Book now", "Забронировать сейчас"],

    /* FAQ */
    "ხშირად დასმული კითხვები": ["Frequently asked questions", "Часто задаваемые вопросы"],
    "რომელ საათზეა შესვლა და გასვლა?": ["What are the check-in and check-out times?", "Во сколько заезд и выезд?"],
    "შესვლა (check-in) — 13:00-დან, გასვლა (check-out) — 12:00-მდე. ადრეული შესვლა ან გვიანი გასვლა შესაძლებელია წინასწარი შეთანხმებით, ხელმისაწვდომობის მიხედვით.":
      ["Check-in from 13:00, check-out by 12:00. Early check-in or late check-out is possible by prior arrangement, subject to availability.",
       "Заезд с 13:00, выезд до 12:00. Ранний заезд или поздний выезд возможны по предварительной договорённости, при наличии возможности."],
    "როგორ ხდება გადახდა?": ["How do I pay?", "Как происходит оплата?"],
    "გადახდა ხდება ადგილზე, სასტუმროში — ნაღდი ანგარიშსწორებით ან ბარათით. ონლაინ ჯავშნისთვის წინასწარი გადახდა არ არის საჭირო.":
      ["Payment is made on site at the hotel — in cash or by card. No prepayment is required for online booking.",
       "Оплата производится на месте в отеле — наличными или картой. Предоплата за онлайн-бронирование не требуется."],
    "როგორია გაუქმების პირობები?": ["What is the cancellation policy?", "Каковы условия отмены?"],
    "ჯავშნის უფასო გაუქმება შესაძლებელია ჩამოსვლამდე 24 საათით ადრე — დაგვირეკეთ ან მოგვწერეთ WhatsApp-ზე ჯავშნის ნომრის მითითებით.":
      ["Free cancellation up to 24 hours before arrival — call us or message us on WhatsApp with your booking number.",
       "Бесплатная отмена возможна за 24 часа до заезда — позвоните нам или напишите в WhatsApp, указав номер брони."],
    "არის თუ არა პარკინგი?": ["Is there parking?", "Есть ли парковка?"],
    "დიახ, სასტუმროს აქვს უფასო და დაცული ავტოსადგომი სტუმრებისთვის — ეზოშივე.": ["Yes, the hotel has free, secure parking for guests — right in the courtyard.", "Да, у отеля есть бесплатная охраняемая парковка для гостей — прямо во дворе."],
    "შედის თუ არა საუზმე ფასში?": ["Is breakfast included?", "Входит ли завтрак в стоимость?"],
    "საუზმე შესაძლებელია დამატებით — მრავალფეროვანი მენიუთი ყოველ დილით. მიუთითეთ ჯავშნის კომენტარში ან შეუთანხმდით რეცეფციას.":
      ["Breakfast is available as an extra — with a varied menu every morning. Mention it in your booking comment or arrange it with reception.",
       "Завтрак доступен за дополнительную плату — разнообразное меню каждое утро. Укажите это в комментарии к брони или договоритесь на ресепшен."],
    "დაშვებულია თუ არა შინაური ცხოველები?": ["Are pets allowed?", "Можно ли с животными?"],
    "შინაური ცხოველების შესახებ გთხოვთ წინასწარ დაგვიკავშირდეთ — განვიხილავთ ინდივიდუალურად.": ["Please contact us in advance about pets — we consider each case individually.", "Пожалуйста, свяжитесь с нами заранее по поводу животных — рассматриваем индивидуально."],

    /* contact */
    "დაგვიკავშირდით": ["Get in touch", "Свяжитесь с нами"],
    "მისამართი": ["Address", "Адрес"],
    "თბილისი, აკაკი ბელიაშვილის ქ. 161": ["161 Akaki Beliashvili St, Tbilisi", "Тбилиси, ул. Акакия Белиашвили, 161"],
    "ამერიკის საელჩო — 800 მ · სარაჯიშვილის მეტრო — 2.2 კმ · აეროპორტი — 23 კმ": ["US Embassy — 800 m · Sarajishvili metro — 2.2 km · Airport — 23 km", "Посольство США — 800 м · метро Сараджишвили — 2,2 км · аэропорт — 23 км"],
    "ტელეფონი": ["Phone", "Телефон"],
    "მოგვწერეთ WhatsApp-ზე": ["Message us on WhatsApp", "Напишите нам в WhatsApp"],
    "ელფოსტა": ["Email", "Эл. почта"],
    "რეცეფცია — 24/7": ["Reception — 24/7", "Ресепшен — 24/7"],
    "შესვლა: 13:00 · გასვლა: 12:00": ["Check-in: 13:00 · Check-out: 12:00", "Заезд: 13:00 · Выезд: 12:00"],
    "სასტუმრო აგავა რუკაზე — ბელიაშვილის 161, თბილისი": ["Hotel Agava on the map — 161 Beliashvili St, Tbilisi", "Отель Агава на карте — ул. Белиашвили 161, Тбилиси"],

    /* quick booking form */
    "დაჯავშნეთ ოთახი": ["Book a Room", "Забронировать номер"],
    "სტუმრების რაოდენობა": ["Number of guests", "Количество гостей"],
    "სტუმრები": ["Guests", "Гости"],
    "1 სტუმარი": ["1 guest", "1 гость"],
    "2 სტუმარი": ["2 guests", "2 гостя"],
    "3 სტუმარი": ["3 guests", "3 гостя"],
    "4 სტუმარი": ["4 guests", "4 гостя"],
    "სახელი": ["First name", "Имя"],
    "გვარი": ["Last name", "Фамилия"],
    "კომენტარი / სპეციალური მოთხოვნა": ["Comment / special request", "Комментарий / особые пожелания"],
    "მაგ.: გვიანი ჩამოსვლა, ტრანსფერი…": ["E.g.: late arrival, transfer…", "Напр.: поздний заезд, трансфер…"],
    "✓ ჯავშანი მიღებულია! ნომერი:": ["✓ Booking received! Number:", "✓ Бронь принята! Номер:"],
    "WhatsApp-ით დადასტურება": ["Confirm via WhatsApp", "Подтвердить в WhatsApp"],

    /* footer */
    "კომფორტი, ელეგანტურობა და ქართული სტუმართმოყვარეობა.": ["Comfort, elegance and Georgian hospitality.", "Комфорт, элегантность и грузинское гостеприимство."],
    "ნავიგაცია": ["Navigation", "Навигация"],
    "ქვედა ნავიგაცია": ["Footer navigation", "Нижняя навигация"],
    "რეცეფცია: 24/7": ["Reception: 24/7", "Ресепшен: 24/7"],
    "სასტუმრო აგავა · Hotel Agava — ყველა უფლება დაცულია": ["Hotel Agava — all rights reserved", "Отель Агава — все права защищены"],

    /* wizard */
    "ოთახის დაჯავშნა": ["Book a Room", "Бронирование номера"],
    "თარიღები": ["Dates", "Даты"],
    "მონაცემები": ["Details", "Данные"],
    "შესვლა": ["Check-in", "Заезд"],
    "გასვლა": ["Check-out", "Выезд"],
    "თავისუფალი ოთახების ნახვა": ["See available rooms", "Показать свободные номера"],
    "← თარიღების შეცვლა": ["← Change dates", "← Изменить даты"],
    "← ოთახის შეცვლა": ["← Change room", "← Изменить номер"],
    "ჯავშანი მიღებულია!": ["Booking received!", "Бронь принята!"],
    "ჯავშნის ნომერი:": ["Booking number:", "Номер брони:"],
    "ჩვენ დაგიდასტურებთ 24 საათის განმავლობაში. სწრაფი დადასტურებისთვის მოგვწერეთ WhatsApp-ზე:":
      ["We will confirm within 24 hours. For a faster confirmation, message us on WhatsApp:",
       "Мы подтвердим бронь в течение 24 часов. Для быстрого подтверждения напишите нам в WhatsApp:"],
    "დახურვა": ["Close", "Закрыть"],
    "მოწმდება ხელმისაწვდომობა…": ["Checking availability…", "Проверяем доступность…"],
    "იგზავნება…": ["Sending…", "Отправляется…"],
    "ჯამური ღირებულება": ["Total price", "Итоговая стоимость"],
    "გადახდა — ადგილზე, სასტუმროში. უფასო გაუქმება ჩამოსვლამდე 24 სთ-ით ადრე.": ["Payment on site at the hotel. Free cancellation up to 24h before arrival.", "Оплата на месте в отеле. Бесплатная отмена за 24 ч до заезда."],
    "ამ თარიღებზე დაკავებულია": ["Not available for these dates", "Занято на эти даты"],
    "არჩევა": ["Select", "Выбрать"],
    "ხელმისაწვდომობა დადასტურდება ოპერატორის მიერ.": ["Availability will be confirmed by our operator.", "Доступность подтвердит наш оператор."],
    "ამ პარამეტრებით ოთახი ვერ მოიძებნა — სცადეთ სხვა თარიღები ან მოგვწერეთ WhatsApp-ზე.": ["No rooms match these parameters — try other dates or message us on WhatsApp.", "Номеров с такими параметрами не найдено — попробуйте другие даты или напишите нам в WhatsApp."],

    /* validation / statuses */
    "აირჩიეთ ორივე თარიღი.": ["Select both dates.", "Выберите обе даты."],
    "აირჩიეთ თარიღები.": ["Select the dates.", "Выберите даты."],
    "გასვლის თარიღი შესვლაზე გვიან უნდა იყოს.": ["Check-out must be after check-in.", "Дата выезда должна быть позже заезда."],
    "წარსული თარიღი ვერ აირჩევა.": ["Past dates cannot be selected.", "Нельзя выбрать прошедшую дату."],
    "მაქსიმუმ 30 ღამე.": ["30 nights maximum.", "Максимум 30 ночей."],
    "შეავსეთ სახელი და გვარი.": ["Fill in first and last name.", "Заполните имя и фамилию."],
    "შეიყვანეთ სწორი ტელეფონი.": ["Enter a valid phone number.", "Введите корректный номер телефона."],
    "შეცდომა — სცადეთ თავიდან ან მოგვწერეთ WhatsApp-ზე.": ["Error — try again or message us on WhatsApp.", "Ошибка — попробуйте ещё раз или напишите нам в WhatsApp."],
    "სამწუხაროდ, ეს ოთახი ახლახან დაიკავეს — სცადეთ სხვა თარიღები.": ["Unfortunately this room was just booked — try other dates.", "К сожалению, этот номер только что заняли — попробуйте другие даты."],
    "ამ თარიღებზე ეს ოთახი დაკავებულია — სცადეთ სხვა თარიღები.": ["This room is not available for these dates — try other dates.", "Этот номер занят на эти даты — попробуйте другие даты."],
    "ჯავშნის დეტალები გაიგზავნა WhatsApp-ით — დაასრულეთ იქ.": ["Booking details were sent via WhatsApp — finish there.", "Детали брони отправлены в WhatsApp — завершите бронирование там."],

    /* room cards / detail */
    "სტანდარტული ოთახი — 2 სტუმარზე": ["Standard Room — 2 guests", "Стандартный номер — 2 гостя"],
    "ლუქსი — 2 სტუმარზე": ["Deluxe Room — 2 guests", "Люкс — 2 гостя"],
    "სუპერლუქსი — 2 სტუმარზე": ["Superior Suite — 2 guests", "Суперлюкс — 2 гостя"],
    "საოჯახო ოთახი — 3 სტუმარზე": ["Family Room — 3 guests", "Семейный номер — 3 гостя"],
    "საოჯახო ოთახი — 4 სტუმარზე": ["Family Room — 4 guests", "Семейный номер — 4 гостя"],
    "ორ ოთახიანი ლუქსი — 5 სტუმარზე": ["Two-Room Suite — 5 guests", "Двухкомнатный люкс — 5 гостей"],
    "ლუქსი ჯაკუზით — 2 სტუმარზე": ["King Room with Spa Bath — 2 guests", "Люкс с джакузи — 2 гостя"],
    "სუპერ ლუქსი ჯაკუზით — 2 სტუმარზე": ["Super Suite with Jacuzzi — 2 guests", "Суперлюкс с джакузи — 2 гостя"],
    "ორ ოთახიანი ლუქსი": ["Two-Room Suite", "Двухкомнатный люкс"],
    "ლუქსი ჯაკუზით": ["King Room with Spa Bath", "Люкс с джакузи"],
    "სუპერ ლუქსი ჯაკუზით": ["Super Suite with Jacuzzi", "Суперлюкс с джакузи"],
    "სუპერლუქსი": ["Superior", "Суперлюкс"],
    "სუპერ ლუქსი": ["Super Suite", "Суперлюкс"],
    "1 დიდი ორმაგი საწოლი": ["1 extra-large double bed", "1 большая двухспальная кровать"],
    "VIP ლუქსი": ["VIP Suite", "VIP люкс"],
    "ლუქსი": ["Deluxe", "Люкс"],
    "სტანდარტი": ["Standard", "Стандарт"],
    "საოჯახო": ["Family", "Семейный"],
    "სეზონური": ["Seasonal", "Сезонный"],
    "ნახვა": ["View", "Смотреть"],
    "დაჯავშნა": ["Book", "Забронировать"],
    "დარეკვა": ["Call", "Позвонить"],
    "წინა ფოტო": ["Previous photo", "Предыдущее фото"],
    "შემდეგი ფოტო": ["Next photo", "Следующее фото"],
    "1 King საწოლი": ["1 King bed", "1 кровать King"],
    "1 საწოლი": ["1 bed", "1 кровать"],
    "2 საწოლი": ["2 beds", "2 кровати"],
    "3 საწოლი": ["3 beds", "3 кровати"],
    "ამ ოთახში": ["This room fits", "В этом номере"],
    "— აირჩიეთ სხვა ოთახი.": ["— choose another room.", "— выберите другой номер."],
    "ჯაკუზი": ["Jacuzzi", "Джакузи"],
    "კონდიციონერი": ["Air conditioning", "Кондиционер"],
    "მაცივარი": ["Fridge", "Холодильник"],
    "აბაზანა": ["Bathroom", "Ванная"],
    "ცის ჭერი": ["Sky ceiling", "Потолок-небо"],
    "გადახდა ადგილზე · უფასო გაუქმება ჩამოსვლამდე 24 სთ-ით ადრე · შესვლა 13:00, გასვლა 12:00":
      ["Payment on site · Free cancellation up to 24h before arrival · Check-in 13:00, check-out 12:00",
       "Оплата на месте · Бесплатная отмена за 24 ч до заезда · Заезд 13:00, выезд 12:00"],

    /* CTA tile */
    "ვერ იპოვეთ სასურველი ოთახი?": ["Can't find the right room?", "Не нашли подходящий номер?"],
    "დაგვიკავშირდით და დაგეხმარებით საუკეთესო არჩევანში — შესვლა 13:00, გასვლა 12:00.": ["Contact us and we'll help you choose — check-in 13:00, check-out 12:00.", "Свяжитесь с нами, и мы поможем с выбором — заезд 13:00, выезд 12:00."],
    "დაგვიკავშირდით და დაგეხმარებით": ["Contact us and we'll help", "Свяжитесь с нами, и мы поможем"],

    /* breakfast add-on */
    "დაამატეთ საუზმე": ["Add breakfast", "Добавить завтрак"],
    "სტუმარი / ღამე": ["guest / night", "гость / ночь"],

    /* small tokens (keep last — longest strings above already handled) */
    "ჯამში:": ["Total:", "Итого:"],
    "/ღამე": ["/night", "/ночь"],
    "ოთახი": ["Room", "Номер"],
    "იან": ["Jan", "янв"], "თებ": ["Feb", "фев"], "მარ": ["Mar", "мар"], "აპრ": ["Apr", "апр"],
    "მაი": ["May", "мая"], "ივნ": ["Jun", "июн"], "ივლ": ["Jul", "июл"], "აგვ": ["Aug", "авг"],
    "სექ": ["Sep", "сен"], "ოქტ": ["Oct", "окт"], "ნოე": ["Nov", "ноя"], "დეკ": ["Dec", "дек"]
  };

  var KEYS = Object.keys(D).sort(function (a, b) { return b.length - a.length; });

  function getTranslationValue(entry, langIndex) {
    if (!entry) return "";
    if (Array.isArray(entry)) {
      if (langIndex === 2 && entry.length >= 3) return entry[2];
      if (langIndex === 1 && entry.length >= 2) return entry[1];
      return entry[0];
    }
    return entry;
  }

  /* ─── numeric patterns with plural handling ─── */
  function ruPlural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  var PATTERNS = [
    [/(\d+)\s*ღამე/g, function (n) { return n + (E === 0 ? (n === 1 ? " night" : " nights") : E === 2 ? " gece" : " " + ruPlural(n, "ночь", "ночи", "ночей")); }],
    [/(\d+)\s*სტუმარია/g, function (n) { return E === 0 ? n + " guests" : E === 2 ? n + " misafir" : n + " " + ruPlural(n, "гость", "гостя", "гостей"); }],
    [/(\d+)\s*სტუმარი/g, function (n) { return n + (E === 0 ? (n === 1 ? " guest" : " guests") : E === 2 ? " misafir" : " " + ruPlural(n, "гость", "гостя", "гостей")); }],
    [/(\d+)\s*ოთახი/g, function (n) { return n + (E === 0 ? (n === 1 ? " room" : " rooms") : E === 2 ? " oda" : " " + ruPlural(n, "номер", "номера", "номеров")); }],
    [/(\d+)\s*ნომერი/g, function (n) { return n + (E === 0 ? (n === 1 ? " room" : " rooms") : E === 2 ? " oda" : " " + ruPlural(n, "номер", "номера", "номеров")); }],
    [/დარჩა\s*(\d+)/g, function (n) { return E === 0 ? "only " + n + " left" : E === 2 ? "sadece " + n + " kaldı" : "осталось " + n; }],
    [/მაქსიმუმ\s*(\d+)/g, function (n) { return E === 0 ? "maximum " + n : E === 2 ? "en fazla " + n : "максимум " + n; }],
    [/(\d+)\s*მ²/g, function (n) { return n + " m²"; }]
  ];

  var KA_RE = /[Ⴀ-ჿ]/;

  function translateText(s) {
    if (!KA_RE.test(s)) return s;
    var i, k;
    /* numeric patterns first — plural forms beat literal word matches */
    for (i = 0; i < PATTERNS.length; i++) {
      s = s.replace(PATTERNS[i][0], function (m, n) { return PATTERNS[i][1](parseInt(n, 10)); });
    }
    for (i = 0; i < KEYS.length; i++) {
      if (!KA_RE.test(s)) return s;
      k = KEYS[i];
      if (s.indexOf(k) !== -1) {
        var translated = LANG === "tr" && TR_FALLBACK[k] ? TR_FALLBACK[k] : getTranslationValue(D[k], E);
        s = s.split(k).join(translated);
      }
    }
    return s;
  }

  /* exposed for the static-page build script (prerenders /en/ /ru/ /tr/) */
  window.AGAVA_T = translateText;

  var ATTRS = ["placeholder", "aria-label", "title", "alt"];

  function translateTree(root) {
    if (root.nodeType === 3) { /* text node */
      var t = translateText(root.nodeValue);
      if (t !== root.nodeValue) root.nodeValue = t;
      return;
    }
    if (root.nodeType !== 1) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = walker.nextNode())) {
      var v = translateText(node.nodeValue);
      if (v !== node.nodeValue) node.nodeValue = v;
    }
    var els = [root].concat(Array.prototype.slice.call(root.querySelectorAll("*")));
    els.forEach(function (el) {
      ATTRS.forEach(function (a) {
        var v = el.getAttribute && el.getAttribute(a);
        if (v && KA_RE.test(v)) el.setAttribute(a, translateText(v));
      });
    });
  }

  function boot() {
    translateTree(document.body);
    document.title = translateText(document.title);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (m.type === "characterData") {
          var v = translateText(m.target.nodeValue);
          if (v !== m.target.nodeValue) m.target.nodeValue = v;
        } else {
          Array.prototype.forEach.call(m.addedNodes, translateTree);
        }
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

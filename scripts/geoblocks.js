/* Make the homepage answer AI questions directly.
 *
 * A GEO audit of hotelagava.ge scored "Structured Information" 60/100: the
 * facts are all on the page, but buried mid-paragraph, so a model reading it
 * cannot lift "which rooms fit two guests, and what do they cost" out as a
 * citable answer. This script puts the answer first — a lead sentence and a
 * list — above each room section, spells the numbers out on the service
 * cards (11 parking spaces, 30 GEL breakfast, 70/50 transfer) and labels the
 * guest quotes as reviews.
 *
 * Prices come from js/rooms-data.js and are wrapped in data-price spans, so
 * syncprices.js and js/prices.js keep them current without touching this file.
 *
 *     node scripts/geoblocks.js            # insert what is missing
 *     node scripts/geoblocks.js --force    # rebuild every block
 *     node scripts/geoblocks.js --check    # report, change nothing
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.dirname(__dirname);
global.window = {};
require(path.join(ROOT, 'js', 'rooms-data.js'));
const PRICE = {};
for (const r of window.AGAVA_ROOMS_DATA) PRICE[r.slug] = r.price;

const FORCE = process.argv.includes('--force');
const CHECK = process.argv.includes('--check');

// ── what each language says ──────────────────────────────────────────────
const LANGS = {
  ka: {
    dir: '', cur: '₾', label: 'სტუმრის შეფასება',
    services: {
      'უფასო Wi-Fi': 'მაღალსიჩქარიანი ინტერნეტი სასტუმროს მთელ ტერიტორიაზე — ნომრებში, ლობიში და ეზოში. უფასო ყველა სტუმრისთვის.',
      'დაცული პარკინგი': 'უფასო და დაცული ავტოსადგომი სასტუმროს ეზოში — 11 ადგილი, მხოლოდ სტუმრებისთვის.',
      'საუზმე': 'საუზმე ყოველ დილით 08:00–11:00, 30 ₾ ერთ სტუმარზე — მრავალფეროვანი მენიუთი.',
      'ტრანსფერი': 'ტრანსფერი აეროპორტიდან — 70 ₾, აეროპორტამდე — 50 ₾. ერთი ავტომობილი, 4 ადგილი, 30–40 წუთი.',
      '24/7 მიღება': 'რეცეფცია მუშაობს 24 საათი — შესვლა 13:00-დან, გასვლა 12:00-მდე.',
      'სამრეცხაო და დაუთოება': 'სამრეცხაო და დაუთოება ადგილზე — 10 ₾, მზადდება 12 საათში.',
    },
    audience: {
      h2: 'სასტუმრო თბილისში კომფორტული დასვენებისთვის',
      lead: 'ვისთვის გამოდგება Hotel Agava:',
      items: [
        '<strong>წყვილებისთვის</strong> — ნომრები ორი სტუმრისთვის, მათ შორის პირადი ჯაკუზით',
        '<strong>ოჯახებისთვის</strong> — ნომრები 3–5 სტუმარზე; ფასი ნომერზეა, ბავშვებს ცალკე არ ემატება',
        '<strong>საქმიანი ვიზიტისთვის</strong> — უფასო Wi-Fi, 24-საათიანი რეცეფცია, პარკინგი ეზოში',
        '<strong>ხანგრძლივი დარჩენისთვის</strong> — სამრეცხაო ადგილზე, ლიფტი ოთხივე სართულზე',
      ],
    },
    rooms2: {
      h2: 'ნომრები ორი სტუმრისთვის',
      lead: 'ორი სტუმრისთვის Hotel Agava სამ ნომერს გთავაზობთ:',
      items: [
        ['standard', 'სტანდარტული ოთახი', '2 სტუმარი · კომპაქტური და პრაქტიკული, მოკლე ვიზიტისთვის'],
        ['lux', 'ლუქსი', '2 სტუმარი · მეტი სივრცე და კომფორტი'],
        ['superlux', 'სუპერლუქსი', '2 სტუმარი · ყველაზე ფართო ნომერი ორი სტუმრისთვის'],
      ],
    },
    jacuzzi: {
      h2: 'ნომრები პირადი ჯაკუზით',
      lead: 'Hotel Agava-ს ორი ნომერი აქვს პირადი ჯაკუზით — ორივე ორ სტუმარზე, ჯაკუზი უშუალოდ ნომერშია:',
      items: [
        ['jacuzzi-suite', 'ლუქსი ჯაკუზით', '2 სტუმარი · ჯაკუზი ნომერშივე'],
        ['jacuzzi', 'სუპერ ლუქსი ჯაკუზით', '2 სტუმარი · ყველაზე ფართო ჯაკუზიანი ნომერი'],
      ],
    },
    family: {
      h2: 'ოჯახური ნომრები 3–5 სტუმრისთვის',
      lead: 'ოჯახებისთვის სამი ვარიანტია:',
      items: [
        ['family3', 'საოჯახო ოთახი 3 სტუმარზე', 'ერთი ოთახი · მშობლები და ბავშვი ან სამი ზრდასრული'],
        ['family4', 'საოჯახო ოთახი 4 სტუმარზე', 'ერთი ოთახი · მეტი საძილე ადგილი'],
        ['twobedlux', 'ორ ოთახიანი ლუქსი', 'ორი ცალკე საძინებელი · ყველაზე დიდი ნომერი'],
      ],
    },
  },

  en: {
    dir: 'en', cur: 'GEL', label: 'Guest review',
    services: {
      'Free Wi-Fi': 'High-speed internet throughout the hotel — in the rooms, the lobby and the courtyard. Free for every guest.',
      'Secure parking': "Free, secure parking in the hotel's own courtyard — 11 spaces, for guests only.",
      'Breakfast': 'Breakfast every morning 08:00–11:00, 30 GEL per guest — with a varied menu.',
      'Transfer': 'Airport transfer — 70 GEL from the airport, 50 GEL to the airport. One car, four seats, 30–40 minutes.',
      '24/7 reception': 'The reception desk is open 24 hours — check-in from 13:00, check-out by 12:00.',
      'Laundry &amp; ironing': 'On-site laundry and ironing — 10 GEL, ready within 12 hours.',
    },
    audience: {
      h2: 'A hotel in Tbilisi for a comfortable stay',
      lead: 'Who Hotel Agava suits:',
      items: [
        '<strong>Couples</strong> — rooms for two guests, including ones with a private jacuzzi',
        '<strong>Families</strong> — rooms for 3–5 guests; the price is per room and children are not charged separately',
        '<strong>Business trips</strong> — free Wi-Fi, 24-hour reception, parking in the courtyard',
        '<strong>Longer stays</strong> — on-site laundry, a lift serving all four floors',
      ],
    },
    rooms2: {
      h2: 'Rooms for two guests',
      lead: 'Hotel Agava offers three room types for two guests:',
      items: [
        ['standard', 'Standard Room', '2 guests · compact and practical, for a short stay'],
        ['lux', 'Deluxe Room', '2 guests · more space and comfort'],
        ['superlux', 'Superior Suite', '2 guests · the largest room for two'],
      ],
    },
    jacuzzi: {
      h2: 'Rooms with a private jacuzzi',
      lead: 'Hotel Agava has two rooms with a private jacuzzi — both for two guests, with the jacuzzi inside the room:',
      items: [
        ['jacuzzi-suite', 'King Room with Spa Bath', '2 guests · jacuzzi inside the room'],
        ['jacuzzi', 'Super Suite with Jacuzzi', '2 guests · the largest room with a jacuzzi'],
      ],
    },
    family: {
      h2: 'Family rooms for 3–5 guests',
      lead: 'There are three options for families:',
      items: [
        ['family3', 'Family Room for 3 guests', 'one room · two parents and a child, or three adults'],
        ['family4', 'Family Room for 4 guests', 'one room · more sleeping space'],
        ['twobedlux', 'Two-Room Suite', 'two separate bedrooms · the largest room in the hotel'],
      ],
    },
  },

  ru: {
    dir: 'ru', cur: '₾', label: 'Отзыв гостя',
    services: {
      'Бесплатный Wi-Fi': 'Высокоскоростной интернет на всей территории отеля — в номерах, лобби и во дворе. Бесплатно для всех гостей.',
      'Охраняемая парковка': 'Бесплатная охраняемая парковка во дворе отеля — 11 мест, только для гостей.',
      'Завтрак': 'Завтрак каждое утро с 08:00 до 11:00, 30 ₾ с гостя — с разнообразным меню.',
      'Трансфер': 'Трансфер из аэропорта — 70 ₾, в аэропорт — 50 ₾. Одна машина, четыре места, 30–40 минут.',
      'Стойка регистрации 24/7': 'Стойка регистрации работает круглосуточно — заезд с 13:00, выезд до 12:00.',
      'Прачечная и глажка': 'Прачечная и глажка на месте — 10 ₾, готово за 12 часов.',
    },
    audience: {
      h2: 'Отель в Тбилиси для комфортного отдыха',
      lead: 'Кому подходит Hotel Agava:',
      items: [
        '<strong>Парам</strong> — номера для двух гостей, в том числе с собственным джакузи',
        '<strong>Семьям</strong> — номера на 3–5 гостей; цена указана за номер, за детей отдельно не доплачиваете',
        '<strong>Для деловых поездок</strong> — бесплатный Wi-Fi, круглосуточный ресепшен, парковка во дворе',
        '<strong>Для долгого проживания</strong> — прачечная на месте, лифт на все четыре этажа',
      ],
    },
    rooms2: {
      h2: 'Номера для двух гостей',
      lead: 'Для двух гостей в Hotel Agava есть три типа номеров:',
      items: [
        ['standard', 'Стандартный номер', '2 гостя · компактный и практичный, для короткой поездки'],
        ['lux', 'Люкс', '2 гостя · больше пространства и комфорта'],
        ['superlux', 'Суперлюкс', '2 гостя · самый просторный номер для двоих'],
      ],
    },
    jacuzzi: {
      h2: 'Номера с собственным джакузи',
      lead: 'В Hotel Agava два номера с собственным джакузи — оба на двух гостей, джакузи находится прямо в номере:',
      items: [
        ['jacuzzi-suite', 'Люкс с джакузи', '2 гостя · джакузи прямо в номере'],
        ['jacuzzi', 'Суперлюкс с джакузи', '2 гостя · самый просторный номер с джакузи'],
      ],
    },
    family: {
      h2: 'Семейные номера для 3–5 гостей',
      lead: 'Для семей есть три варианта:',
      items: [
        ['family3', 'Семейный номер на 3 гостей', 'одна комната · родители с ребёнком или трое взрослых'],
        ['family4', 'Семейный номер на 4 гостей', 'одна комната · больше спальных мест'],
        ['twobedlux', 'Двухкомнатный люкс', 'две отдельные спальни · самый большой номер'],
      ],
    },
  },

  tr: {
    dir: 'tr', cur: '₾', label: 'Misafir değerlendirmesi',
    services: {
      'Ücretsiz Wi-Fi': 'Otelin her yerinde yüksek hızlı internet — odalarda, lobide ve avluda. Tüm misafirler için ücretsiz.',
      'Güvenli otopark': 'Otelin kendi avlusunda ücretsiz ve güvenli otopark — 11 araçlık yer, yalnızca misafirlere.',
      'Kahvaltı': 'Her sabah 08:00–11:00 arası kahvaltı, kişi başı 30 ₾ — zengin menüyle.',
      'Transfer': 'Havalimanından transfer 70 ₾, havalimanına 50 ₾. Tek araç, dört kişilik, 30–40 dakika.',
      '24/7 resepsiyon': 'Resepsiyon 24 saat açıktır — giriş 13:00’ten itibaren, çıkış 12:00’ye kadar.',
      'Çamaşır ve ütü': 'Yerinde çamaşır ve ütü — 10 ₾, 12 saat içinde hazır.',
    },
    audience: {
      h2: "Tiflis'te konforlu bir konaklama için otel",
      lead: 'Hotel Agava kimler için uygun:',
      items: [
        '<strong>Çiftler için</strong> — iki kişilik odalar, özel jakuzili seçenekler dahil',
        '<strong>Aileler için</strong> — 3–5 kişilik odalar; fiyat oda başınadır, çocuklar için ayrıca ücret alınmaz',
        '<strong>İş seyahatleri için</strong> — ücretsiz Wi-Fi, 24 saat resepsiyon, avluda otopark',
        '<strong>Uzun konaklamalar için</strong> — yerinde çamaşır hizmeti, dört katın tamamına hizmet veren asansör',
      ],
    },
    rooms2: {
      h2: 'İki kişilik odalar',
      lead: 'İki misafir için Hotel Agava üç oda tipi sunar:',
      items: [
        ['standard', 'Standart Oda', '2 misafir · kompakt ve pratik, kısa konaklamalar için'],
        ['lux', 'Lüks Oda', '2 misafir · daha fazla alan ve konfor'],
        ['superlux', 'Süper Lüks', '2 misafir · iki kişilik en geniş oda'],
      ],
    },
    jacuzzi: {
      h2: 'Özel jakuzili odalar',
      lead: 'Hotel Agava’da özel jakuzili iki oda vardır — ikisi de iki kişilik, jakuzi odanın içindedir:',
      items: [
        ['jacuzzi-suite', 'Jakuzili Kral Odası', '2 misafir · jakuzi odanın içinde'],
        ['jacuzzi', 'Jakuzili Süper Süit', '2 misafir · jakuzili en geniş oda'],
      ],
    },
    family: {
      h2: '3–5 kişilik aile odaları',
      lead: 'Aileler için üç seçenek vardır:',
      items: [
        ['family3', '3 Kişilik Aile Odası', 'tek oda · anne baba ve bir çocuk ya da üç yetişkin'],
        ['family4', '4 Kişilik Aile Odası', 'tek oda · daha fazla yatak'],
        ['twobedlux', 'İki Odalı Süit', 'iki ayrı yatak odası · oteldeki en büyük oda'],
      ],
    },
  },
};

// ── building blocks ──────────────────────────────────────────────────────
function roomList(lang, key, cfg) {
  const L = LANGS[lang], base = L.dir ? '/' + L.dir : '';
  const lis = cfg.items.map(([slug, name, note]) =>
    `          <li><a href="${base}/rooms/${slug}/"><strong>${name}</strong></a> — ` +
    `<span data-price="${slug}">${PRICE[slug]}</span> ${L.cur} · ${note}</li>`
  ).join('\n');
  return `<div class="geo-answer" data-geo="${key}">\n` +
         `        <p class="rdp-desc geo-answer__lead"><strong>${cfg.lead}</strong></p>\n` +
         `        <ul class="geo-answer__list">\n${lis}\n        </ul>\n      </div>`;
}

function plainList(key, cfg) {
  const lis = cfg.items.map(t => `          <li>${t}</li>`).join('\n');
  return `<div class="geo-answer" data-geo="${key}">\n` +
         `        <p class="rdp-desc geo-answer__lead"><strong>${cfg.lead}</strong></p>\n` +
         `        <ul class="geo-answer__list">\n${lis}\n        </ul>\n      </div>`;
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* The audience list belongs under the opening paragraph, not above it —
 * that paragraph is the author's introduction and reads as the lede. Every
 * other block answers its heading, so it goes directly after the <h2>. */
function place(html, cfg, block, after) {
  const h2 = new RegExp(`<h2 class="section-title">${esc(cfg.h2)}</h2>`);
  const m = html.match(h2);
  if (!m) return { html, done: false, why: `სათაური ვერ ვიპოვე: ${cfg.h2}` };
  let at = m.index + m[0].length;
  if (after === 'paragraph') {
    const p = html.indexOf('</p>', at);
    if (p < 0) return { html, done: false, why: 'აბზაცი ვერ ვიპოვე' };
    at = p + 4;
  }
  return { html: html.slice(0, at) + '\n      ' + block + html.slice(at), done: true };
}

function strip(html, key) {
  return html.replace(
    new RegExp(`\\s*<div class="geo-answer" data-geo="${key}">[\\s\\S]*?</div>`, 'g'), '');
}

// ── the pass over one homepage ───────────────────────────────────────────
function run(lang) {
  const L = LANGS[lang];
  const file = path.join(ROOT, L.dir, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const notes = [];

  // 1. service cards state the numbers
  for (const [title, text] of Object.entries(L.services)) {
    const re = new RegExp(`(<h3>${esc(title)}</h3>\\s*<p>)([^<]*)(</p>)`);
    const m = html.match(re);
    if (!m) { notes.push(`სერვისი ვერ ვიპოვე: ${title}`); continue; }
    if (m[2] !== text) html = html.replace(re, `$1${text}$3`);
  }

  // 2. answer-first lists
  const blocks = [
    ['audience', L.audience, plainList('audience', L.audience), 'paragraph'],
    ['rooms2', L.rooms2, roomList(lang, 'rooms2', L.rooms2), 'heading'],
    ['jacuzzi', L.jacuzzi, roomList(lang, 'jacuzzi', L.jacuzzi), 'heading'],
    ['family', L.family, roomList(lang, 'family', L.family), 'heading'],
  ];
  for (const [key, cfg, block, where] of blocks) {
    const has = html.includes(`data-geo="${key}"`);
    if (has && !FORCE) continue;
    if (has) html = strip(html, key);
    const r = place(html, cfg, block, where);
    if (!r.done) { notes.push(r.why); continue; }
    html = r.html;
  }

  // 3. guest quotes are marked as reviews
  html = html.replace(/<blockquote class="review-quote([^"]*)"([^>]*)>/g,
    (m0, cls, rest) => rest.includes('aria-label')
      ? m0 : `<blockquote class="review-quote${cls}"${rest} aria-label="${L.label}">`);
  html = html.replace(/<div class="review-quote__name">([^<]*)<\/div>/g,
    '<cite class="review-quote__name">$1</cite>');

  if (html === before) return { lang, changed: false, notes };
  if (!CHECK) fs.writeFileSync(file, html);
  return { lang, changed: true, notes };
}

let changed = 0, problems = 0;
for (const lang of Object.keys(LANGS)) {
  const r = run(lang);
  const dir = LANGS[lang].dir || 'ka';
  console.log(`  ${dir.padEnd(3)} ${r.changed ? (CHECK ? 'შესაცვლელია' : 'განახლდა') : 'უცვლელი'}`);
  for (const n of r.notes) { console.log(`      ⚠ ${n}`); problems++; }
  if (r.changed) changed++;
}
console.log(`\n  ${changed} გვერდი${CHECK ? ' საჭიროებს განახლებას' : ' განახლდა'}${problems ? `, ${problems} გაფრთხილება` : ''}`);
process.exit(problems && CHECK ? 1 : 0);

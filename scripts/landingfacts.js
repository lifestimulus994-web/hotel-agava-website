/* A short facts box at the top of the homepage and the six landing pages.
 *
 * Same purpose as the one on room pages: an answer — human or machine —
 * needs the figures together. Each page gets only the facts that page is
 * about, and every price comes from js/rooms-data.js so nothing drifts.
 *
 *   node scripts/landingfacts.js [--check]
 */
const fs = require('fs'), path = require('path');
const ROOT = path.dirname(__dirname);
process.chdir(ROOT);
global.window = {};
require(path.join(ROOT, 'js', 'rooms-data.js'));
const R = Object.fromEntries(window.AGAVA_ROOMS_DATA.map(r => [r.slug, r]));
const MARK = 'landing-quickfacts';
const CHECK = process.argv.includes('--check');
const FORCE = process.argv.includes('--force');   // rewrite a block that is already there
const P = s => R[s].price;

const T = {
  ka: {
    head: 'მოკლედ', cur: '₾',
    hotel: 'სასტუმრო', rooms: 'ნომრები', free: 'უფასოდ', paid: 'დამატებით', rules: 'წესები', not: 'რა არ არის',
    hotelTxt: '21 ნომერი, 8 ტიპი · დიღომი, აკაკი ბელიაშვილის 161 · Google-ზე 4.8',
    freeTxt: 'Wi-Fi · პარკინგი ეზოში, 11 ადგილი · ლიფტი ოთხივე სართულზე · რეცეფცია 24 საათი',
    paidTxt: `საუზმე 30 ₾ (08:00–11:00) · ტრანსფერი ${'70'}/50 ₾ · სამრეცხაო 10 ₾ (12 საათი)`,
    rulesTxt: 'ჩასვლა 13:00-დან, გასვლა 12:00-მდე · ანგარიშსწორება ადგილზე, მხოლოდ ნაღდი ფულით',
    notTxt: 'რესტორანი, აუზი, სპა, სავარჯიშო და საკონფერენციო დარბაზი, ბარგის ოთახი, ვალუტის გადაცვლა',
    range: (a, b) => `${a}–${b} ₾ ღამეში`,
    two: () => `სტანდარტული ${P('standard')} ₾ · ლუქსი ${P('lux')} ₾ · სუპერლუქსი ${P('superlux')} ₾`,
    fam: () => `3 სტუმარი — 32 მ², ${P('family3')} ₾ · 4 სტუმარი — 38 მ², ${P('family4')} ₾ · 5 სტუმარი — 45 მ², ორი ოთახი, ${P('twobedlux')} ₾`,
    jac: () => `სუპერ ლუქსი ჯაკუზით — King საწოლი, ${P('jacuzzi')} ₾ · ლუქსი ჯაკუზით — 30 მ², ქალაქის ხედით, ${P('jacuzzi-suite')} ₾`,
    jacNote: 'ჯაკუზი თავად ნომერშია, საერთო სპა სივრცე არ არის',
    book: 'პირდაპირი დაჯავშნა: საიტიდან, ტელეფონით +995 597 12 12 12 ან WhatsApp-ით',
    work: 'Wi-Fi მუშაობს ნომრებშიც და საერთო სივრცეებშიც',
  },
  en: {
    head: 'In short', cur: 'GEL',
    hotel: 'The hotel', rooms: 'Rooms', free: 'Free', paid: 'Paid extras', rules: 'House rules', not: 'What there is not',
    hotelTxt: '21 rooms in 8 types · Dighomi, 161 Akaki Beliashvili St · 4.8 on Google',
    freeTxt: 'Wi-Fi · parking in the courtyard, 11 spaces · a lift to all four floors · reception open 24 hours',
    paidTxt: 'breakfast 30 GEL (08:00–11:00) · transfer 70/50 GEL · laundry 10 GEL (12 hours)',
    rulesTxt: 'check-in from 13:00, check-out by 12:00 · payment on site, in cash only',
    notTxt: 'no restaurant, pool, spa, gym, conference room, luggage room or currency exchange',
    range: (a, b) => `${a}–${b} GEL per night`,
    two: () => `standard ${P('standard')} GEL · deluxe ${P('lux')} GEL · superior ${P('superlux')} GEL`,
    fam: () => `3 guests — 32 m², ${P('family3')} GEL · 4 guests — 38 m², ${P('family4')} GEL · 5 guests — 45 m², two rooms, ${P('twobedlux')} GEL`,
    jac: () => `super suite with jacuzzi — King bed, ${P('jacuzzi')} GEL · jacuzzi suite — 30 m², city view, ${P('jacuzzi-suite')} GEL`,
    jacNote: 'the jacuzzi is inside the room; there is no shared spa area',
    book: 'Direct booking: on the site, by phone on +995 597 12 12 12 or on WhatsApp',
    work: 'Wi-Fi works both in the rooms and in the shared areas',
  },
  ru: {
    head: 'Коротко', cur: '₾',
    hotel: 'Отель', rooms: 'Номера', free: 'Бесплатно', paid: 'За отдельную плату', rules: 'Правила', not: 'Чего нет',
    hotelTxt: '21 номер, 8 типов · Дигоми, ул. Акакия Белиашвили, 161 · 4.8 в Google',
    freeTxt: 'Wi-Fi · парковка во дворе, 11 мест · лифт на все четыре этажа · ресепшен 24 часа',
    paidTxt: 'завтрак 30 ₾ (08:00–11:00) · трансфер 70/50 ₾ · прачечная 10 ₾ (12 часов)',
    rulesTxt: 'заезд с 13:00, выезд до 12:00 · оплата на месте, только наличными',
    notTxt: 'нет ресторана, бассейна, спа, спортзала, конференц-зала, камеры хранения и обмена валюты',
    range: (a, b) => `${a}–${b} ₾ за ночь`,
    two: () => `стандартный ${P('standard')} ₾ · люкс ${P('lux')} ₾ · суперлюкс ${P('superlux')} ₾`,
    fam: () => `3 гостя — 32 м², ${P('family3')} ₾ · 4 гостя — 38 м², ${P('family4')} ₾ · 5 гостей — 45 м², две комнаты, ${P('twobedlux')} ₾`,
    jac: () => `суперлюкс с джакузи — кровать King, ${P('jacuzzi')} ₾ · люкс с джакузи — 30 м², вид на город, ${P('jacuzzi-suite')} ₾`,
    jacNote: 'джакузи находится в самом номере, общей спа-зоны нет',
    book: 'Прямое бронирование: на сайте, по телефону +995 597 12 12 12 или в WhatsApp',
    work: 'Wi-Fi работает и в номерах, и в общих зонах',
  },
  tr: {
    head: 'Kısaca', cur: '₾',
    hotel: 'Otel', rooms: 'Odalar', free: 'Ücretsiz', paid: 'Ek ücretli', rules: 'Kurallar', not: 'Otelde olmayanlar',
    hotelTxt: '21 oda, 8 tip · Dighomi, Akaki Beliaşvili Cad. 161 · Google’da 4.8',
    freeTxt: 'Wi-Fi · avluda otopark, 11 araçlık yer · dört kata hizmet veren asansör · 24 saat resepsiyon',
    paidTxt: 'kahvaltı 30 ₾ (08:00–11:00) · transfer 70/50 ₾ · çamaşır 10 ₾ (12 saat)',
    rulesTxt: "giriş 13:00'ten itibaren, çıkış 12:00'ye kadar · ödeme otelde, yalnızca nakit",
    notTxt: 'restoran, havuz, spa, spor salonu, konferans salonu, bagaj odası ve döviz bozdurma yok',
    range: (a, b) => `gecelik ${a}–${b} ₾`,
    two: () => `standart ${P('standard')} ₾ · lüks ${P('lux')} ₾ · süper lüks ${P('superlux')} ₾`,
    fam: () => `3 misafir — 32 m², ${P('family3')} ₾ · 4 misafir — 38 m², ${P('family4')} ₾ · 5 misafir — 45 m², iki oda, ${P('twobedlux')} ₾`,
    jac: () => `jakuzili süper süit — King yatak, ${P('jacuzzi')} ₾ · jakuzili lüks oda — 30 m², şehir manzaralı, ${P('jacuzzi-suite')} ₾`,
    jacNote: 'jakuzi odanın içindedir, ortak spa alanı yoktur',
    book: 'Doğrudan rezervasyon: siteden, +995 597 12 12 12 numarasından ya da WhatsApp’tan',
    work: 'Wi-Fi hem odalarda hem ortak alanlarda çalışır',
  },
};

const prices = window.AGAVA_ROOMS_DATA.map(r => r.price);
const LOW = Math.min(...prices), HIGH = Math.max(...prices);

/* which lines each page gets */
const PAGES = {
  'home':                      t => [[t.hotel, t.hotelTxt], [t.rooms, t.range(LOW, HIGH)], [t.free, t.freeTxt], [t.paid, t.paidTxt], [t.rules, t.rulesTxt]],
  'business-hotel-tbilisi':    t => [[t.rooms, t.two()], [t.free, t.freeTxt], [t.paid, t.paidTxt], [t.rules, t.rulesTxt], [t.not, t.notTxt]],
  'family-hotel-tbilisi':      t => [[t.rooms, t.fam()], [t.free, t.freeTxt], [t.paid, t.paidTxt], [t.rules, t.rulesTxt]],
  'jacuzzi-rooms-tbilisi':     t => [[t.rooms, t.jac()], [t.hotel, t.jacNote], [t.free, t.freeTxt], [t.rules, t.rulesTxt], [t.not, t.notTxt]],
  'hotel-for-couples-tbilisi': t => [[t.rooms, `${t.two()} · ${t.jac()}`], [t.free, t.freeTxt], [t.paid, t.paidTxt], [t.rules, t.rulesTxt]],
  'amenities':                 t => [[t.free, t.freeTxt], [t.paid, t.paidTxt], [t.rules, t.rulesTxt], [t.not, t.notTxt]],
  'offers':                    t => [[t.rooms, t.range(LOW, HIGH)], [t.free, t.freeTxt], [t.paid, t.paidTxt], [t.hotel, t.book], [t.rules, t.rulesTxt]],
};

function box(lang, key) {
  const t = T[lang];
  const lines = PAGES[key](t)
    .map(([k, v]) => `        <li><strong>${k}:</strong> ${v}</li>\n`).join('');
  return `      <div class="${MARK}" style="border:1px solid rgba(212,175,106,.35);background:rgba(212,175,106,.06);border-radius:14px;padding:20px 24px;margin:0 0 32px">\n` +
    `        <p style="margin:0 0 8px;font-weight:600;letter-spacing:.02em">${t.head}</p>\n` +
    `        <ul style="margin:0;padding-left:18px;line-height:1.85">\n${lines}        </ul>\n      </div>\n`;
}

let done = 0, skipped = 0;
for (const key of Object.keys(PAGES)) {
  for (const lang of ['ka', 'en', 'ru', 'tr']) {
    const f = (lang === 'ka' ? '' : lang + '/') + (key === 'home' ? '' : key + '/') + 'index.html';
    if (!fs.existsSync(f)) { console.log('  ⚠️  missing', f); continue; }
    let h = fs.readFileSync(f, 'utf8');
    if (h.includes(MARK)) {
      if (!FORCE) { skipped++; continue; }
      h = h.replace(/\n?      <div class="landing-quickfacts"[\s\S]*?<\/ul>\n      <\/div>\n/, '');
    }
    const at = h.indexOf('<!-- landing-article -->');
    const at2 = at >= 0 ? at : h.indexOf('<section class="landing-article"');
    if (at2 < 0) { console.log('  ⚠️  no landing article in', f); continue; }
    /* the homepage keeps its block inside the section, after the opening div */
    let ins = at2;
    if (at < 0) {
      const d = h.indexOf('<div class="container container--narrow"', at2);
      ins = h.indexOf('>', d) + 1;
    }
    if (!CHECK) fs.writeFileSync(f, h.slice(0, ins) + '\n' + box(lang, key) + h.slice(ins));
    done++;
  }
}
console.log(`  ${CHECK ? 'იქნებოდა' : 'დაემატა'}: ${done} გვერდი · გამოტოვებული: ${skipped}`);

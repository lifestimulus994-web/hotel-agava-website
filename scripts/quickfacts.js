/* Put a short, quotable facts box at the top of every room page.
 *
 * AI answers and Google snippets lift a passage, not a page. A guest asking
 * "how much is the family room in Tbilisi" should find size, guests, beds,
 * price, what is in the room and the house rules in one block, in the page's
 * own language, instead of three paragraphs apart.
 *
 * Everything comes from js/rooms-data.js and from the page's own amenities
 * list, so the box cannot drift from the prices the rest of the site shows.
 *
 *   node scripts/quickfacts.js          # write
 *   node scripts/quickfacts.js --check  # report only
 */
const fs = require('fs'), path = require('path');
const ROOT = path.dirname(__dirname);
process.chdir(ROOT);
global.window = {};
require(path.join(ROOT, 'js', 'rooms-data.js'));
const ROOMS = window.AGAVA_ROOMS_DATA;
const MARK = 'room-quickfacts';
const CHECK = process.argv.includes('--check');
const FORCE = process.argv.includes('--force');   // rewrite a block that is already there

const L = {
  ka: { head: 'მოკლედ', size: 'ფართობი და სტუმრები', price: 'ფასი', inRoom: 'ნომერში',
        hotel: 'სასტუმროში', rules: 'ჩასვლა და გასვლა',
        night: '₾ ღამეში', bf: 'საუზმე ცალკე — 30 ₾ ერთ სტუმარზე',
        house: 'უფასო პარკინგი · ლიფტი ოთხივე სართულზე · 24-საათიანი რეცეფცია',
        rulesTxt: 'ჩასვლა 13:00-დან, გასვლა 12:00-მდე · ანგარიშსწორება ადგილზე, მხოლოდ ნაღდი ფულით',
        guests: n => `${n} სტუმარი`, area: n => `${n} მ²`, count: c => c },
  en: { head: 'In short', size: 'Size and guests', price: 'Price', inRoom: 'In the room',
        hotel: 'At the hotel', rules: 'Check-in and check-out',
        night: 'GEL per night', bf: 'breakfast is extra — 30 GEL per guest',
        house: 'free parking · a lift to all four floors · 24/7 reception',
        rulesTxt: 'check-in from 13:00, check-out by 12:00 · payment on site, in cash only',
        guests: n => `${n} guests`, area: n => `${n} m²`, count: c => c },
  ru: { head: 'Коротко', size: 'Площадь и гости', price: 'Цена', inRoom: 'В номере',
        hotel: 'В отеле', rules: 'Заезд и выезд',
        night: '₾ за ночь', bf: 'завтрак отдельно — 30 ₾ с гостя',
        house: 'бесплатная парковка · лифт на все четыре этажа · круглосуточный ресепшен',
        rulesTxt: 'заезд с 13:00, выезд до 12:00 · оплата на месте, только наличными',
        guests: n => `${n} гостя`, area: n => `${n} м²`, count: c => c },
  tr: { head: 'Kısaca', size: 'Alan ve misafir', price: 'Fiyat', inRoom: 'Odada',
        hotel: 'Otelde', rules: 'Giriş ve çıkış',
        night: '₾ gecelik', bf: 'kahvaltı ayrı — kişi başı 30 ₾',
        house: 'ücretsiz otopark · dört kata hizmet veren asansör · 7/24 resepsiyon',
        rulesTxt: "giriş 13:00'ten itibaren, çıkış 12:00'ye kadar · ödeme otelde, yalnızca nakit",
        guests: n => `${n} misafir`, area: n => `${n} m²`, count: c => c },
};
/* the Georgian spec strings are the source; every other language maps off them */
const BED = {
  '1 საწოლი':               { en: '1 bed', ru: '1 кровать', tr: '1 yatak' },
  '1 King საწოლი':          { en: '1 King bed', ru: '1 кровать King', tr: '1 King yatak' },
  '2 საწოლი':               { en: '2 beds', ru: '2 кровати', tr: '2 yatak' },
  '2 ოთახი, 3 საწოლი':      { en: '2 rooms, 3 beds', ru: '2 комнаты, 3 кровати', tr: '2 oda, 3 yatak' },
  '1 დიდი ორმაგი საწოლი':   { en: '1 large double bed', ru: '1 большая двуспальная кровать', tr: '1 geniş çift kişilik yatak' },
};
const COUNT = {
  '1 ნომერი': { en: 'the hotel has 1 room of this type', ru: 'в отеле 1 такой номер', tr: 'otelde bu tipte 1 oda var' },
  '2 ოთახი':  { en: 'the hotel has 2 rooms of this type', ru: 'в отеле 2 таких номера', tr: 'otelde bu tipte 2 oda var' },
  '3 ოთახი':  { en: 'the hotel has 3 rooms of this type', ru: 'в отеле 3 таких номера', tr: 'otelde bu tipte 3 oda var' },
  '5 ოთახი':  { en: 'the hotel has 5 rooms of this type', ru: 'в отеле 5 таких номеров', tr: 'otelde bu tipte 5 oda var' },
  '7 ოთახი':  { en: 'the hotel has 7 rooms of this type', ru: 'в отеле 7 таких номеров', tr: 'otelde bu tipte 7 oda var' },
};
const KA_COUNT = c => c.replace('ოთახი', 'ასეთი ნომერი').replace('ნომერი', 'ასეთი ნომერი').replace('ასეთი ასეთი', 'ასეთი');

function amenitiesOf(html) {
  const ul = html.match(/<ul class="rdp-amenities">[\s\S]*?<\/ul>/);
  if (!ul) return null;
  return [...ul[0].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
}

function box(lang, room, amenities) {
  const t = L[lang];
  const spec = Object.fromEntries(room.specs.map(s => [s.icon, s.text]));
  const area = (spec.size || '').replace(/[^\d]/g, '');
  const guests = (spec.guests || '').replace(/[^\d]/g, '');
  const bed = lang === 'ka' ? spec.bed : (BED[spec.bed] || {})[lang] || spec.bed;
  const jac = spec.jacuzzi ? { ka: ' · პირადი ჯაკუზი', en: ' · private jacuzzi', ru: ' · собственное джакузи', tr: ' · özel jakuzi' }[lang] : '';
  const sizeLine = [area && t.area(area), t.guests(guests), bed].filter(Boolean).join(', ') + jac;
  const count = lang === 'ka' ? KA_COUNT(room.count) : (COUNT[room.count] || {})[lang] || '';
  const li = (k, v) => `        <li><strong>${t[k]}:</strong> ${v}</li>\n`;
  return `\n  <div class="container container--narrow ${MARK}" style="margin-top:48px">\n` +
    `    <div style="border:1px solid rgba(212,175,106,.35);background:rgba(212,175,106,.06);border-radius:14px;padding:20px 24px">\n` +
    `      <p style="margin:0 0 8px;font-weight:600;letter-spacing:.02em">${t.head}</p>\n` +
    `      <ul style="margin:0;padding-left:18px;line-height:1.85">\n` +
    li('size', sizeLine) +
    li('price', `${room.price} ${t.night} · ${t.bf}`) +
    li('inRoom', amenities.join(' · ')) +
    li('hotel', [count, t.house].filter(Boolean).join(' · ')) +
    li('rules', t.rulesTxt) +
    `      </ul>\n    </div>\n  </div>\n`;
}

let done = 0, skipped = 0;
for (const room of ROOMS) {
  for (const lang of ['ka', 'en', 'ru', 'tr']) {
    const f = (lang === 'ka' ? '' : lang + '/') + `rooms/${room.slug}/index.html`;
    if (!fs.existsSync(f)) continue;
    let h = fs.readFileSync(f, 'utf8');
    if (h.includes(MARK)) {
      if (!FORCE) { skipped++; continue; }
      h = h.replace(/\n?  <div class="container container--narrow room-quickfacts"[\s\S]*?<\/div>\n  <\/div>\n/, '');
    }
    const am = amenitiesOf(h);
    if (!am || !am.length) { console.log(`  ⚠️  ${f}: amenities list not found`); continue; }
    const at = h.indexOf('<article class="container container--narrow room-article');
    if (at < 0) { console.log(`  ⚠️  ${f}: room article not found`); continue; }
    if (!CHECK) fs.writeFileSync(f, h.slice(0, at) + box(lang, room, am).trimStart() + '\n  ' + h.slice(at));
    done++;
  }
}
console.log(`  ${CHECK ? 'იქნებოდა' : 'დაემატა'}: ${done} გვერდი · გამოტოვებული (უკვე აქვს): ${skipped}`);

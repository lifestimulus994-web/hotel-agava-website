/* A comparison table on /rooms/ — one row per room type.
 *
 * The catalogue shows the rooms as cards, which a person scrolls and a
 * machine cannot compare. A table answers "which room for five people and
 * what does it cost" in one glance, and both Google and AI answers lift
 * tables as a unit. Built from js/rooms-data.js, so prices stay in step.
 *
 *   node scripts/roomstable.js [--check]
 */
const fs = require('fs'), path = require('path');
const ROOT = path.dirname(__dirname);
process.chdir(ROOT);
global.window = {};
require(path.join(ROOT, 'js', 'rooms-data.js'));
const ROOMS = window.AGAVA_ROOMS_DATA;
const MARK = 'rooms-compare';
const CHECK = process.argv.includes('--check');
const FORCE = process.argv.includes('--force');   // rewrite a block that is already there

const NAME = {
  standard:        { ka: 'სტანდარტული ნომერი', en: 'Standard room', ru: 'Стандартный номер', tr: 'Standart oda' },
  lux:             { ka: 'ლუქსი', en: 'Deluxe room', ru: 'Люкс', tr: 'Lüks oda' },
  superlux:        { ka: 'სუპერლუქსი', en: 'Superior suite', ru: 'Суперлюкс', tr: 'Süper lüks' },
  family3:         { ka: 'ოჯახური — 3 სტუმარი', en: 'Family room — 3 guests', ru: 'Семейный — 3 гостя', tr: 'Aile odası — 3 misafir' },
  family4:         { ka: 'ოჯახური — 4 სტუმარი', en: 'Family room — 4 guests', ru: 'Семейный — 4 гостя', tr: 'Aile odası — 4 misafir' },
  twobedlux:       { ka: 'ორ ოთახიანი ლუქსი', en: 'Two-room suite', ru: 'Двухкомнатный люкс', tr: 'İki odalı süit' },
  'jacuzzi-suite': { ka: 'ლუქსი ჯაკუზით', en: 'Jacuzzi suite', ru: 'Люкс с джакузи', tr: 'Jakuzili lüks oda' },
  jacuzzi:         { ka: 'სუპერ ლუქსი ჯაკუზით', en: 'Super suite with jacuzzi', ru: 'Суперлюкс с джакузи', tr: 'Jakuzili süper süit' },
};
const BED = {
  '1 საწოლი':             { en: '1 bed', ru: '1 кровать', tr: '1 yatak' },
  '1 King საწოლი':        { en: '1 King bed', ru: '1 кровать King', tr: '1 King yatak' },
  '2 საწოლი':             { en: '2 beds', ru: '2 кровати', tr: '2 yatak' },
  '2 ოთახი, 3 საწოლი':    { en: '2 rooms, 3 beds', ru: '2 комнаты, 3 кровати', tr: '2 oda, 3 yatak' },
  '1 დიდი ორმაგი საწოლი': { en: '1 large double bed', ru: '1 большая двуспальная кровать', tr: '1 geniş çift kişilik yatak' },
};
const T = {
  ka: { cap: 'ნომრების შედარება — ფართობი, სტუმრები და ფასი', room: 'ნომერი', size: 'ფართობი', guests: 'სტუმარი', bed: 'საწოლი', price: 'ფასი ღამეში', note: 'ფასი ნომერზეა, ერთი ღამით. საუზმე ფასში არ შედის — 30 ₾ ერთ სტუმარზე.' },
  en: { cap: 'Rooms compared — size, guests and price', room: 'Room', size: 'Size', guests: 'Guests', bed: 'Beds', price: 'Price per night', note: 'The price is per room, per night. Breakfast is not included — 30 GEL per guest.' },
  ru: { cap: 'Сравнение номеров — площадь, гости и цена', room: 'Номер', size: 'Площадь', guests: 'Гости', bed: 'Кровати', price: 'Цена за ночь', note: 'Цена за номер за ночь. Завтрак не входит — 30 ₾ с гостя.' },
  tr: { cap: 'Odaların karşılaştırması — alan, misafir ve fiyat', room: 'Oda', size: 'Alan', guests: 'Misafir', bed: 'Yatak', price: 'Gecelik fiyat', note: 'Fiyat oda başına, bir gecelik. Kahvaltı dahil değildir — kişi başı 30 ₾.' },
};
const HEAD = { ka: 'ჩვენი ნომრები', en: 'Our rooms', ru: 'Наши номера', tr: 'Odalarımız' };
const UNIT = { ka: 'მ²', en: 'm²', ru: 'м²', tr: 'm²' };

function table(lang) {
  const t = T[lang];
  const rows = ROOMS.map(r => {
    const spec = Object.fromEntries(r.specs.map(s => [s.icon, s.text]));
    const size = (spec.size || '').replace(/[^\d]/g, '');
    const guests = (spec.guests || '').replace(/[^\d]/g, '');
    const bed = lang === 'ka' ? spec.bed : (BED[spec.bed] || {})[lang] || spec.bed;
    const href = (lang === 'ka' ? '' : '/' + lang) + `/rooms/${r.slug}/`;
    return `          <tr>\n` +
      `            <td><a href="${href}">${NAME[r.slug][lang]}</a></td>\n` +
      `            <td>${size ? size + ' ' + UNIT[lang] : '—'}</td>\n` +
      `            <td>${guests}</td>\n` +
      `            <td>${bed}</td>\n` +
      `            <td><strong>${r.price} ₾</strong></td>\n` +
      `          </tr>\n`;
  }).join('');
  return `\n      <div class="${MARK}" style="margin:8px 0 40px;overflow-x:auto">\n` +
    `        <table style="width:100%;border-collapse:collapse;font-size:15.5px">\n` +
    `          <caption style="text-align:left;padding:0 0 12px;color:var(--ink-soft)">${t.cap}</caption>\n` +
    `          <thead>\n            <tr style="text-align:left;border-bottom:1px solid rgba(212,175,106,.45)">\n` +
    `              <th style="padding:10px 12px 10px 0">${t.room}</th>\n` +
    `              <th style="padding:10px 12px">${t.size}</th>\n` +
    `              <th style="padding:10px 12px">${t.guests}</th>\n` +
    `              <th style="padding:10px 12px">${t.bed}</th>\n` +
    `              <th style="padding:10px 0 10px 12px">${t.price}</th>\n` +
    `            </tr>\n          </thead>\n          <tbody>\n${rows}          </tbody>\n        </table>\n` +
    `        <p style="margin:12px 0 0;font-size:14px;color:var(--ink-soft)">${t.note}</p>\n      </div>\n`;
}

let done = 0, skipped = 0;
for (const lang of ['ka', 'en', 'ru', 'tr']) {
  const f = (lang === 'ka' ? '' : lang + '/') + 'rooms/index.html';
  let h = fs.readFileSync(f, 'utf8');
  if (h.includes(MARK)) {
    if (!FORCE) { skipped++; continue; }
    h = h.replace(/\n?      <div class="rooms-compare"[\s\S]*?<\/div>\n/, '');
  }
  const head = `<h2 class="section-title">${HEAD[lang]}</h2>`;
  const at = h.indexOf(head);
  if (at < 0) { console.log('  ⚠️  heading not found in', f); continue; }
  const grid = h.indexOf('<div class="rooms__grid">', at);
  if (grid < 0) { console.log('  ⚠️  room grid not found in', f); continue; }
  if (!CHECK) fs.writeFileSync(f, h.slice(0, grid) + table(lang).trimStart() + '      ' + h.slice(grid));
  done++;
}
console.log(`  ${CHECK ? 'იქნებოდა' : 'დაემატა'}: ${done} გვერდი · გამოტოვებული: ${skipped}`);

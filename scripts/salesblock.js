/* Put the rooms that are actually on sale at the top of /offers/.
 *
 * The hotel switches a sale on per room in the admin panel, and until now
 * that only showed as a struck-through figure on each room's own card. A
 * guest looking for a deal had nowhere to see them together, and "აქცია" /
 * "ფასდაკლება" is its own search, which /offers/ did not answer.
 *
 * The block is built from room_types, so it follows the admin panel: a room
 * switched off drops out, and when nothing is on sale the block is removed
 * rather than left standing empty — an offers page advertising no offers is
 * worse than one that simply lists the prices.
 *
 * Room names come from each language's own room page, so a rename there
 * carries over without touching this file. Figures are static: syncprices.js
 * runs this hourly, so they trail the database by at most an hour, the same
 * as every other price in the repo.
 *
 *     node scripts/salesblock.js            # build or refresh
 *     node scripts/salesblock.js --check    # report, change nothing
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.dirname(__dirname);
process.chdir(ROOT);
const CHECK = process.argv.includes('--check');

const cfg = fs.readFileSync('js/config.js', 'utf8');
const URL = (cfg.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1];
const KEY = (cfg.match(/(sb_publishable_[A-Za-z0-9_-]+)/) || [])[1];

const LANGS = {
  ka: {
    dir: '', cur: '₾',
    eyebrow: 'მიმდინარე აქცია',
    title: 'ნომრები ფასდაკლებით',
    lead: n => `ამ ${n} ნომერზე ახლა მოქმედებს ფასდაკლება. ფასი უკვე შემცირებულია — ჯავშნისას სხვა თანხა არ დაემატება.`,
    cols: ['ნომერი', 'ჩვეულებრივი ფასი', 'აქციის ფასი', 'ეკონომია'],
    night: 'ღამეში',
    cta: 'ნომრის ნახვა',
    note: 'ფასდაკლება მოქმედებს პირდაპირ საიტიდან დაჯავშნისას.',
  },
  en: {
    dir: 'en', cur: 'GEL',
    eyebrow: 'Current offer',
    title: 'Rooms on sale',
    lead: n => `${n} rooms are discounted right now. The price shown is what you pay — nothing is added at booking.`,
    cols: ['Room', 'Usual price', 'Sale price', 'You save'],
    night: 'per night',
    cta: 'See the room',
    note: 'The discount applies when you book directly on this site.',
  },
  ru: {
    dir: 'ru', cur: '₾',
    eyebrow: 'Текущая акция',
    title: 'Номера со скидкой',
    lead: n => `На ${n} номера сейчас действует скидка. Указана итоговая цена — при бронировании ничего не добавляется.`,
    cols: ['Номер', 'Обычная цена', 'Цена со скидкой', 'Экономия'],
    night: 'за ночь',
    cta: 'Посмотреть номер',
    note: 'Скидка действует при прямом бронировании на этом сайте.',
  },
  tr: {
    dir: 'tr', cur: '₾',
    eyebrow: 'Güncel kampanya',
    title: 'İndirimli odalar',
    lead: n => `Şu anda ${n} odada indirim var. Gösterilen fiyat ödeyeceğiniz fiyattır — rezervasyonda ek ücret çıkmaz.`,
    cols: ['Oda', 'Normal fiyat', 'İndirimli fiyat', 'Kazancınız'],
    night: 'gecelik',
    cta: 'Odayı gör',
    note: 'İndirim, bu siteden doğrudan rezervasyonda geçerlidir.',
  },
};

/* The room's name as that language's own page states it. */
function roomName(lang, slug) {
  const base = LANGS[lang].dir ? LANGS[lang].dir + '/' : '';
  const f = `${base}rooms/${slug}/index.html`;
  if (!fs.existsSync(f)) return slug;
  const m = fs.readFileSync(f, 'utf8').match(/<h1 class="rdp-title">([^<]*)/);
  return m ? m[1].replace(/\s*—.*$/, '').trim() : slug;
}

function block(lang, sales) {
  const L = LANGS[lang], base = L.dir ? '/' + L.dir : '';
  const rows = sales.map(s => {
    const off = Math.round((1 - s.sale / s.base) * 100);
    return `            <tr>\n` +
      `              <td><a href="${base}/rooms/${s.slug}/">${roomName(lang, s.slug)}</a></td>\n` +
      `              <td><s>${s.base} ${L.cur}</s></td>\n` +
      `              <td><strong>${s.sale} ${L.cur}</strong> ${L.night}</td>\n` +
      `              <td>−${s.base - s.sale} ${L.cur} (−${off}%)</td>\n` +
      `            </tr>`;
  }).join('\n');

  return `<section class="sales-block" data-geo="sales">\n` +
    `        <p class="section-eyebrow">${L.eyebrow}</p>\n` +
    `        <h2 class="section-title">${L.title}</h2>\n` +
    `        <p class="svc-desc">${L.lead(sales.length)}</p>\n` +
    `        <table class="sales-table">\n` +
    `          <thead>\n            <tr>${L.cols.map(c => `<th>${c}</th>`).join('')}</tr>\n          </thead>\n` +
    `          <tbody>\n${rows}\n          </tbody>\n` +
    `        </table>\n` +
    `        <p class="svc-note">${L.note}</p>\n` +
    `      </section>`;
}

function strip(html) {
  return html.replace(/\s*<section class="sales-block" data-geo="sales">[\s\S]*?<\/section>/g, '');
}

(async () => {
  let rows;
  try {
    const r = await fetch(
      `${URL}/rest/v1/room_types?select=slug,base_price,sale_price,sale_active,visible,sort&order=sort`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    rows = await r.json();
    if (!Array.isArray(rows)) throw new Error('unexpected answer');
  } catch (e) {
    console.log(`  ℹ️  ბაზა მიუწვდომელია (${e.message}) — აქციის ბლოკი უცვლელი რჩება`);
    return;
  }

  const sales = rows
    .filter(r => r.visible && r.sale_active && r.sale_price != null)
    .map(r => ({ slug: r.slug, base: Number(r.base_price), sale: Number(r.sale_price) }))
    .filter(s => s.sale > 0 && s.sale < s.base);

  let changed = 0;
  for (const lang of Object.keys(LANGS)) {
    const f = path.join(LANGS[lang].dir, 'offers', 'index.html');
    if (!fs.existsSync(f)) { console.log(`  ⚠ ვერ ვიპოვე: ${f}`); continue; }
    const before = fs.readFileSync(f, 'utf8');
    let html = strip(before);

    if (sales.length) {
      const anchor = html.match(/<p class="svc-desc">[\s\S]*?<\/p>/);
      if (!anchor) { console.log(`  ⚠ ჩასასმელი ადგილი ვერ ვიპოვე: ${f}`); continue; }
      const at = anchor.index + anchor[0].length;
      html = html.slice(0, at) + '\n\n      ' + block(lang, sales) + html.slice(at);
    }

    if (html === before) continue;
    if (!CHECK) fs.writeFileSync(f, html);
    changed++;
  }

  const what = sales.length
    ? `${sales.length} ნომერი ფასდაკლებით`
    : 'ფასდაკლება არსად არ არის ჩართული — ბლოკი მოიხსნა';
  console.log(`  ${what} · ${changed} გვერდი${CHECK ? ' შესაცვლელია' : ' განახლდა'}`);
})();

/* Write every room price on the site from js/rooms-data.js.
 *
 * A room on sale has two figures: the usual price, struck through, and the
 * sale price the guest actually pays. The struck-through one is for the eye
 * only. Everything a machine reads — the Offer in schema, the FAQ answers,
 * the hotel's priceRange, the AI files — states the price the guest pays,
 * because that is what check_availability charges.
 *
 * Prices used to be typed into prose by hand and drifted: one room page said
 * the superlux cost 300 ₾ while its own page said 350, the Turkish standard
 * room said 120. Now every figure on a page is a <span data-price="slug">,
 * and this file is the only thing that writes inside one. It rewrites from
 * scratch each time, so running it twice changes nothing.
 *
 *   node scripts/applyprices.js            # write
 *   node scripts/applyprices.js --check    # report what would change
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.dirname(__dirname);
process.chdir(ROOT);
const CHECK = process.argv.includes('--check');

global.window = {};
require(path.join(ROOT, 'js', 'rooms-data.js'));
const ROOMS = window.AGAVA_ROOMS_DATA;
const BY = Object.fromEntries(ROOMS.map(r => [r.slug, r]));

/* the price the guest pays: the sale price while it is lower, else the usual one */
const pays = r => (r.salePrice > 0 && r.salePrice < r.price ? r.salePrice : r.price);
const figure = r => pays(r) === r.price
  ? String(r.price)
  : `<s class="price-was">${r.price}</s> <span class="price-now">${pays(r)}</span>`;
const LO = Math.min(...ROOMS.map(pays)), HI = Math.max(...ROOMS.map(pays));

const FIG = '(?:<s class="price-was">\\d+</s> <span class="price-now">\\d+</span>|\\d+)';
const SPAN = new RegExp(`(<span data-price="([a-z0-9-]+)">)${FIG}(</span>)`, 'g');
const RANGE = /(<span data-price-range>)\d+–\d+(<\/span>)/g;

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const plain = h => h
  .replace(/<s class="price-was">\d+<\/s>\s*/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(parseInt(e[1] === 'x' ? e.slice(2) : e.slice(1), e[1] === 'x' ? 16 : 10)) : (ENT[e] ?? m))
  .replace(/\s+/g, ' ').trim();

const warn = [];

function walk(d, out) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/* FAQ answers in schema say what the visible answer says, price included */
function faqSchema(f, h) {
  const visible = new Map();
  for (const [, q, a] of h.matchAll(/<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)) {
    if (a.includes('data-price')) visible.set(plain(q), plain(a));
  }
  if (!visible.size) return h;
  return h.replace(/(<script type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (all, open, body, close) => {
    if (!body.includes('"FAQPage"')) return all;
    let data;
    try { data = JSON.parse(body); } catch { return all; }
    for (const q of [].concat(data.mainEntity || [])) {
      const want = visible.get(q.name);
      const have = q.acceptedAnswer && q.acceptedAnswer.text;
      if (want == null || want === have) continue;
      const from = JSON.stringify(have), to = JSON.stringify(want);
      if (!body.includes(from)) { warn.push(`${f}: FAQ-ის schema ვერ განვაახლე — «${q.name}»`); continue; }
      body = body.split(from).join(to);
    }
    return open + body + close;
  });
}

/* the Offer under each HotelRoom, found by the room's own url */
function offerSchema(h) {
  return h.replace(/(<script type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (all, open, body, close) => {
    if (!body.includes('"HotelRoom"')) return all;
    body = body.replace(/("url":"https:\/\/hotelagava\.ge\/(?:[a-z]{2}\/)?rooms\/([a-z0-9-]+)\/"[\s\S]*?"@type":"Offer","price":)(\d+)/g,
      (m, head, slug, _p) => {
        if (!BY[slug]) return m;
        /* never reach past the next room into its offer */
        if (head.indexOf('"@type":"HotelRoom"') > 0) return m;
        return head + pays(BY[slug]);
      });
    return open + body + close;
  });
}

let changed = 0;
for (const f of walk('.', [])) {
  const before = fs.readFileSync(f, 'utf8');
  let h = before.replace(SPAN, (m, open, slug, close) => {
    if (!BY[slug]) { warn.push(`${f}: უცნობი ნომერი data-price="${slug}"`); return m; }
    return open + figure(BY[slug]) + close;
  });
  h = h.replace(RANGE, `$1${LO}–${HI}$2`);
  h = h.replace(/"priceRange":"\d+₾–\d+₾"/g, `"priceRange":"${LO}₾–${HI}₾"`);
  h = offerSchema(h);
  h = faqSchema(f, h);
  if (h === before) continue;
  changed++;
  if (!CHECK) fs.writeFileSync(f, h);
}

/* llms.txt is hand-written; its price lines follow the rooms */
{
  const before = fs.readFileSync('llms.txt', 'utf8');
  let t = before.replace(/\d+–\d+ GEL per night/, `${LO}–${HI} GEL per night`);
  for (const r of ROOMS) {
    const note = pays(r) === r.price ? '' : ` (usually ${r.price} GEL)`;
    t = t.replace(new RegExp(`(rooms/${r.slug}/\\)[^\\n]*?)\\d+ GEL(?: \\(usually \\d+ GEL\\))?`), `$1${pays(r)} GEL${note}`);
  }
  if (t !== before) { changed++; if (!CHECK) fs.writeFileSync('llms.txt', t); }
}

for (const w of warn) console.log(`  ⚠️  ${w}`);
const sale = ROOMS.filter(r => pays(r) !== r.price).length;
console.log(`  ფასები: ${LO}–${HI} ₾ · ${sale} ნომერი ფასდაკლებით · ${changed} ფაილი${CHECK ? ' შესაცვლელია' : ' განახლდა'}`);
if (CHECK && changed) process.exitCode = 1;

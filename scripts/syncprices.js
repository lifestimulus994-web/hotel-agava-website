/* Keep the site's prices in step with the booking database.
 *
 * Prices live in two places and that is how a guest came to see 150 ₾ on the
 * homepage and 120 ₾ on the room page: the booking widget overwrites the
 * card from room_types.base_price at runtime, while every static page, the
 * schema and the AI files keep what js/rooms-data.js says. The database is
 * the one the hotel edits, so it wins; this makes the repo follow it.
 *
 * Reads room_types with the site's own publishable key — no secret needed.
 * When the backend is unreachable it changes nothing and says so.
 *
 *   node scripts/syncprices.js [--check]
 */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.dirname(__dirname);
process.chdir(ROOT);
const CHECK = process.argv.includes('--check');

const cfg = fs.readFileSync('js/config.js', 'utf8');
const URL = (cfg.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1];
const KEY = (cfg.match(/(sb_publishable_[A-Za-z0-9_-]+)/) || [])[1];
global.window = {};
require(path.join(ROOT, 'js', 'rooms-data.js'));
const LOCAL = window.AGAVA_ROOMS_DATA;

(async () => {
  let rows;
  try {
    const r = await fetch(`${URL}/rest/v1/room_types?select=slug,base_price,visible`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    rows = await r.json();
    if (!Array.isArray(rows)) throw new Error('unexpected answer');
  } catch (e) {
    console.log(`  ℹ️  ბაზა მიუწვდომელია (${e.message}) — ფასები უცვლელი რჩება`);
    return;
  }

  const db = Object.fromEntries(rows.map(r => [r.slug, Number(r.base_price)]));
  const diffs = LOCAL
    .filter(r => db[r.slug] != null && db[r.slug] !== r.price)
    .map(r => ({ slug: r.slug, from: r.price, to: db[r.slug] }));

  if (!diffs.length) { console.log(`  ✅ ფასები ემთხვევა (${LOCAL.length} ნომერი)`); return; }
  for (const d of diffs) console.log(`  ⚠️  ${d.slug}: კოდში ${d.from} ₾, ბაზაში ${d.to} ₾`);
  if (CHECK) return;

  /* rooms-data.js is the mirror the static pages read */
  let data = fs.readFileSync('js/rooms-data.js', 'utf8');
  for (const d of diffs) {
    const re = new RegExp(`(slug:\\s*"${d.slug}"[\\s\\S]{0,400}?price:\\s*)${d.from}\\b`);
    if (!re.test(data)) { console.log(`  ❌ ${d.slug}: ფასი ვერ ვიპოვე rooms-data.js-ში`); continue; }
    data = data.replace(re, `$1${d.to}`);
  }
  fs.writeFileSync('js/rooms-data.js', data);

  for (const s of ['quickfacts.js --force', 'roomstable.js --force', 'landingfacts.js --force', 'llmsfull.js']) {
    cp.execSync(`node scripts/${s}`, { stdio: 'inherit' });
  }


  /* the room's own page states its price three more times: the headline
     figure, the Offer in schema, and the HotelRoom offer on /rooms/ */
  for (const d of diffs) {
    for (const lang of ['', 'en/', 'ru/', 'tr/']) {
      const f = `${lang}rooms/${d.slug}/index.html`;
      if (!fs.existsSync(f)) continue;
      let h = fs.readFileSync(f, 'utf8');
      h = h.replace(new RegExp(`(<p class="rdp-price">)${d.from}( ₾)`), `$1${d.to}$2`);
      h = h.replace(new RegExp(`("price":)${d.from}\\b`, 'g'), `$1${d.to}`);
      fs.writeFileSync(f, h);
    }
    for (const lang of ['', 'en/', 'ru/', 'tr/']) {
      const f = `${lang}rooms/index.html`;
      let h = fs.readFileSync(f, 'utf8');
      const re = new RegExp(`(data-room-slug="${d.slug}"[\\s\\S]{0,1200}?)${d.from}( ₾)`);
      h = h.replace(re, `$1${d.to}$2`);
      const ld = new RegExp(`("name":"[^"]*"[^}]*"offers":\\{"@type":"Offer","price":)${d.from}\\b`, 'g');
      fs.writeFileSync(f, h.replace(ld, `$1${d.to}`));
    }
  }


  /* the sentences that state a price in words, on that room's own page */
  const PHRASES = [
    ['', p => [`ღირს ${p} ₾`]],
    ['en/', p => [`costs ${p} GEL`]],
    ['ru/', p => [`стоит ${p} ₾`]],
    ['tr/', p => [`gecelik ${p} ₾`]],
  ];
  for (const d of diffs) {
    for (const [lang, make] of PHRASES) {
      const f = `${lang}rooms/${d.slug}/index.html`;
      if (!fs.existsSync(f)) continue;
      let h = fs.readFileSync(f, 'utf8');
      const from = make(d.from), to = make(d.to);
      from.forEach((pat, i) => { h = h.split(pat).join(to[i]); });
      fs.writeFileSync(f, h);
    }
  }

  /* the hotel's price range, in schema and in the AI index */
  const prices = LOCAL.map(r => r.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  for (const f of ['index.html', 'en/index.html', 'ru/index.html', 'tr/index.html']) {
    let h = fs.readFileSync(f, 'utf8');
    h = h.replace(/"priceRange":"\d+₾–\d+₾"/, `"priceRange":"${lo}₾–${hi}₾"`);
    fs.writeFileSync(f, h);
  }
  {
    let t = fs.readFileSync('llms.txt', 'utf8');
    t = t.replace(/\d+–\d+ GEL per night/, `${lo}–${hi} GEL per night`);
    for (const r of LOCAL) {
      t = t.replace(new RegExp(`(rooms/${r.slug}/\\)[^\n]*?)\\d+ GEL`), `$1${r.price} GEL`);
    }
    fs.writeFileSync('llms.txt', t);
  }

  /* prose and FAQ answers are written by hand; they cannot be regenerated */
  const stale = [];
  const files = [];
  (function w(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const p = path.join(d, e.name);
      e.isDirectory() ? w(p) : /\.(html|txt)$/.test(e.name) && files.push(p.replace(/^\.\//, ''));
    }
  })('.');
  for (const f of files) {
    const h = fs.readFileSync(f, 'utf8');
    for (const d of diffs) {
      const re = new RegExp(`[^\\d](${d.from})\\s*(₾|GEL|лари|ლარ)`, 'g');
      if (re.test(h)) stale.push(`${f} — ჯერ კიდევ ${d.from} ₾`);
    }
  }
  console.log(stale.length
    ? `  ⚠️  ხელით დაწერილ ტექსტში ძველი ფასი დარჩა:\n   ${[...new Set(stale)].join('\n   ')}`
    : '  ✅ ტექსტებშიც ყველგან ახალი ფასია');
})();

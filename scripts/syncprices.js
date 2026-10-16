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

/* sql/sale.sql may not have been applied yet, in which case asking for
   the sale columns is a 400 — then every room simply has no sale */
async function load() {
  for (const cols of ['slug,base_price,sale_price,sale_active,visible', 'slug,base_price,visible']) {
    const r = await fetch(`${URL}/rest/v1/room_types?select=${cols}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (r.status === 400 && cols.includes('sale')) continue;
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error('unexpected answer');
    return rows;
  }
}

(async () => {
  let rows;
  try {
    rows = await load();
  } catch (e) {
    console.log(`  ℹ️  ბაზა მიუწვდომელია (${e.message}) — ფასები უცვლელი რჩება`);
    return;
  }

  /* a sale counts only while it is switched on and actually lower */
  const db = Object.fromEntries(rows.map(r => {
    const base = Number(r.base_price);
    let sale = r.sale_active && r.sale_price != null ? Number(r.sale_price) : 0;
    if (!(sale > 0) || sale >= base) sale = 0;
    return [r.slug, { price: base, salePrice: sale }];
  }));
  const diffs = LOCAL
    .filter(r => db[r.slug] && (db[r.slug].price !== r.price || db[r.slug].salePrice !== (r.salePrice || 0)))
    .map(r => ({ slug: r.slug, from: r, to: db[r.slug] }));

  if (!diffs.length) {
    console.log(`  ✅ ფასები ემთხვევა (${LOCAL.length} ნომერი)`);
  } else {
    for (const d of diffs) {
      const show = p => p.salePrice ? `${p.price} → ${p.salePrice} ₾` : `${p.price} ₾`;
      console.log(`  ⚠️  ${d.slug}: კოდში ${show(d.from)}, ბაზაში ${show(d.to)}`);
    }
    if (CHECK) return;

    /* rooms-data.js is the mirror the static pages read */
    let data = fs.readFileSync('js/rooms-data.js', 'utf8');
    for (const d of diffs) {
      const re = new RegExp(`(slug:\\s*"${d.slug}"[\\s\\S]{0,400}?price:\\s*)\\d+(,\\s*salePrice:\\s*\\d+)?`);
      if (!re.test(data)) { console.log(`  ❌ ${d.slug}: ფასი ვერ ვიპოვე rooms-data.js-ში`); continue; }
      data = data.replace(re, `$1${d.to.price},\n      salePrice: ${d.to.salePrice}`);
    }
    fs.writeFileSync('js/rooms-data.js', data);

    for (const s of ['quickfacts.js --force', 'roomstable.js --force', 'landingfacts.js --force', 'geoblocks.js --force', 'salesblock.js']) {
      cp.execSync(`node scripts/${s}`, { stdio: 'inherit' });
    }
  }
  if (CHECK) return;

  /* every figure, the schema, the FAQ answers and llms.txt follow
     rooms-data from here — run every time, it changes nothing when in step */
  cp.execSync('node scripts/applyprices.js', { stdio: 'inherit' });
  cp.execSync('node scripts/llmsfull.js', { stdio: 'inherit' });
})();

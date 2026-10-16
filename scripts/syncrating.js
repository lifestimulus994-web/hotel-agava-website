/* Keep the Google rating and review count in step with the admin panel.
 *
 * The site states them in about sixty places across four languages — the
 * homepage counter, the reviews block, the facts boxes, room hubs, llms.txt —
 * and they were typed by hand, so the site said 355 reviews while Google
 * showed 382. The hotel now types both figures once in /admin (Rooms →
 * Google შეფასება), which stores them in app_settings; this writes them into
 * every <span data-gbp="rating|count"> and the counter's data-count.
 *
 * Reads app_settings with the site's own publishable key — no secret needed.
 * When the backend is unreachable, or the figures were never entered, it
 * changes nothing and says so.
 *
 *   node scripts/syncrating.js [--check]
 *   node scripts/syncrating.js 4.8 382     # without the database
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.dirname(__dirname);
process.chdir(ROOT);
const CHECK = process.argv.includes('--check');

const cfg = fs.readFileSync('js/config.js', 'utf8');
const URL = (cfg.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1];
const KEY = (cfg.match(/(sb_publishable_[A-Za-z0-9_-]+)/) || [])[1];

/* Russian counts its nouns: 381 отзыв, 382 отзыва, 385 отзывов —
   and after «по» the dative: по 381 отзыву, по 382 отзывам */
function ruNoun(n, word) {
  const one = n % 10 === 1 && n % 100 !== 11;
  const few = [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100);
  if (/^отзыв(ам|у)$/.test(word)) return one ? 'отзыву' : 'отзывам';
  return one ? 'отзыв' : few ? 'отзыва' : 'отзывов';
}

function files(d, out) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) files(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/* figures can also be given by hand: node scripts/syncrating.js 4.8 382 */
const ARGS = process.argv.slice(2).filter(a => !a.startsWith('--'));

(async () => {
  let rows;
  if (ARGS.length === 2) rows = [{ key: 'google_rating', value: ARGS[0] }, { key: 'google_reviews', value: ARGS[1] }];
  else try {
    const r = await fetch(`${URL}/rest/v1/app_settings?select=key,value&key=in.(google_rating,google_reviews)`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    rows = await r.json();
    if (!Array.isArray(rows)) throw new Error('unexpected answer');
  } catch (e) {
    console.log(`  ℹ️  ბაზა მიუწვდომელია (${e.message}) — Google შეფასება უცვლელი რჩება`);
    return;
  }

  const kv = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const rating = Number(String(kv.google_rating || '').replace(',', '.'));
  const count = Number(kv.google_reviews);
  if (!(rating >= 1 && rating <= 5) || !(count > 0) || count % 1) {
    console.log('  ℹ️  Google შეფასება ადმინში ჯერ არ არის შეყვანილი — უცვლელი რჩება');
    return;
  }
  const R = rating.toFixed(1), C = String(count);

  let changed = 0;
  const write = (f, before, after) => {
    if (after === before) return;
    changed++;
    if (!CHECK) fs.writeFileSync(f, after);
  };

  for (const f of files('.', [])) {
    const before = fs.readFileSync(f, 'utf8');
    if (!before.includes('data-gbp')) continue;
    let h = before
      .replace(/(<span data-gbp="rating">)[\d.]+(<\/span>)/g, `$1${R}$2`)
      .replace(/(<span data-gbp="count">)\d+(<\/span>)/g, `$1${C}$2`)
      .replace(/(data-count=")\d+(" data-gbp="count">)\d+(<\/span>)/g, `$1${C}$2${C}$3`)
      .replace(/(data-count=")[\d.]+(" data-decimal="1" data-gbp="rating">)[\d.]+(<\/span>)/g, `$1${R}$2${R}$3`);
    if (/(^|[\\/])ru[\\/]/.test(f)) {
      h = h.replace(/(<span data-gbp="count">(\d+)<\/span>\s*)(отзыв(?:ов|ам|а|у)?)(?![а-я])/g,
        (m, head, n, word) => head + ruNoun(Number(n), word));
    }
    write(f, before, h);
  }

  /* llms.txt is hand-written: "Rated 4.8 on Google from 355 reviews." */
  {
    const before = fs.readFileSync('llms.txt', 'utf8');
    write('llms.txt', before, before.replace(/Rated [\d.]+ on Google from \d+ reviews/, `Rated ${R} on Google from ${C} reviews`));
  }

  /* i18n.js keys the Georgian sentence by its exact text, figures included */
  {
    const before = fs.readFileSync('js/i18n.js', 'utf8');
    const after = before
      .replace(/(· )\d+( შეფასება · Google)/g, `$1${C}$2`)
      .replace(/(· )\d+( reviews · Google)/g, `$1${C}$2`)
      .replace(/(· )\d+( değerlendirme · Google)/g, `$1${C}$2`)
      .replace(/(· )\d+ отзыв(?:ов|а)?( · Google)/g, (m, a, b) => `${a}${C} ${ruNoun(count, 'отзывов')}${b}`);
    write('js/i18n.js', before, after);
  }

  console.log(`  Google: ${R} · ${C} შეფასება · ${changed} ფაილი${CHECK ? ' შესაცვლელია' : ' განახლდა'}`);
})();

/* Give every photo its small versions.
 *
 * The room catalogue weighed 1.9MB on a phone: eleven photos, one of which
 * had a srcset and ten of which handed the phone the 1600px original. The
 * resized files already existed — nothing referenced them.
 *
 *   node scripts/srcsets.js [--check]
 */
const fs = require('fs'), path = require('path');
const ROOT = path.dirname(__dirname);
process.chdir(ROOT);
const CHECK = process.argv.includes('--check');

const variants = src => {
  const base = src.replace(/\.(webp|jpg|jpeg|png)$/, '');
  const out = [];
  for (const [w, ext] of [[480, 'webp'], [800, 'webp']]) {
    const f = `${base}-${w}w.${ext}`;
    if (fs.existsSync('.' + f)) out.push(`${f} ${w}w`);
  }
  const full = fs.existsSync('.' + base + '.webp') ? base + '.webp' : src;
  if (out.length) out.push(`${full} 1600w`);
  return out;
};

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : e.name.endsWith('.html') && files.push(p.replace(/^\.\//, ''));
  }
})('.');

let added = 0, pages = 0;
for (const f of files) {
  let h = fs.readFileSync(f, 'utf8'); const before = h;
  h = h.replace(/<img\b[^>]*>/g, tag => {
    if (/srcset=/.test(tag)) return tag;
    const src = (tag.match(/src="(\/assets\/[^"]+\.(?:webp|jpg|jpeg|png))"/) || [])[1];
    if (!src || /logo/.test(src)) return tag;          // the logo is tiny and fixed-size
    const set = variants(src);
    if (!set.length) return tag;
    const tile = /room-slider__img|room-tile|blog-card/.test(tag);
    const sizes = tile ? '(max-width: 860px) 100vw, 420px' : '(max-width: 820px) 100vw, 760px';
    added++;
    return tag.replace(/<img\b/, `<img srcset="${set.join(', ')}" sizes="${sizes}"`);
  });
  if (h !== before) { pages++; if (!CHECK) fs.writeFileSync(f, h); }
}
console.log(`  ${CHECK ? 'დაემატებოდა' : 'დაემატა'} srcset: ${added} სურათს · ${pages} გვერდზე`);

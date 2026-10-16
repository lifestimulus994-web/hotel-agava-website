/* llms-full.txt — every fact the site states, in one file.
 *
 * llms.txt is the index; this is the body. An assistant that fetches one
 * file should be able to answer any ordinary question about the hotel —
 * price, size, policy, what is not available — without crawling 100 pages
 * and without guessing. Generated from the English pages, so it can never
 * say something the site does not.
 *
 *   node scripts/llmsfull.js
 */
const fs = require('fs'), path = require('path');
const ROOT = path.dirname(__dirname);
process.chdir(ROOT);
/* a room on sale shows its usual price struck through; the AI file states
   only what the guest pays */
const txt = s => s.replace(/<s class="price-was">\d+<\/s>\s*/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const p = path.join(d, e.name).split(path.sep).join('/');
    if (e.isDirectory()) walk(p);
    else if (e.name === 'index.html' && /^en\//.test(p.replace(/^\.\//, ''))) pages.push(p.replace(/^\.\//, ''));
  }
})('.');

const order = f => (f === 'en/index.html' ? 0 : f.startsWith('en/rooms/index') ? 1 : f.startsWith('en/rooms/') ? 2 : f.startsWith('en/services/') ? 4 : 3);
pages.sort((a, b) => order(a) - order(b) || a.localeCompare(b));

let out = `# Hotel Agava — full reference\n\n` +
  `> Every fact the site states about the hotel, generated from the English pages on ${new Date().toISOString().slice(0, 10)}.\n` +
  `> Georgian: https://hotelagava.ge/ · Russian: /ru/ · Turkish: /tr/\n` +
  `> Prices are in Georgian lari (GEL, ₾) and are per room per night unless noted.\n\n`;

for (const f of pages) {
  const h = fs.readFileSync(f, 'utf8');
  if (/name="robots"[^>]*noindex/.test(h)) continue;
  const url = 'https://hotelagava.ge/' + f.replace(/index\.html$/, '');
  const h1 = txt((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1]);
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1];
  out += `## ${h1 || url}\n${url}\n`;
  if (desc) out += `${desc}\n`;

  const facts = h.match(/<div class="(?:container container--narrow )?(?:room-quickfacts|landing-quickfacts)"[\s\S]*?<\/ul>/);
  if (facts) {
    for (const li of facts[0].matchAll(/<li>([\s\S]*?)<\/li>/g)) out += `- ${txt(li[1])}\n`;
  }
  const faq = [...h.matchAll(/<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)];
  if (faq.length) {
    out += `\nQ&A:\n`;
    for (const [, q, a] of faq) out += `- ${txt(q)} — ${txt(a)}\n`;
  }
  out += '\n';
}
fs.writeFileSync('llms-full.txt', out);
console.log(`  llms-full.txt · ${pages.length} გვერდი · ${(Buffer.byteLength(out) / 1024).toFixed(1)} KB`);

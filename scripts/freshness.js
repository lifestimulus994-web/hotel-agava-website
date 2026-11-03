/* Put each page's real last-changed date on the page, visibly and in schema.
 *
 * Search engines and AI answers both prefer a page that says when it was
 * last checked — and a hotel page that quietly goes stale on prices is
 * worse than useless. The date is not typed by hand: it is the date of the
 * last commit that touched the file, so it cannot flatter the page.
 *
 *   node scripts/freshness.js [--check]
 */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.dirname(__dirname);
process.chdir(ROOT);
const CHECK = process.argv.includes('--check');
const SITE = 'https://hotelagava.ge';
const GIT = process.env.GIT_BIN || 'git';   // this laptop keeps a working git outside PATH

const MONTH = {
  ka: ['იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი','ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  ru: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
  tr: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
};
const LABEL = { ka: 'განახლდა', en: 'Updated', ru: 'Обновлено', tr: 'Güncellendi' };
const fmt = (lang, iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const month = MONTH[lang][m - 1];
  return lang === 'en' ? `${d} ${month} ${y}` : `${d} ${month} ${y}`;
};

function lastCommitDate(f) {
  try {
    const out = cp.execSync(`"${GIT}" log -1 --format=%cs -- "${f}"`, { encoding: 'utf8' }).trim();
    return out || new Date().toISOString().slice(0, 10);
  } catch { return new Date().toISOString().slice(0, 10); }
}

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'work') continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : e.name === 'index.html' && files.push(p.replace(/^\.\//, ''));
  }
})('.');

let written = 0, same = 0;
for (const f of files) {
  let h = fs.readFileSync(f, 'utf8');
  if (/name="robots"[^>]*noindex/.test(h)) continue;
  const lang = (f.match(/^(en|ru|tr)\//) || [, 'ka'])[1];
  const url = SITE + '/' + f.replace(/index\.html$/, '');
  const iso = lastCommitDate(f);
  const line = `<p class="page-updated" style="margin:28px 0 0;font-size:13.5px;color:var(--ink-soft);text-align:center">${LABEL[lang]}: ${fmt(lang, iso)}</p>`;
  const ld = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","@id":"${url}","url":"${url}","inLanguage":"${lang}","dateModified":"${iso}","isPartOf":{"@type":"WebSite","url":"${SITE}/"}}</script>`;

  let out = h;
  out = /class="page-updated"/.test(out)
    ? out.replace(/<p class="page-updated"[^>]*>[\s\S]*?<\/p>/, line)
    : out.replace('</main>', `  ${line}\n  </main>`);
  out = /"@type":"WebPage"/.test(out)
    ? out.replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"WebPage"[\s\S]*?<\/script>/, ld)
    : out.replace('</head>', `  ${ld}\n</head>`);

  if (out === h) { same++; continue; }
  if (!CHECK) fs.writeFileSync(f, out);
  written++;
}
console.log(`  ${CHECK ? 'შეიცვლებოდა' : 'განახლდა'}: ${written} გვერდი · უცვლელი: ${same}`);

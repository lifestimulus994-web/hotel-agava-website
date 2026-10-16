# -*- coding: utf-8 -*-
"""Check the built site for the mistakes that actually happen here.

Most of this site is hand-edited HTML across four languages, so a slip
lands in sixty files at once and is invisible until Google reads it. Every
check below exists because something like it went wrong: a price that
disagreed with rooms-data, a canonical pointing at the wrong language, an
image reference with no file behind it, a JSON-LD block cut in half by a
stray character, an unbalanced div that silently swallowed a section.

Run it before committing:

    python3 scripts/validate.py

Exit code is 1 if anything failed, so it also works in CI.
"""
import glob, html, json, os, re, subprocess, sys, collections
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://hotelagava.ge"
LANGS = ("en", "ru", "tr")
SKIP = {"admin.html", "manage.html", "404.html"}
os.chdir(ROOT)

problems = []
def fail(where, msg):
    problems.append((where, msg))


def pages():
    for f in sorted(glob.glob("**/*.html", recursive=True)):
        if ".git" in f or os.path.basename(f) in SKIP:
            continue
        yield f.replace(os.sep, "/"), open(f, encoding="utf-8", errors="ignore").read()


def url_of(f):
    return SITE + "/" + re.sub(r"index\.html$", "", f)


# ── 0. <head> holds only tags ────────────────────────────────────────────
class HeadText(HTMLParser):
    """A browser closes <head> at the first stray character. One extra ">"
    after a meta description did that on 27 pages: canonical, hreflang and
    robots all landed in <body>, where Google ignores them."""
    RAW = {"script", "style", "title", "noscript"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_head = self.done = False
        self.raw = 0
        self.stray = []

    def handle_starttag(self, tag, attrs):
        if tag == "head":
            self.in_head = True
        elif tag == "body":
            self.done = True
        if tag in self.RAW:
            self.raw += 1

    def handle_endtag(self, tag):
        if tag == "head":
            self.done = True
        if tag in self.RAW:
            self.raw = max(0, self.raw - 1)

    def handle_data(self, data):
        if self.in_head and not self.done and not self.raw and data.strip():
            self.stray.append(data.strip()[:40])


def check_head(f, h):
    p = HeadText()
    p.feed(h)
    for s in p.stray:
        fail(f, f"ტექსტი <head>-ში — Google აქ head-ს დახურავს: «{s}»")


def unescape_ld(s):
    return s.replace("\\u003c", "<").replace("\\u003e", ">").replace("\\u0026", "&")


# ── 1. structured data parses ────────────────────────────────────────────
def check_jsonld(f, h):
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try:
            json.loads(unescape_ld(block))
        except Exception as e:
            fail(f, f"JSON-LD არ იშლება: {e}")


# ── 2. canonical points at the page's own address ────────────────────────
def check_canonical(f, h):
    m = re.search(r'<link rel="canonical" href="([^"]+)"', h)
    if not m:
        return fail(f, "canonical არ არის")
    if m.group(1) != url_of(f):
        fail(f, f"canonical არასწორია: {m.group(1)} ≠ {url_of(f)}")


# ── 3. hreflang is complete and self-referencing ─────────────────────────
def check_hreflang(f, h):
    tags = dict(re.findall(r'hreflang="([^"]+)" href="([^"]+)"', h))
    if not tags:
        return
    for want in ("ka", "en", "ru", "tr", "x-default"):
        if want not in tags:
            fail(f, f"hreflang აკლია: {want}")
    lang = re.match(r"^(en|ru|tr)/", f)
    me = tags.get(lang.group(1) if lang else "ka")
    if me and me != url_of(f):
        fail(f, f"hreflang საკუთარ თავზე არ მიუთითებს: {me}")


# ── 4. every referenced asset exists ─────────────────────────────────────
def check_assets(f, h):
    for src in set(re.findall(r'/assets/([A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp|svg|ico))', h)):
        if not os.path.exists(os.path.join("assets", src)):
            fail(f, f"სურათი არ არსებობს: /assets/{src}")


# ── 5. exactly one h1, and tags close ────────────────────────────────────
def check_structure(f, h, indexed=True):
    # The h1 rule is an SEO rule, so it only applies to pages that are
    # indexed. /blog/read/ is a client-rendered shell — noindex on purpose,
    # with its heading written by blog.js at runtime.
    n = len(re.findall(r"<h1\b", h))
    if indexed and n != 1:
        fail(f, f"<h1> {n} ცალია (უნდა იყოს 1)")
    if "<body>" not in h:
        return
    body = h[h.index("<body>"):]
    for tag in ("div", "section", "article", "ul", "table"):
        o = len(re.findall(rf"<{tag}\b", body))
        c = len(re.findall(rf"</{tag}>", body))
        if o != c:
            fail(f, f"<{tag}> დაუბალანსებელია: {o} გახსნილი, {c} დახურული")


# ── 5b. cache-busting and LCP ────────────────────────────────────────────
def check_delivery(f, h):
    """_headers caches /css/* and /js/* for seven days, so an asset linked
    without ?v= keeps serving the stale copy long after a fix ships. And
    the first content image is the LCP candidate — lazy-loading it tells
    the browser to defer the very thing the score is waiting for."""
    for m in re.findall(r'(?:href|src)="(/(?:css|js)/[a-z-]+\.(?:css|js))"', h):
        fail(f, f"ქეშის ვერსია აკლია: {m}")
    imgs = [t for t in re.findall(r"<img[^>]*>", h) if "logo" not in t]
    if imgs and 'loading="lazy"' in imgs[0]:
        fail(f, "პირველი სურათი lazy-ითაა — LCP ყოვნდება")
    for t in imgs:
        if 'fetchpriority="high"' in t and 'loading="lazy"' in t:
            fail(f, "სურათს ერთდროულად აქვს fetchpriority=high და loading=lazy")


# ── 5c. translated pages speak their own language where Google reads ─────
GEORGIAN = re.compile(r"[Ⴀ-ჿ]")

def check_language(f, h):
    """The en/ru/tr homepages once shipped a half-translated description —
    "Hotel AGAVA თბილისში — კომფორტული Rooms & Suites" — which is the snippet
    Google shows. The Georgian hotel name in schema is deliberate; the
    search snippet, social cards and image alts are not the place for it."""
    if not re.match(r"^(en|ru|tr)/", f):
        return
    head = h[:h.find("<body")] if "<body" in h else h
    tags = re.findall(r"<title>(.*?)</title>", head, re.S)
    tags += re.findall(r'<meta (?:name|property)="(?:description|keywords|og:[a-z:]+|twitter:[a-z]+)" content="([^"]*)"', head)
    tags += re.findall(r'<img[^>]*\balt="([^"]*)"', h)
    for t in tags:
        if GEORGIAN.search(t):
            fail(f, f"ქართული ტექსტი თარგმნილ გვერდზე: {t[:70]}")


# ── 5d. facts the owner confirmed ───────────────────────────────────────
def check_facts(f, h):
    """The hotel takes cash only. Schema once said "Cash, Credit Card"."""
    for v in re.findall(r'"paymentAccepted":\s*"([^"]*)"', h):
        if re.search(r"card|карт|kart|ბარათ", v, re.I):
            fail(f, f"paymentAccepted ბარათს ახსენებს — სასტუმრო მხოლოდ ნაღდს იღებს: {v}")


# ── 6. title and description are present and sane ────────────────────────
def check_meta(f, h):
    t = re.search(r"<title>(.*?)</title>", h, re.S)
    d = re.search(r'<meta name="description" content="([^"]*)"', h)
    if not t or not t.group(1).strip():
        fail(f, "<title> ცარიელია")
    if not d or not d.group(1).strip():
        fail(f, "description ცარიელია")
    elif len(d.group(1)) > 200:
        fail(f, f"description ძალიან გრძელია: {len(d.group(1))} სიმბოლო")


# ── 7. room prices agree with the single source of truth ─────────────────
def load_rooms():
    try:
        raw = subprocess.run(
            ["node", "-e", "global.window={};require('./js/rooms-data.js');"
                           "console.log(JSON.stringify(window.AGAVA_ROOMS_DATA))"],
            capture_output=True, text=True, check=True).stdout
    except Exception as e:
        fail("js/rooms-data.js", f"ვერ წავიკითხე: {e}")
        return {}
    return {r["slug"]: r for r in json.loads(raw)}


def pays(r):
    s = r.get("salePrice") or 0
    return s if 0 < s < r["price"] else r["price"]


def figure(r):
    if pays(r) == r["price"]:
        return str(r["price"])
    return f'<s class="price-was">{r["price"]}</s> <span class="price-now">{pays(r)}</span>'


FIG = r'(?:<s class="price-was">\d+</s> <span class="price-now">\d+</span>|\d+)'
LOOSE_PRICE = re.compile(r"(?<![\d.–/-])[1-9]\d\d\s*(?:₾|GEL|лари|ლარ|lari)")


def check_prices(f, h, rooms):
    """Every room price is a <span data-price> that scripts/applyprices.js
    writes. A figure typed straight into the prose is how the Turkish page
    came to say 120 for a 150 room — so one outside a span is an error."""
    if not rooms:
        return
    for slug, inner in re.findall(rf'<span data-price="([a-z0-9-]+)">({FIG})</span>', h):
        r = rooms.get(slug)
        if not r:
            fail(f, f"უცნობი ნომერი: data-price=\"{slug}\"")
        elif inner != figure(r):
            fail(f, f"{slug}: ნაჩვენებია «{re.sub('<[^>]+>', ' ', inner).strip()}», rooms-data-ში {figure(r)}")
    rest = re.sub(rf'<span data-price="[a-z0-9-]+">{FIG}</span>', "", h)
    rest = re.sub(r'<section class="sales-block"[\s\S]*?</section>', "", rest)
    rest = re.sub(r"<script[\s\S]*?</script>", "", rest)
    for m in LOOSE_PRICE.finditer(rest):
        fail(f, f"ფასი data-price-ის გარეშე: «{rest[max(0, m.start() - 40):m.end()].strip()}»")

    lo = min(pays(r) for r in rooms.values())
    hi = max(pays(r) for r in rooms.values())
    for a, b in re.findall(r"<span data-price-range>(\d+)–(\d+)</span>", h):
        if (int(a), int(b)) != (lo, hi):
            fail(f, f"ფასების დიაპაზონი {a}–{b}, უნდა იყოს {lo}–{hi}")
    for a, b in re.findall(r'"priceRange":"(\d+)₾–(\d+)₾"', h):
        if (int(a), int(b)) != (lo, hi):
            fail(f, f"priceRange {a}–{b}, უნდა იყოს {lo}–{hi}")
    for slug, p in re.findall(r'"url":"https://hotelagava\.ge/(?:[a-z]{2}/)?rooms/([a-z0-9-]+)/"[^{}]*?(?:\{[^{}]*\}[^{}]*?)*?"@type":"Offer","price":(\d+)', h):
        if slug in rooms and int(p) != pays(rooms[slug]):
            fail(f, f"{slug}: schema-ს Offer {p}, სტუმარი იხდის {pays(rooms[slug])}")


# ── 7c. one Google rating, stated the same everywhere ────────────────────
GBP = collections.defaultdict(set)

def collect_rating(f, h):
    """scripts/syncrating.js writes these from the admin panel; a figure
    that differs from the rest was typed by hand and will go stale."""
    for kind, v in re.findall(r'<span data-gbp="(rating|count)">([\d.]+)</span>', h):
        GBP[kind].add((v, f))
    for a, b in re.findall(r'data-count="(\d+)" data-gbp="count">(\d+)<', h):
        GBP["count"].update({(a, f), (b, f)})
    for a, b in re.findall(r'data-count="([\d.]+)" data-decimal="1" data-gbp="rating">([\d.]+)<', h):
        GBP["rating"].update({(a, f), (b, f)})


def check_rating():
    for kind, seen in GBP.items():
        values = {v for v, _ in seen}
        if len(values) > 1:
            fail("Google", f"{kind}: სხვადასხვა მნიშვნელობა — {sorted(values)}")


# ── 7b. FAQ schema says what the visible FAQ says ────────────────────────
def plain(s):
    s = re.sub(r'<s class="price-was">\d+</s>\s*', "", s)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def check_faq(f, h):
    visible = {plain(q): plain(a) for q, a in re.findall(r"<summary>(.*?)</summary>\s*<p>(.*?)</p>", h, re.S)}
    for block in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', h, re.S):
        if '"FAQPage"' not in block:
            continue
        try:
            data = json.loads(unescape_ld(block))
        except Exception:
            continue
        for q in data.get("mainEntity", []):
            v = visible.get(q.get("name"))
            if v is None:
                fail(f, f"FAQ schema-ს კითხვა გვერდზე არ ჩანს: {q.get('name', '')[:50]}")
            elif v != plain(q["acceptedAnswer"]["text"]):
                fail(f, f"FAQ schema-ს პასუხი განსხვავდება ხილულისგან: {q['name'][:50]}")


# ── 8. sitemap lists every indexable page and nothing noindexed ──────────
def check_sitemap(indexable, noindexed):
    if not os.path.exists("sitemap.xml"):
        return fail("sitemap.xml", "არ არსებობს")
    listed = set(re.findall(r"<loc>([^<]+)</loc>", open("sitemap.xml", encoding="utf-8").read()))
    for u in sorted(indexable - listed):
        fail("sitemap.xml", f"აკლია: {u}")
    for u in sorted(noindexed & listed):
        fail("sitemap.xml", f"noindex გვერდი ჩამოთვლილია: {u}")


def main():
    indexable, noindexed, seen = set(), set(), 0
    versions = collections.Counter()
    rooms = load_rooms()
    for f, h in pages():
        seen += 1
        indexed = not re.search(r'name="robots"[^>]*noindex', h)
        check_head(f, h)
        check_jsonld(f, h); check_canonical(f, h); check_hreflang(f, h)
        check_assets(f, h); check_structure(f, h, indexed); check_meta(f, h)
        check_delivery(f, h); check_language(f, h); check_facts(f, h)
        check_prices(f, h, rooms); check_faq(f, h); collect_rating(f, h)
        (indexable if indexed else noindexed).add(url_of(f))
        versions.update(re.findall(r"\?v=(\d+)", h))
    check_rating()
    check_sitemap(indexable, noindexed)

    if len(versions) > 1:
        fail("cache", f"ერთდროულად რამდენიმე ?v= ვერსიაა: {dict(versions)}")

    print(f"  შემოწმდა {seen} გვერდი · {len(indexable)} ინდექსირებადი · {len(noindexed)} noindex")
    if not problems:
        print("  ✅ პრობლემა არ არის")
        return 0
    by_file = collections.defaultdict(list)
    for where, msg in problems:
        by_file[where].append(msg)
    print(f"\n  ❌ {len(problems)} პრობლემა {len(by_file)} ადგილას\n")
    for where in sorted(by_file):
        print(f"  {where}")
        for msg in by_file[where][:6]:
            print(f"      · {msg}")
        if len(by_file[where]) > 6:
            print(f"      · … კიდევ {len(by_file[where]) - 6}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

# -*- coding: utf-8 -*-
"""Turn published Supabase blog posts into real, indexable HTML pages.

Why this exists: /blog/read/ is a client-rendered shell that ships
`noindex` in its HTML and lets JavaScript flip it to `index` once a post
loads. Googlebot does not play along — when the initial HTML carries
noindex it skips rendering and never runs the JavaScript, so no post
written that way could ever be indexed.

This script writes each published post to /blog/<slug>/index.html with
its own title, description, canonical, Open Graph tags and BlogPosting
schema, all present before a single line of JavaScript runs. Publishing
stays a checkbox in the admin panel; GitHub Actions runs this afterwards.

Read-only against Supabase, one request per run.
"""
import json, os, re, sys, html, urllib.request, shutil, hashlib
from pathlib import Path

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://hotelagava.ge"
# the cache-busting version every other page uses — a post built with its
# own would fail validate.py's one-version rule and keep stale CSS/JS
VER = re.search(r"\?v=(\d+)", Path(ROOT, "index.html").read_text(encoding="utf-8")).group(1)
MARK = "<!-- generated:blog-post -->"
GRID_START, GRID_END = "<!-- blog-cards:start -->", "<!-- blog-cards:end -->"

SUPABASE_URL = "https://bkrkrwwyedtujkwlxkzp.supabase.co"
SUPABASE_KEY = "sb_publishable_VyFX3-jE4LHuplyKkHoKVw_gRUUCyuk"

HOTEL = "სასტუმრო აგავა"
E = lambda s: html.escape(str(s or ""), quote=True)


def fetch_posts():
    q = ("/rest/v1/blog_posts?select=slug,title,excerpt,cover_url,body_html,"
         "created_at,updated_at&published=eq.true&order=created_at.desc")
    req = urllib.request.Request(
        SUPABASE_URL + q,
        headers={"apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def safe_slug(s):
    """A slug becomes a directory name, so it must not escape /blog/."""
    s = (s or "").strip().strip("/")
    if not s or "/" in s or "\\" in s or s.startswith(".") or ".." in s:
        return None
    return s


def day(ts):
    return (ts or "")[:10]


BLOCK_TAG = re.compile(r"<(p|h[1-6]|ul|ol|div|blockquote|figure|table)\b", re.I)
INLINE = [
    (re.compile(r"!\[([^\]]*)\]\((https?://[^\s)]+)\)"),
     lambda m: f'<img src="{html.escape(m.group(2), True)}" alt="{html.escape(m.group(1), True)}" loading="lazy">'),
    (re.compile(r"\[([^\]]+)\]\((https?://[^\s)]+)\)"),
     lambda m: f'<a href="{html.escape(m.group(2), True)}">{m.group(1)}</a>'),
    (re.compile(r"\*\*(.+?)\*\*"), lambda m: f"<strong>{m.group(1)}</strong>"),
    (re.compile(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])"), lambda m: f"<em>{m.group(1)}</em>"),
]


def rich(text):
    """Let the author write plain text and still get a formatted article.

    The admin panel's body field is a bare textarea, so anything pasted
    from Word, Notes or a chat window arrives as plain text — and HTML
    collapses newlines, which turned a finished article into one
    unbroken wall. Blank lines become paragraphs, `##` becomes a
    heading, `-` becomes a list, and **bold**, *italic*, [links](url)
    and ![images](url) work as written.

    Bodies that already contain block-level HTML are passed through
    untouched, so posts written as HTML keep behaving exactly as before.
    """
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text or BLOCK_TAG.search(text):
        return text

    def inline(s):
        s = html.escape(s, quote=False)
        for pat, fn in INLINE:
            s = pat.sub(fn, s)
        return s

    out, lines, i = [], text.split("\n"), 0
    while i < len(lines):
        ln = lines[i].strip()
        if not ln:
            i += 1
            continue
        m = re.match(r"^(#{2,3})\s+(.*)$", ln)
        if m:
            tag = "h2" if len(m.group(1)) == 2 else "h3"
            out.append(f"<{tag}>{inline(m.group(2))}</{tag}>")
            i += 1
            continue
        m = re.match(r"^(?:[-*•]|\d+[.)])\s+", ln)
        if m:
            ordered = bool(re.match(r"^\d+[.)]\s+", ln))
            items = []
            while i < len(lines) and re.match(r"^(?:[-*•]|\d+[.)])\s+", lines[i].strip()):
                items.append(re.sub(r"^(?:[-*•]|\d+[.)])\s+", "", lines[i].strip()))
                i += 1
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>" + "".join(f"<li>{inline(x)}</li>" for x in items) + f"</{tag}>")
            continue
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(
                r"^(#{2,3}\s|[-*•]\s|\d+[.)]\s)", lines[i].strip()):
            para.append(lines[i].strip())
            i += 1
        out.append("<p>" + "<br>".join(inline(x) for x in para) + "</p>")
    return "".join(out)


UI = {
    'ka': dict(hotel='სასტუმრო აგავა', home='მთავარი', rooms='ოთახები', services='სერვისები', blog='ბლოგი', contact='კონტაქტი', book='დაჯავშნა', nav='მთავარი ნავიგაცია', back='← ბლოგზე დაბრუნება', more='ვრცლად →', soon='მალე დაემატება სტატიები.', locale='ka_GE'),
    'en': dict(hotel='Hotel Agava', home='Home', rooms='Rooms', services='Services', blog='Blog', contact='Contact', book='Book', nav='Main navigation', back='← Back to blog', more='Read more →', soon='Articles coming soon.', locale='en_GB'),
    'ru': dict(hotel='Отель Агава', home='Главная', rooms='Номера', services='Услуги', blog='Блог', contact='Контакты', book='Забронировать', nav='Основная навигация', back='← Назад к блогу', more='Подробнее →', soon='Скоро появятся статьи.', locale='ru_RU'),
    'tr': dict(hotel='Otel Agava', home='Ana Sayfa', rooms='Odalar', services='Hizmetler', blog='Blog', contact='İletişim', book='Rezervasyon', nav='Ana menü', back='← Bloga dön', more='Devamı →', soon='Yakında makaleler eklenecek.', locale='tr_TR'),
}


def prefix(lang):
    return '' if lang == 'ka' else '/' + lang


def source_digest(post):
    # A source edit requires an editorial translation review, not stale copy.
    value = json.dumps([post.get(k) or '' for k in ('title', 'excerpt', 'body_html')], ensure_ascii=False)
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def publications(posts):
    path = os.path.join(ROOT, 'data', 'blog-translations.json')
    editions = json.loads(Path(path).read_text(encoding='utf-8')) if os.path.exists(path) else {}
    result = {lang: [] for lang in UI}
    for source in posts:
        slug = safe_slug(source.get('slug'))
        if not slug or not (source.get('title') or '').strip():
            continue
        post = dict(source, slug=slug)
        edition = editions.get(slug, {})
        reviewed = edition.get('source_digest') == source_digest(post)
        variants = ['ka']
        if reviewed:
            post['seo_title'] = edition.get('seo_title_ka')
            for lang, translated in edition.get('translations', {}).items():
                if lang not in UI or lang == 'ka':
                    raise ValueError('Unsupported translation language: ' + lang)
                body_path = os.path.join(ROOT, 'data', 'blog-translations', slug + '.' + lang + '.md')
                body = Path(body_path).read_text(encoding='utf-8').strip()
                if not body or not translated.get('title') or not translated.get('excerpt'):
                    raise ValueError('Incomplete translation: ' + slug + '/' + lang)
                result[lang].append(dict(post, **translated, body_html=body,
                    created_at=edition['published_at'], updated_at=edition['published_at']))
                variants.append(lang)
        elif edition:
            print('Translation review required after source edit: ' + slug)
        result['ka'].append(post)
        for lang in variants:
            result[lang][-1]['variants'] = variants
    # A withdrawn translation must not leave a broken link in another edition.
    for lang, posts in result.items():
        if lang == 'ka':
            continue
        available = {p['slug'] for p in posts}
        pattern = re.compile(r'\[([^\]]+)\]\(' + re.escape(SITE + prefix(lang) + '/blog/') + r'([^/)]+)/\)')
        for post in posts:
            post['body_html'] = pattern.sub(
                lambda m: m[0] if m[2] in available else m[1], post['body_html'])
    return result


def page(p, lang="ka"):
    ui, base = UI[lang], prefix(lang)
    slug = p["slug"]
    url = f"{SITE}{base}/blog/{slug}/"
    seo_title = p.get("seo_title") or p["title"] + " — " + ui["hotel"]
    alternates = "".join(f'\n  <link rel="alternate" hreflang="{L}" href="{SITE}{prefix(L)}/blog/{slug}/">' for L in p.get("variants", [lang]))
    alternates += f'\n  <link rel="alternate" hreflang="x-default" href="{SITE}/blog/{slug}/">'
    switcher = "".join(f'<button type="button" data-lang="{L}" data-lang-href="{prefix(L)}/blog/{slug + "/" if L in p.get("variants", [lang]) else ""}">{label}</button>' for L, label in [("ka","ქარ"),("en","ENG"),("ru","РУС"),("tr","TR")])
    title = p["title"]
    desc = (p.get("excerpt") or title).strip()
    cover = p.get("cover_url") or f"{SITE}/assets/hero.jpg"
    created, updated = p.get("created_at") or "", p.get("updated_at") or p.get("created_at") or ""

    def J(d):
        """Post titles are written by hand in the admin panel, so a stray
        </script> in one would otherwise close the JSON-LD block early and
        break the page. Escaping the three characters that matter keeps the
        JSON valid and inert inside <script>."""
        return (json.dumps(d, ensure_ascii=False, separators=(",", ":"))
                .replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026"))

    ld_post = {"@context": "https://schema.org", "@type": "BlogPosting",
               "headline": title, "description": desc, "image": cover,
               "datePublished": created, "dateModified": updated,
               "inLanguage": lang, "mainEntityOfPage": url,
               "author": {"@type": "Organization", "name": ui["hotel"], "url": SITE + "/"},
               "publisher": {"@type": "Organization", "name": ui["hotel"],
                             "logo": {"@type": "ImageObject", "url": SITE + "/assets/logo.png"}}}
    ld_crumb = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": ui["home"], "item": SITE + base + "/"},
        {"@type": "ListItem", "position": 2, "name": ui["blog"], "item": SITE + base + "/blog/"},
        {"@type": "ListItem", "position": 3, "name": title, "item": url}]}

    # the cover is the largest thing above the fold on a post page, so it
    # is the LCP element — it gets priority, never lazy
    cover_img = (f'\n      <img class="blog-article__cover" src="{E(cover)}" alt="{E(title)}"'
                 f' fetchpriority="high">' if p.get("cover_url") else "")

    return f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
{MARK}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{E(seo_title)}</title>
  <meta name="description" content="{E(desc)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#b8935a">
  <link rel="canonical" href="{url}">{alternates}
  <meta property="og:type" content="article">
  <meta property="og:title" content="{E(title)}">
  <meta property="og:description" content="{E(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{E(cover)}">
  <meta property="og:locale" content="{ui['locale']}">
  <meta property="article:published_time" content="{E(created)}">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preload" href="/assets/fonts/DejaVuSans.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/css/style.css?v={VER}">
  <script type="application/ld+json">{J(ld_post)}</script>
  <script type="application/ld+json">{J(ld_crumb)}</script>
</head>
<body>
  <header class="navbar is-solid" id="navbar">
    <div class="navbar__inner container">
      <a href="{base}/" class="navbar__brand" aria-label="{ui['hotel']} — {ui['home']}">
        <img width="256" height="256" src="/assets/logo-128.webp" alt="{ui['hotel']}" class="navbar__logo">
        <span class="navbar__name">AGAVA</span>
      </a>
      <nav class="navbar__nav" aria-label="{ui['nav']}">
        <a href="{base}/" class="navbar__link">{ui['home']}</a>
        <a href="{base}/rooms/" class="navbar__link">{ui['rooms']}</a>
        <a href="{base}/#services" class="navbar__link">{ui['services']}</a>
        <a href="{base}/blog/" class="navbar__link is-active">{ui['blog']}</a>
        <a href="{base}/#contact" class="navbar__link">{ui['contact']}</a>
      </nav>
      <div class="lang-switch" id="langSwitch" aria-label="ენა / Language / Язык / Dil">
        {switcher}
      </div>
      <a class="btn btn--gold navbar__cta" href="{base}/rooms/">{ui['book']}</a>
    </div>
  </header>

  <main class="blog-page">
    <div class="container container--narrow">
      <nav class="rdp-crumb" aria-label="breadcrumb">
        <a href="{base}/">{ui['home']}</a> · <a href="{base}/blog/">{ui['blog']}</a> · <span>{E(title)}</span>
      </nav>
      <h1 class="blog-article__title">{E(title)}</h1>
      <time class="blog-article__date" datetime="{E(created)}">{day(created)}</time>{cover_img}
      <div class="blog-article__body">{rich(p.get("body_html"))}</div>
      <a class="rdp-back" href="{base}/blog/">{ui['back']}</a>
    </div>
  </main>

  <script defer src="/js/ga.js?v={VER}"></script>
  <script defer src="/js/track.js?v={VER}"></script>
  <script defer src="/js/config.js?v={VER}"></script>
  <script defer src="/js/i18n.js?v={VER}"></script>
  <script defer src="/js/navigation.js?v={VER}"></script>
  <script defer src="/js/main.js?v={VER}"></script>
</body>
</html>
'''


def card(p, first=False, lang="ka"):
    base, ui = prefix(lang), UI[lang]
    slug, title = p["slug"], p["title"]
    loading = 'loading="eager" fetchpriority="high"' if first else 'loading="lazy"'
    img = (f'<div class="blog-card__img"><img src="{E(p["cover_url"])}" alt="{E(title)}" {loading}></div>'
           if p.get("cover_url") else "")
    ex = f'<p>{E(p["excerpt"])}</p>' if p.get("excerpt") else ""
    return (f'<a class="blog-card" href="{base}/blog/{slug}/">{img}'
            f'<div class="blog-card__body"><time>{day(p.get("created_at"))}</time>'
            f'<h2>{E(title)}</h2>{ex}'
            f'<span class="blog-card__more">{ui["more"]}</span></div></a>')


def write_list(posts, lang="ka"):
    """Render localized cards once; blog.js preserves this static grid."""
    f = os.path.join(ROOT, prefix(lang).lstrip("/"), "blog", "index.html")
    s = Path(f).read_text(encoding="utf-8")
    inner = "".join(card(p, first=(i == 0), lang=lang) for i, p in enumerate(posts)) or \
            f'<p class="muted">{UI[lang]["soon"]}</p>'
    block = f'{GRID_START}{inner}{GRID_END}'
    grid = re.compile(r'(<div\b[^>]*\bid="blogGrid"[^>]*>)(.*?)(</div>\s*</div>)', re.S)
    if GRID_START in s:
        s = re.sub(re.escape(GRID_START) + ".*?" + re.escape(GRID_END), lambda m: block, s, flags=re.S)
    else:
        s, count = grid.subn(lambda m: m[1] + block + m[3], s, count=1)
        if count != 1:
            raise ValueError('Blog list grid missing: ' + f)
    s = re.sub(r'(<div\b[^>]*\bid="blogGrid")(?![^>]*data-built)', r'\1 data-built="true"', s, count=1)
    Path(f).write_text(s, encoding="utf-8")


def main():
    try:
        posts = fetch_posts()
    except Exception as e:
        print(f"  ❌ Supabase მიუწვდომელია: {e}")
        return 1

    editions = publications(posts)
    written = removed = 0
    for lang, localized in editions.items():
        blog = os.path.join(ROOT, prefix(lang).lstrip('/'), 'blog')
        keep = {p['slug'] for p in localized}
        for post in localized:
            directory = os.path.join(blog, post['slug'])
            os.makedirs(directory, exist_ok=True)
            target = os.path.join(directory, 'index.html')
            new = page(post, lang)
            old = Path(target).read_text(encoding='utf-8') if os.path.exists(target) else None
            if old != new:
                Path(target).write_text(new, encoding='utf-8')
                written += 1
        # Remove only generated editions of unpublished/deleted or revised posts.
        for name in os.listdir(blog):
            target = os.path.join(blog, name, 'index.html')
            if name not in keep and os.path.isfile(target) and MARK in Path(target).read_text(encoding='utf-8'):
                shutil.rmtree(os.path.dirname(target))
                removed += 1
        write_list(localized, lang)
    print(f'{sum(map(len, editions.values()))} published editions; {written} written; {removed} removed')

    return 0


if __name__ == "__main__":
    sys.exit(main())

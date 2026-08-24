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
import json, os, re, sys, html, urllib.request, shutil, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://hotelagava.ge"
VER = "2026082404"
MARK = "<!-- generated:blog-post -->"
GRID_START, GRID_END = "<!-- blog-cards:start -->", "<!-- blog-cards:end -->"

SUPABASE_URL = "https://bamyxkxxjphqodbnxxzc.supabase.co"
SUPABASE_KEY = "sb_publishable_zx8qt0lwZvYvMn0jyjJ7nA_XCiQsCwm"

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


def page(p):
    slug = p["slug"]
    url = f"{SITE}/blog/{slug}/"
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
               "inLanguage": "ka", "mainEntityOfPage": url,
               "author": {"@type": "Organization", "name": HOTEL, "url": SITE + "/"},
               "publisher": {"@type": "Organization", "name": HOTEL,
                             "logo": {"@type": "ImageObject", "url": SITE + "/assets/logo.png"}}}
    ld_crumb = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "მთავარი", "item": SITE + "/"},
        {"@type": "ListItem", "position": 2, "name": "ბლოგი", "item": SITE + "/blog/"},
        {"@type": "ListItem", "position": 3, "name": title, "item": url}]}

    cover_img = (f'\n      <img class="blog-article__cover" src="{E(cover)}" alt="{E(title)}"'
                 f' loading="lazy">' if p.get("cover_url") else "")

    return f'''<!DOCTYPE html>
<html lang="ka">
<head>
{MARK}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{E(title)} — {HOTEL}</title>
  <meta name="description" content="{E(desc)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#b8935a">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{E(title)}">
  <meta property="og:description" content="{E(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{E(cover)}">
  <meta property="og:locale" content="ka_GE">
  <meta property="article:published_time" content="{E(created)}">
  <link rel="icon" type="image/png" href="/assets/logo.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css?v={VER}">
  <script type="application/ld+json">{J(ld_post)}</script>
  <script type="application/ld+json">{J(ld_crumb)}</script>
</head>
<body>
  <header class="navbar is-solid" id="navbar">
    <div class="navbar__inner container">
      <a href="/" class="navbar__brand" aria-label="{HOTEL} — მთავარი">
        <img width="256" height="256" src="/assets/logo.webp" alt="{HOTEL}ს ლოგო" class="navbar__logo">
        <span class="navbar__name">AGAVA</span>
      </a>
      <nav class="navbar__nav" aria-label="მთავარი ნავიგაცია">
        <a href="/" class="navbar__link">მთავარი</a>
        <a href="/rooms/" class="navbar__link">ოთახები</a>
        <a href="/#services" class="navbar__link">სერვისები</a>
        <a href="/blog/" class="navbar__link is-active">ბლოგი</a>
        <a href="/#contact" class="navbar__link">კონტაქტი</a>
      </nav>
      <div class="lang-switch" id="langSwitch" aria-label="ენა / Language / Язык / Dil">
        <button type="button" data-lang="ka">ქარ</button>
        <button type="button" data-lang="en">ENG</button>
        <button type="button" data-lang="ru">РУС</button>
        <button type="button" data-lang="tr">TR</button>
      </div>
      <a class="btn btn--gold navbar__cta" href="/rooms/">დაჯავშნა</a>
    </div>
  </header>

  <main class="blog-page">
    <div class="container container--narrow">
      <nav class="rdp-crumb" aria-label="breadcrumb">
        <a href="/">მთავარი</a> · <a href="/blog/">ბლოგი</a> · <span>{E(title)}</span>
      </nav>
      <h1 class="blog-article__title">{E(title)}</h1>
      <time class="blog-article__date" datetime="{E(created)}">{day(created)}</time>{cover_img}
      <div class="blog-article__body">{rich(p.get("body_html"))}</div>
      <a class="rdp-back" href="/blog/">← ბლოგზე დაბრუნება</a>
    </div>
  </main>

  <script defer src="/js/ga.js?v={VER}"></script>
  <script defer src="/js/track.js?v={VER}"></script>
  <script defer src="/js/config.js?v={VER}"></script>
  <script defer src="/js/i18n.js?v={VER}"></script>
  <script defer src="/js/main.js?v={VER}"></script>
</body>
</html>
'''


def card(p):
    slug, title = p["slug"], p["title"]
    img = (f'<div class="blog-card__img"><img src="{E(p["cover_url"])}" alt="{E(title)}" loading="lazy"></div>'
           if p.get("cover_url") else "")
    ex = f'<p>{E(p["excerpt"])}</p>' if p.get("excerpt") else ""
    return (f'<a class="blog-card" href="/blog/{slug}/">{img}'
            f'<div class="blog-card__body"><time>{day(p.get("created_at"))}</time>'
            f'<h2>{E(title)}</h2>{ex}'
            f'<span class="blog-card__more">ვრცლად →</span></div></a>')


def write_list(posts):
    """Put the cards in the HTML so the list page is not an empty shell.
    blog.js still replaces the grid at runtime; Googlebot sees this first."""
    f = os.path.join(ROOT, "blog", "index.html")
    s = open(f, encoding="utf-8").read()
    inner = "".join(card(p) for p in posts) or \
            '<p class="muted">მალე დაემატება სტატიები.</p>'
    block = f'{GRID_START}{inner}{GRID_END}'
    if GRID_START in s:
        s = re.sub(re.escape(GRID_START) + ".*?" + re.escape(GRID_END), lambda m: block, s, flags=re.S)
    else:
        s = s.replace('<div class="blog-grid" id="blogGrid" data-noi18n></div>',
                      f'<div class="blog-grid" id="blogGrid" data-noi18n>{block}</div>')
    open(f, "w", encoding="utf-8").write(s)


def main():
    try:
        posts = fetch_posts()
    except Exception as e:
        print(f"  ❌ Supabase მიუწვდომელია: {e}")
        return 1

    blog = os.path.join(ROOT, "blog")
    keep, written = set(), 0
    for p in posts:
        slug = safe_slug(p.get("slug"))
        if not slug:
            print(f"  ⚠️  გამოტოვებულია არასწორი slug: {p.get('slug')!r}")
            continue
        if not (p.get("title") or "").strip():
            print(f"  ⚠️  გამოტოვებულია უსათაურო პოსტი: {slug}")
            continue
        keep.add(slug)
        d = os.path.join(blog, slug)
        os.makedirs(d, exist_ok=True)
        new = page(p)
        f = os.path.join(d, "index.html")
        old = open(f, encoding="utf-8").read() if os.path.exists(f) else None
        if old != new:
            open(f, "w", encoding="utf-8").write(new)
            written += 1
        print(f"  ✅ /blog/{slug}/")

    # unpublished or deleted posts must stop being served; only ever remove
    # directories this script created, identified by the marker.
    removed = 0
    for name in os.listdir(blog):
        d = os.path.join(blog, name)
        idx = os.path.join(d, "index.html")
        if not os.path.isdir(d) or name in keep or not os.path.exists(idx):
            continue
        if MARK in open(idx, encoding="utf-8", errors="ignore").read():
            shutil.rmtree(d); removed += 1
            print(f"  🗑  წაიშალა /blog/{name}/")

    write_list(posts)
    print(f"\n  {len(keep)} გამოქვეყნებული პოსტი · {written} ჩაიწერა · {removed} წაიშალა")
    return 0


if __name__ == "__main__":
    sys.exit(main())

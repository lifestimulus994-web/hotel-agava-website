# -*- coding: utf-8 -*-
"""Rebuild sitemap.xml from what is actually on disk and in git history.

Run after scripts/build_blog.py so newly published posts are picked up.
Pages carrying a noindex robots tag are skipped, which is how the
/blog/read/ shell stays out of the file."""
import re, glob, os, subprocess, collections, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://hotelagava.ge"
LANGS = ["ka", "en", "ru", "tr"]
SKIP = {"admin.html", "manage.html", "404.html"}
os.chdir(ROOT)

def git_date(path):
    """Last commit date for this file — the honest lastmod."""
    try:
        d = subprocess.run(["git", "log", "-1", "--format=%cs", "--", path],
                           capture_output=True, text=True, timeout=15).stdout.strip()
        return d or None
    except Exception:
        return None

def url_for(f):
    return SITE + "/" + re.sub(r"index\.html$", "", f)

def lang_of(f):
    m = re.match(r"^(en|ru|tr)/", f)
    return m.group(1) if m else "ka"

def strip_lang(f):
    return re.sub(r"^(en|ru|tr)/", "", f)

# ── collect indexable pages
pages = {}
for f in sorted(glob.glob("**/*.html", recursive=True)):
    if ".git" in f or f in SKIP:
        continue
    h = open(f, encoding="utf-8", errors="ignore").read()
    if re.search(r'name="robots"[^>]*noindex', h):
        continue                      # blog/read templates opt out on purpose
    img = None
    m = re.search(r'<meta property="og:image" content="([^"]+)"', h)
    if m and "/assets/" in m.group(1):
        img = m.group(1)
    pages[f] = {"url": url_for(f), "lang": lang_of(f), "key": strip_lang(f),
                "img": img, "date": git_date(f) or datetime.date.today().isoformat()}

# ── group translations so each entry can list its alternates
groups = collections.defaultdict(dict)
for f, d in pages.items():
    groups[d["key"]][d["lang"]] = d

def priority(key):
    if key == "index.html":                      return "1.0"
    if key in ("rooms/index.html",):             return "0.9"
    if key.startswith(("family-hotel", "hotel-for-couples", "jacuzzi-rooms",
                       "hotel-dighomi", "hotel-near-us-embassy",
                       "business-hotel", "offers", "amenities")): return "0.9"
    if key.startswith("rooms/"):                 return "0.8"
    if key.startswith("services/"):              return "0.7"
    if key.startswith("blog"):                   return "0.6"
    return "0.6"

def changefreq(key):
    if key == "index.html":     return "weekly"
    if key.startswith("blog"):  return "weekly"
    return "monthly"

out = ['<?xml version="1.0" encoding="UTF-8"?>',
       # Renders the human-readable table in browsers. Crawlers skip
       # processing instructions, so the data Googlebot sees is unchanged.
       '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
       '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
       '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']

for key in sorted(groups, key=lambda k: (priority(k) != "1.0", k)):
    variants = groups[key]
    alts = "".join(
        f'    <xhtml:link rel="alternate" hreflang="{L}" href="{variants[L]["url"]}"/>\n'
        for L in LANGS if L in variants)
    if "ka" in variants:
        alts += f'    <xhtml:link rel="alternate" hreflang="x-default" href="{variants["ka"]["url"]}"/>\n'
    for L in LANGS:
        if L not in variants:
            continue
        d = variants[L]
        out.append("  <url>")
        out.append(f'    <loc>{d["url"]}</loc>')
        out.append(alts.rstrip("\n"))
        if d["img"]:
            out.append(f'    <image:image><image:loc>{d["img"]}</image:loc></image:image>')
        out.append(f'    <lastmod>{d["date"]}</lastmod>')
        out.append(f"    <changefreq>{changefreq(key)}</changefreq>")
        out.append(f"    <priority>{priority(key)}</priority>")
        out.append("  </url>")

out.append("</urlset>")
open("sitemap.xml", "w", encoding="utf-8").write("\n".join(out) + "\n")

dates = collections.Counter(d["date"] for d in pages.values())
print(f"  ✅ {len(pages)} URL ჩაიწერა")
print("  lastmod git-იდან:")
for k, v in sorted(dates.items()):
    print(f"     ×{v:3}  {k}")

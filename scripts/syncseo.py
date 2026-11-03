"""Bake admin SEO settings into initial HTML for ka/en/ru/tr.

The tracked catalog preserves the fallback metadata so clearing an override
restores it. Edit catalog defaults alongside intentional source-copy changes.
Read-only against Supabase; validate every override before writing any page.
"""
import argparse
import html
import json
import re
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ('title', 'description', 'og_image', 'robots')
ROBOTS = {'index, follow', 'noindex, follow', 'index, nofollow', 'noindex, nofollow', 'index, follow, max-image-preview:large, max-snippet:-1'}

class Head(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.meta = {}; self.title = ''; self.in_title = False
        self.feed(source.split('</head>', 1)[0])
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title': self.in_title = True
        if tag == 'meta': self.meta[attrs.get('name', attrs.get('property'))] = attrs.get('content', '')
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.title += data
    def defaults(self):
        return dict(title=self.title, description=self.meta.get('description',''),
                    og_image=self.meta.get('og:image',''), robots=self.meta.get('robots','index, follow'))

def page_path(file, root):
    rel = file.relative_to(root).as_posix()
    return '/' + rel.removesuffix('index.html')

def catalog(root):
    path = root / 'data/seo-pages.json'
    old = {p['path']: p for p in json.loads(path.read_text())} if path.exists() else {}
    result = []
    for file in sorted(root.rglob('index.html')):
        rel = file.relative_to(root).as_posix()
        if any(p.startswith('.') or p in ('node_modules','work') for p in file.relative_to(root).parts): continue
        if rel.endswith('blog/read/index.html'): continue
        route = page_path(file, root)
        current = Head(file.read_text()).defaults()
        prior = old.get(route, {})
        defaults = dict(prior.get('defaults', current))
        # Preserve upstream edits (including generated blog copy and prices).
        # Unchanged previously applied overrides must not become defaults.
        for key in FIELDS:
            if current[key] != prior.get('applied', defaults).get(key):
                defaults[key] = current[key]
        lang = rel.split('/')[0] if rel.split('/')[0] in ('en','ru','tr') else 'ka'
        has_alternates = prior.get('has_alternates', 'hreflang=' in file.read_text())
        result.append(dict(path=route, lang=lang, label=defaults['title'], defaults=defaults,has_alternates=has_alternates))
    return result

def fetch_overrides():
    # Public metadata only; never use a service-role key for the static build.
    cfg = (ROOT / 'js/config.js').read_text()
    url = re.search(r'SUPABASE_URL:\s*["\']([^"\']+)',cfg).group(1)
    key = re.search(r'SUPABASE_ANON_KEY:\s*["\']([^"\']+)',cfg).group(1)
    req = Request(url + '/rest/v1/seo_meta?select=path,title,description,og_image,robots',headers={'apikey':key})
    with urlopen(req, timeout=30) as response:
        rows = json.load(response)
    if not isinstance(rows,list): raise ValueError('Expected SEO metadata rows')
    return rows

def clean(row, known):
    path = row.get('path')
    if path not in known: raise ValueError('Unknown or private SEO path: '+str(path))
    data = {}
    for key in FIELDS:
        value = row.get(key)
        if value is not None and not isinstance(value,str): raise ValueError('Invalid '+key)
        value = (value or '').strip()
        if value: data[key] = value
    if 'robots' in data and data['robots'] not in ROBOTS: raise ValueError('Invalid robots value')
    if 'og_image' in data:
        url = urlsplit(data['og_image'])
        if url.scheme != 'https' or not url.netloc or url.username or url.password:
            raise ValueError('OG image must be a public HTTPS URL')
    return path, data

def set_meta(source, attr, key, value):
    pattern = re.compile(r'<meta\b[^>]*\b'+attr+r'=["\']'+re.escape(key)+r'["\'][^>]*>',re.I)
    tag = '<meta '+attr+'="'+key+'" content="'+html.escape(value,quote=True)+'">'
    if pattern.search(source): return pattern.sub(lambda _: tag,source)
    return source.replace('</head>', '  '+tag+'\n</head>',1)

def render(source, data):
    source = re.sub(r'<title>.*?</title>',lambda _: '<title>'+html.escape(data['title'])+'</title>',source,count=1,flags=re.S)
    for attr,key,field in [('name','description','description'),('property','og:title','title'),
        ('name','twitter:title','title'),('property','og:description','description'),
        ('name','twitter:description','description'),('property','og:image','og_image'),
        ('name','twitter:image','og_image'),('name','robots','robots')]:
        source = set_meta(source,attr,key,data[field])
    return source

def sync(root, rows, check=False):
    pages = catalog(root); known = {p['path'] for p in pages}
    overrides = dict(clean(row,known) for row in rows)
    writes = {}; rendered = {}; groups = {}
    for page in pages:
        file = root / page['path'].lstrip('/') / 'index.html'
        before = file.read_text()
        data = {**page['defaults'], **overrides.get(page['path'],{})}
        after = render(before,data)
        page['applied'] = data
        rendered[file] = (before,after,page)
        if 'noindex' not in data['robots']:
            group = re.sub(r'^/(en|ru|tr)(?=/)', '', page['path'])
            groups.setdefault(group,{})[page['lang']] = page['path']
    alternate = re.compile(r'\s*<link\b[^>]*\bhreflang=["\'][^"\']+["\'][^>]*>',re.I)
    for file,(before,after,page) in rendered.items():
        if page['has_alternates']:
            group = re.sub(r'^/(en|ru|tr)(?=/)', '', page['path'])
            variants = groups.get(group,{}) if 'noindex' not in page['applied']['robots'] else {}
            links = ''.join('\n  <link rel="alternate" hreflang="'+lang+'" href="https://hotelagava.ge'+path+'">' for lang,path in variants.items())
            if variants:
                links += '\n  <link rel="alternate" hreflang="x-default" href="https://hotelagava.ge'+variants.get('ka',next(iter(variants.values())))+'">'
            after = re.sub(r'\s*</head>',lambda _: links+'\n</head>',alternate.sub('',after),count=1)
        if after != before: writes[file] = after
    cat = root / 'data/seo-pages.json'
    value = json.dumps(pages,ensure_ascii=False,indent=2)+'\n'
    if not cat.exists() or cat.read_text()!=value: writes[cat]=value
    if not check:
        for file,content in writes.items():
            file.parent.mkdir(parents=True,exist_ok=True)
            file.write_text(content)
    return len(pages),list(writes)

if __name__ == '__main__':
    cli = argparse.ArgumentParser()
    cli.add_argument('--input',type=Path,help='Local JSON fixture instead of Supabase')
    cli.add_argument('--check',action='store_true')
    args = cli.parse_args()
    rows = json.loads(args.input.read_text()) if args.input else fetch_overrides()
    count,changed = sync(ROOT,rows,args.check)
    print(f'SEO: {count} pages in four languages; {len(changed)} files '+('need updating' if args.check else 'updated'))
    if args.check and changed: raise SystemExit(1)

"""Read-only post-deploy verification of initial HTML, all languages, and admin assets."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote
from urllib.error import HTTPError
import json
import time
from syncseo import Head
ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'.public'
BASE='https://hotelagava.ge'

def get(path):
    request=Request(BASE+quote(path,safe='/')+'?publication-check='+str(time.time_ns()),headers={'User-Agent':'Mozilla/5.0 (Agava publication verification)'})
    with urlopen(request,timeout=30) as res: return res.read(),res.headers

def page_check(page):
    raw,_=get(page['path']); actual=Head(raw.decode())
    if actual.defaults()!=page['applied']: raise ValueError('Initial HTML metadata mismatch: '+page['path'])
    for prefix in ('og:','twitter:'):
        for name,key in [('title','title'),('description','description'),('image','og_image')]:
            if actual.meta.get(prefix+name)!=page['applied'][key]: raise ValueError('Social metadata mismatch: '+page['path'])

def verify():
    pages=json.loads((PUBLIC/'data/seo-pages.json').read_text())
    with ThreadPoolExecutor(max_workers=4) as pool: list(pool.map(page_check,pages))
    for path in ('js/admin.js','js/booking.js','js/track.js','js/config.js','js/seo-publish.js','js/image-upload.js','js/content.js','js/main.js','css/style.css','data/seo-pages.json','data/publish-state.json','sitemap.xml'):
        raw,_=get('/'+path)
        if raw!=(PUBLIC/path).read_bytes():raise ValueError('Asset mismatch: '+path)
    for path in ('/admin','/manage'):
        _,headers=get(path)
        if 'noindex' not in headers.get('X-Robots-Tag',''):raise ValueError('Private-page noindex missing: '+path)
    try: get('/__agava_missing_publication_check__')
    except HTTPError as error:
        if error.code!=404:raise
    else:raise ValueError('Missing page must return 404')
    print(f'Production verified: {len(pages)} initial HTML pages, four languages, admin/booking assets, sitemap, 404.')
def verify_with_retry():
    for attempt in range(6):
        try:verify();break
        except Exception as error:
            if attempt==5:raise
            print(f'Publication not fully visible yet ({type(error).__name__}); retrying.')
            time.sleep(15)

if __name__=='__main__':verify_with_retry()

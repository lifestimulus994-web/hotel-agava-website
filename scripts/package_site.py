"""Package only public assets; never upload source, SQL, credentials, or tests."""
from pathlib import Path
import json
import hashlib
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIRS = ('assets', 'css', 'js', 'amenities', 'blog', 'business-hotel-tbilisi',
               'family-hotel-tbilisi', 'hotel-dighomi-tbilisi', 'hotel-for-couples-tbilisi',
               'hotel-near-us-embassy-tbilisi', 'jacuzzi-rooms-tbilisi', 'offers',
               'rooms', 'services', 'en', 'ru', 'tr')
PUBLIC_FILES = ('index.html','admin.html','manage.html','404.html','_headers','_redirects',
                'favicon.ico','apple-touch-icon.png','site.webmanifest','robots.txt',
                'sitemap.xml','sitemap.xsl','llms.txt','llms-full.txt','data/seo-pages.json')
EXTENSIONS = {'.html','.js','.css','.jpg','.jpeg','.png','.webp','.svg','.ico','.woff','.woff2','.ttf','.otf','.gif','.avif','.mp4','.webm'}

def public_files(root):
    found = {root / name for name in PUBLIC_FILES if (root / name).is_file()}
    found.update(p for p in root.glob('*.txt') if re.fullmatch(r'[0-9a-f]{16,128}\.txt',p.name))
    for directory in PUBLIC_DIRS:
        for p in (root/directory).rglob('*'):
            if not p.is_file(): continue
            rel = p.relative_to(root)
            if any(part.startswith('.') or part == 'node_modules' for part in rel.parts): continue
            if p.suffix.lower() not in EXTENSIONS: continue
            if p.is_symlink() or not p.resolve().is_relative_to(root.resolve()):
                raise ValueError('Refusing public asset symlink: '+str(rel))
            found.add(p)
    if any(p.is_symlink() for p in found):
        raise ValueError("Refusing public asset symlink")
    return sorted(found)

def package(root=ROOT):
    files=public_files(root)
    required=('index.html','admin.html','manage.html','js/booking.js','js/admin.js','data/seo-pages.json','_headers')
    for name in required:
        if root/name not in files: raise ValueError('Required file missing: '+name)
    out=root/'.public'
    # This is generated build output, never application or database data.
    if out.is_symlink(): raise ValueError('Refusing output symlink')
    if out.exists(): shutil.rmtree(out)
    for source in files:
        target=out/source.relative_to(root);target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(source,target)
    digest=hashlib.sha256()
    for source in files:
        digest.update(source.relative_to(root).as_posix().encode()+b'\0')
        digest.update(hashlib.sha256(source.read_bytes()).digest())
    (out/'data/publish-state.json').write_text(json.dumps({'sha256':digest.hexdigest()})+'\n')
    print(f'Packaged {len(files)} public assets into .public/')
    return out

if __name__=='__main__':package()

"""Regression checks for metadata publication; no network or real database writes."""
import json,tempfile,unittest
from pathlib import Path
from syncseo import sync,Head

class SeoPublishing(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.routes=['/','/en/','/ru/','/tr/']
        alts=''.join(f'<link rel="alternate" hreflang="{lang}" href="https://hotelagava.ge{route}">' for lang,route in zip(['ka','en','ru','tr'],self.routes))
        for route in self.routes:
            path=self.file(route);path.parent.mkdir(parents=True,exist_ok=True)
            path.write_text(f'<html><head><title>Original {route}</title><meta name="description" content="Description {route}"><meta property="og:image" content="https://hotelagava.ge/assets/room.jpg"><meta name="robots" content="index, follow">{alts}</head><body>Booking form stays untouched.</body></html>')
        sync(self.root,[])
    def tearDown(self): self.temp.cleanup()
    def file(self,route): return self.root/route.lstrip('/')/'index.html'
    def test_four_languages_and_escaping(self):
        titles=['ქართული','English','Русский','Türkçe']
        rows=[dict(path=p,title=t+' <Hotel> & "Agava"',description='A & B <room>') for p,t in zip(self.routes,titles)]
        sync(self.root,rows)
        for row in rows:
            text=self.file(row['path']).read_text();head=Head(text)
            self.assertEqual(head.title,row['title']);self.assertEqual(head.meta['description'],row['description'])
            self.assertEqual(head.meta['twitter:title'],row['title']);self.assertIn('<body>Booking form stays untouched.</body>',text)
        self.assertEqual(sync(self.root,rows,True)[1],[])
    def test_clear_restores_fallback_and_preserves_source_updates(self):
        sync(self.root,[dict(path='/en/',title='Override')]);sync(self.root,[])
        self.assertEqual(Head(self.file('/en/').read_text()).title,'Original /en/')
        self.file('/en/').write_text(self.file('/en/').read_text().replace('Original /en/','New source title'))
        sync(self.root,[dict(path='/en/',title='Override again')]);sync(self.root,[])
        self.assertEqual(Head(self.file('/en/').read_text()).title,'New source title')
    def test_noindex_removes_alternate_then_restores_it(self):
        sync(self.root,[dict(path='/ru/',robots='noindex, follow')])
        for route in self.routes: self.assertNotIn('hreflang="ru"',self.file(route).read_text())
        sync(self.root,[])
        for route in self.routes: self.assertIn('hreflang="ru"',self.file(route).read_text())
        self.assertEqual(sync(self.root,[],True)[1],[])
    def test_bad_input_writes_nothing(self):
        before={f:f.read_bytes() for f in self.root.rglob('*') if f.is_file()}
        for row in [dict(path='/admin/',title='bad'),dict(path='/../index.html'),dict(path='/en/',og_image='javascript:alert(1)'),dict(path='/en/',robots='invalid')]:
            with self.assertRaises(ValueError): sync(self.root,[dict(path='/',title='must not write'),row])
        self.assertEqual(before,{f:f.read_bytes() for f in self.root.rglob('*') if f.is_file()})
if __name__=='__main__': unittest.main()

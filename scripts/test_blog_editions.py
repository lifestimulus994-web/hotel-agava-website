"""Publication lifecycle and language regression checks; no database writes."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import build_blog as blog

ROOT = Path(blog.ROOT)

class BlogEditions(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.post = dict(slug='sample', title='Original', excerpt='Summary', body_html='Original body', created_at='2026-10-01', updated_at='2026-10-02')
        (self.root/'data/blog-translations').mkdir(parents=True)
        self.edition = dict(source_digest=blog.source_digest(self.post), seo_title_ka='Short title', published_at='2026-11-11', translations={
            'en': dict(title='English title', excerpt='English summary', seo_title='English SEO title')})
        (self.root/'data/blog-translations.json').write_text(json.dumps({'sample':self.edition}))
        (self.root/'data/blog-translations/sample.en.md').write_text('## A heading\n\nEnglish body with [rooms](https://hotelagava.ge/en/rooms/).')
        for lang in blog.UI:
            p=self.root/blog.prefix(lang).lstrip('/')/'blog/index.html'
            p.parent.mkdir(parents=True)
            p.write_text('<div class="container"><div class="blog-grid" id="blogGrid" data-noi18n=""></div>\n</div>')
        self.rootpatch=patch.object(blog,'ROOT',str(self.root));self.rootpatch.start()
    def tearDown(self):
        self.rootpatch.stop();self.temp.cleanup()
    def build(self, posts):
        with patch.object(blog,'fetch_posts',return_value=posts):
            self.assertEqual(blog.main(),0)
    def test_localized_metadata_cards_and_switcher(self):
        self.build([self.post])
        en=(self.root/'en/blog/sample/index.html').read_text()
        self.assertIn('<html lang="en">',en)
        self.assertIn('<title>English SEO title</title>',en)
        self.assertIn('href="https://hotelagava.ge/en/blog/sample/"',en)
        self.assertIn('"inLanguage":"en"',en)
        self.assertIn('data-lang="tr" data-lang-href="/tr/blog/"',en)
        self.assertIn('data-lang="ka" data-lang-href="/blog/sample/"',en)
        listing=(self.root/'en/blog/index.html').read_text()
        self.assertIn('data-built="true"',listing)
        self.assertIn('href="/en/blog/sample/"',listing)
        self.assertNotIn('Original',listing)
        self.assertIn('English body',en)
        self.assertEqual(en.count('<h1 '),1)
    def test_unpublishing_removes_all_generated_editions_only(self):
        self.build([self.post])
        manual=self.root/'en/blog/manual/index.html';manual.parent.mkdir();manual.write_text('Handwritten')
        self.build([])
        for lang in ['ka','en']:
            self.assertFalse((self.root/blog.prefix(lang).lstrip('/')/'blog/sample').exists())
        self.assertTrue(manual.exists())
        self.assertNotIn('/sample/',(self.root/'en/blog/index.html').read_text())
    def test_source_revision_removes_outdated_translation(self):
        self.build([self.post])
        self.build([dict(self.post,body_html='New source information')])
        self.assertFalse((self.root/'en/blog/sample').exists())
        ka=(self.root/'blog/sample/index.html').read_text()
        self.assertIn('New source information',ka)
        self.assertNotIn('hreflang="en"',ka)
        self.assertIn('data-lang="en" data-lang-href="/en/blog/"',ka)
    def test_repeated_build_is_stable_and_failure_preserves_site(self):
        self.build([self.post])
        before={str(p):p.read_bytes() for p in self.root.rglob('*.html')}
        self.build([self.post])
        self.assertEqual(before,{str(p):p.read_bytes() for p in self.root.rglob('*.html')})
        with patch.object(blog,'fetch_posts',side_effect=RuntimeError('unavailable')):
            self.assertEqual(blog.main(),1)
        self.assertEqual(before,{str(p):p.read_bytes() for p in self.root.rglob('*.html')})
    def test_unsafe_slug_is_ignored(self):
        editions=blog.publications([dict(self.post,slug='../escape')])
        self.assertFalse(any(editions.values()))
    def test_links_to_unavailable_translations_are_removed(self):
        (self.root/'data/blog-translations/sample.en.md').write_text(
            '[Available](https://hotelagava.ge/en/blog/sample/) and '
            '[Withdrawn](https://hotelagava.ge/en/blog/withdrawn/).')
        self.build([self.post])
        en=(self.root/'en/blog/sample/index.html').read_text()
        self.assertIn('>Available</a>', en)
        self.assertIn('and Withdrawn.', en)
        self.assertNotIn('/blog/withdrawn/', en)

if __name__=='__main__': unittest.main()

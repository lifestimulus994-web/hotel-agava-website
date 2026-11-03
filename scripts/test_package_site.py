import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from package_site import package, public_files

class PackageSiteTests(unittest.TestCase):
    def test_private_files_excluded_and_public_files_preserved(self):
        with TemporaryDirectory() as tmp:
            root=Path(tmp)
            wanted=('index.html','admin.html','manage.html','js/booking.js','js/admin.js','data/seo-pages.json','_headers','en/rooms/standard/index.html','assets/hotel.webp')
            excluded=('.env','sql/schema.sql','scripts/build.py','.github/workflows/deploy.yml','data/private.json','assets/.env','assets/customer.sql','node_modules/pkg/index.html','js/node_modules/pkg/index.js')
            for name in wanted+excluded:
                p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(name)
            out=package(root)
            actual={str(p.relative_to(out)) for p in out.rglob('*') if p.is_file()}
            self.assertEqual(actual,set(wanted)|{'data/publish-state.json'})
            self.assertEqual((out/'js/booking.js').read_bytes(),(root/'js/booking.js').read_bytes())
    def test_missing_admin_prevents_package(self):
        with TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError,'Required file missing'):
                package(Path(tmp))
    def test_symlinks_cannot_publish_external_files(self):
        with TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'assets').mkdir();(root/'outside.js').write_text('private')
            (root/'assets/leak.js').symlink_to(root/'outside.js')
            with self.assertRaisesRegex(ValueError,'symlink'):public_files(root)

if __name__=='__main__':unittest.main()

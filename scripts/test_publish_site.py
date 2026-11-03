import unittest
from unittest.mock import patch,call
import publish_site as pub
OLD='11111111-1111-4111-8111-111111111111'
NEW='22222222-2222-4222-8222-222222222222'
OTHER='33333333-3333-4333-8333-333333333333'
def state(version):return [{'version_id':version,'percentage':100}]
class PublishSiteTests(unittest.TestCase):
    def run_case(self,states,verification=None):
        with patch.object(pub,'current_versions',side_effect=states),patch.object(pub,'upload',return_value=(NEW,'https://preview.workers.dev')) as upload,patch.object(pub,'verify',side_effect=verification) as verify,patch.object(pub,'promote') as promote:
            error=None
            try:pub.publish()
            except Exception as exc:error=exc
            return error,upload,verify,promote
    def test_preview_failure_never_promotes(self):
        error,_,_,promote=self.run_case([state(OLD)],RuntimeError('bad preview'))
        self.assertIsNotNone(error);promote.assert_not_called()
    def test_promotes_only_after_preview_and_checks_production(self):
        error,_,verify,promote=self.run_case([state(OLD),state(OLD)])
        self.assertIsNone(error)
        self.assertEqual(verify.call_args_list,[call('https://preview.workers.dev'),call('https://hotelagava.ge')])
        self.assertEqual(promote.call_args_list,[call(NEW,'Publish verified SEO and public content')])
    def test_production_failure_restores_previous_version(self):
        error,_,_,promote=self.run_case([state(OLD),state(OLD),state(NEW),state(OLD)],[None,RuntimeError('bad production')])
        self.assertIsNotNone(error);self.assertEqual(promote.call_args_list[-1],call(OLD,'Restore previous version after failed publication check'))
    def test_concurrent_change_before_promotion_is_preserved(self):
        error,_,_,promote=self.run_case([state(OLD),state(OTHER)])
        self.assertIsNotNone(error);promote.assert_not_called()
    def test_concurrent_change_after_promotion_is_not_rolled_back(self):
        error,_,_,promote=self.run_case([state(OLD),state(OLD),state(OTHER)],[None,RuntimeError('changed')])
        self.assertIsNotNone(error);self.assertEqual(promote.call_count,1)
    def test_existing_split_deployment_is_not_replaced(self):
        error,upload,_,promote=self.run_case([[{'version_id':OLD,'percentage':50},{'version_id':OTHER,'percentage':50}]])
        self.assertIsNotNone(error);upload.assert_not_called();promote.assert_not_called()
if __name__=='__main__':unittest.main()

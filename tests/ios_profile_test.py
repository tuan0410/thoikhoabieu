import copy
import datetime
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('ios_profile', Path(__file__).resolve().parent.parent / 'scripts/ios-profile.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ProfileValidation(unittest.TestCase):
    def setUp(self):
        self.now = datetime.datetime(2026, 11, 2, tzinfo=datetime.timezone.utc)
        self.profile = {'UUID': '12345678-1234-1234-1234-1234567890ab', 'TeamIdentifier': ['ABC1234567'], 'Entitlements': {'application-identifier': 'ABC1234567.com.tuan0410.lichhoc', 'get-task-allow': False}, 'DeveloperCertificates': [b'certificate'], 'ExpirationDate': datetime.datetime(2027, 1, 1)}

    def validate(self, profile=None, certificate=b'certificate', team='ABC1234567'):
        return module.validate(profile or self.profile, certificate, team, 'com.tuan0410.lichhoc', self.now)

    def test_valid_distribution(self):
        self.assertEqual(self.validate(), self.profile['UUID'])

    def test_expired(self):
        self.profile['ExpirationDate'] = datetime.datetime(2026, 1, 1)
        with self.assertRaisesRegex(ValueError, 'expired'):
            self.validate()

    def test_wrong_team_or_bundle(self):
        with self.assertRaisesRegex(ValueError, 'team or bundle'):
            self.validate(team='OTHER12345')
        self.profile['Entitlements']['application-identifier'] = 'ABC1234567.com.other.app'
        with self.assertRaisesRegex(ValueError, 'team or bundle'):
            self.validate()

    def test_wrong_certificate(self):
        with self.assertRaisesRegex(ValueError, 'certificate'):
            self.validate(certificate=b'wrong')

    def test_development_or_adhoc(self):
        for key in ['ProvisionedDevices', 'ProvisionsAllDevices']:
            profile = copy.deepcopy(self.profile); profile[key] = ['device']
            with self.assertRaisesRegex(ValueError, 'App Store'):
                self.validate(profile)
        self.profile['Entitlements']['get-task-allow'] = True
        with self.assertRaisesRegex(ValueError, 'App Store'):
            self.validate()

    def test_untrusted_uuid_cannot_become_file_path(self):
        self.profile['UUID'] = '../../another-file'
        with self.assertRaisesRegex(ValueError, 'UUID'):
            self.validate()


if __name__ == '__main__':
    unittest.main()

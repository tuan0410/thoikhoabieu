"""Validate and install a supplied App Store profile on a disposable CI runner."""
import datetime
import json
import os
from pathlib import Path
import plistlib
import re
import sys


def validate(profile, certificate, team, bundle, now=None):
    now = now or datetime.datetime.now(datetime.timezone.utc)
    if not re.fullmatch(r'[A-Z0-9]{10}', team):
        raise ValueError('Invalid APPLE_TEAM_ID.')
    uuid = profile.get('UUID', '')
    if not re.fullmatch(r'[a-fA-F0-9-]{36}', uuid):
        raise ValueError('Invalid provisioning profile UUID.')
    entitlements = profile.get('Entitlements', {})
    if team not in profile.get('TeamIdentifier', []) or entitlements.get('application-identifier') != team + '.' + bundle:
        raise ValueError('Profile team or bundle ID does not match this app.')
    expires = profile.get('ExpirationDate')
    if not isinstance(expires, datetime.datetime) or expires.replace(tzinfo=datetime.timezone.utc) <= now:
        raise ValueError('Provisioning profile has expired.')
    if profile.get('ProvisionedDevices') or profile.get('ProvisionsAllDevices') or entitlements.get('get-task-allow'):
        raise ValueError('An App Store distribution profile is required.')
    if certificate not in profile.get('DeveloperCertificates', []):
        raise ValueError('Profile does not include the supplied distribution certificate.')
    return uuid


def main(action):
    folder = Path(os.environ['RUNNER_TEMP'], 'lichhoc-signing')
    if action == 'cleanup':
        marker = folder / 'installed-profile'
        if marker.exists():
            target = Path(marker.read_text())
            expected = Path.home() / 'Library/MobileDevice/Provisioning Profiles'
            if target.parent == expected and re.fullmatch(r'[a-fA-F0-9-]{36}\.mobileprovision', target.name):
                target.unlink(missing_ok=True)
        # No recursive deletion: remove only the files created by this workflow.
        for name in ['key.pem', 'certificate.cer', 'certificate.pem', 'profile.mobileprovision', 'profile.plist', 'signing.p12', 'profile-uuid', 'installed-profile', 'ExportOptions.plist']:
            (folder / name).unlink(missing_ok=True)
        return
    if action != 'install':
        raise ValueError('Unknown action.')
    config = json.loads(Path('mobile/capacitor.config.json').read_text(encoding='utf-8'))
    profile = plistlib.loads((folder / 'profile.plist').read_bytes())
    team, bundle = os.environ['APPLE_TEAM_ID'], config['appId']
    uuid = validate(profile, (folder / 'certificate.cer').read_bytes(), team, bundle)
    target = Path.home() / 'Library/MobileDevice/Provisioning Profiles' / (uuid + '.mobileprovision')
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        raise ValueError('Profile already exists on this runner; refusing to overwrite.')
    target.write_bytes((folder / 'profile.mobileprovision').read_bytes())
    (folder / 'installed-profile').write_text(str(target))
    (folder / 'profile-uuid').write_text(uuid)
    options = {'method': 'app-store-connect', 'destination': 'export', 'signingStyle': 'manual', 'teamID': team, 'signingCertificate': 'Apple Distribution', 'provisioningProfiles': {bundle: uuid}, 'manageAppVersionAndBuildNumber': False, 'uploadSymbols': True}
    (folder / 'ExportOptions.plist').write_bytes(plistlib.dumps(options))


if __name__ == '__main__':
    try:
        main(sys.argv[1])
    except (ValueError, KeyError, IndexError, OSError) as error:
        # Configuration diagnostics only; never print key/certificate contents.
        raise SystemExit(str(error))

#!/usr/bin/env bash
# Runs only on a temporary GitHub-hosted macOS runner. Never enable shell tracing.
set -euo pipefail
umask 077
LH_SIGN_DIR="$RUNNER_TEMP/lichhoc-signing"
mkdir -p "$LH_SIGN_DIR"
export LH_SIGN_DIR
python3 - <<'PY'
import base64, os
from pathlib import Path
for key, name in [('IOS_SIGNING_KEY_BASE64','key.pem'), ('IOS_CERTIFICATE_BASE64','certificate.cer'), ('IOS_PROFILE_BASE64','profile.mobileprovision')]:
    Path(os.environ['LH_SIGN_DIR'], name).write_bytes(base64.b64decode(os.environ[key], validate=True))
PY
openssl x509 -inform DER -in "$LH_SIGN_DIR/certificate.cer" -out "$LH_SIGN_DIR/certificate.pem"
LH_P12_PASSWORD="$(openssl rand -hex 32)"
echo "::add-mask::$LH_P12_PASSWORD"
export LH_P12_PASSWORD
openssl pkcs12 -export -inkey "$LH_SIGN_DIR/key.pem" -passin env:IOS_SIGNING_KEY_PASSWORD -in "$LH_SIGN_DIR/certificate.pem" -out "$LH_SIGN_DIR/signing.p12" -passout env:LH_P12_PASSWORD
security cms -D -i "$LH_SIGN_DIR/profile.mobileprovision" > "$LH_SIGN_DIR/profile.plist"
python3 scripts/ios-profile.py install
LH_KEYCHAIN="$RUNNER_TEMP/lichhoc-signing.keychain-db"
LH_KEYCHAIN_PASSWORD="$(openssl rand -hex 32)"
echo "::add-mask::$LH_KEYCHAIN_PASSWORD"
printf '%s' "$LH_KEYCHAIN" > "$RUNNER_TEMP/lh-keychain-path"
security create-keychain -p "$LH_KEYCHAIN_PASSWORD" "$LH_KEYCHAIN"
security set-keychain-settings -lut 21600 "$LH_KEYCHAIN"
security unlock-keychain -p "$LH_KEYCHAIN_PASSWORD" "$LH_KEYCHAIN"
security import "$LH_SIGN_DIR/signing.p12" -P "$LH_P12_PASSWORD" -A -t cert -f pkcs12 -k "$LH_KEYCHAIN"
security set-key-partition-list -S apple-tool:,apple:,codesign: -k "$LH_KEYCHAIN_PASSWORD" "$LH_KEYCHAIN" > /dev/null
security list-keychains -d user -s "$LH_KEYCHAIN"
export LH_PROFILE_UUID
LH_PROFILE_UUID="$(cat "$LH_SIGN_DIR/profile-uuid")"
python3 scripts/ios-assets.py
node scripts/ios-project.cjs
xcodebuild -project mobile/ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath "$LH_SIGN_DIR/LichHoc.xcarchive" archive
xcodebuild -exportArchive -archivePath "$LH_SIGN_DIR/LichHoc.xcarchive" -exportOptionsPlist "$LH_SIGN_DIR/ExportOptions.plist" -exportPath "$GITHUB_WORKSPACE/mobile/ios-output"
# The uploader uses one fixed path, independent of the Xcode product filename.
python3 - <<'PY'
import os
from pathlib import Path
folder = Path(os.environ['GITHUB_WORKSPACE'], 'mobile/ios-output')
files = list(folder.glob('*.ipa'))
if len(files) != 1:
    raise SystemExit('Expected exactly one exported IPA.')
target = folder / 'App.ipa'
if files[0] != target:
    files[0].rename(target)
PY

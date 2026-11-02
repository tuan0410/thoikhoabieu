"""Prepare the existing calendar brand as an opaque iOS app icon."""
import json
from pathlib import Path
from make_icons import icon

root = Path(__file__).resolve().parent.parent
catalog = root / 'mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset'
if not catalog.is_dir():
    raise SystemExit('Generate the iOS project first (npm run add:ios in mobile).')
(catalog / 'AppIcon.png').write_bytes(icon(1024))
(catalog / 'Contents.json').write_text(json.dumps({
    'images': [{'filename': 'AppIcon.png', 'idiom': 'universal', 'platform': 'ios', 'size': '1024x1024'}],
    'info': {'author': 'xcode', 'version': 1}
}, indent=2), encoding='utf-8')
print('Prepared opaque 1024px app icon for the iOS asset catalog.')

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const config = require('../mobile/capacitor.config.json');
const xml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function applyAssets() {
  const android = path.join(root, 'mobile/android/app/src/main/res');
  if (!process.argv.includes('--ios') && fs.existsSync(android)) {
    for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
      const folder = path.join(android, 'mipmap-' + density);
      fs.mkdirSync(folder, { recursive: true });
      for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) fs.copyFileSync(path.join(root, 'icons/android-' + size + '.png'), path.join(folder, name));
    }
    const drawable = path.join(android, 'drawable-nodpi'); fs.mkdirSync(drawable, { recursive: true });
    fs.copyFileSync(path.join(root, 'icons/icon-512.png'), path.join(drawable, 'neon_logo.png'));
    const standardDrawable = path.join(android, 'drawable'); fs.mkdirSync(standardDrawable, { recursive: true });
    fs.writeFileSync(path.join(standardDrawable, 'neon_foreground.xml'), '<inset xmlns:android="http://schemas.android.com/apk/res/android" android:inset="18dp"><bitmap android:src="@drawable/neon_logo" android:gravity="fill" /></inset>\n');
    const adaptive = path.join(android, 'mipmap-anydpi-v26'); fs.mkdirSync(adaptive, { recursive: true });
    const adaptiveXml = '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/neon_icon_background" /><foreground android:drawable="@drawable/neon_foreground" /></adaptive-icon>\n';
    for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) fs.writeFileSync(path.join(adaptive, name), adaptiveXml);
    fs.writeFileSync(path.join(android, 'values/neon_colors.xml'), '<resources><color name="neon_icon_background">#08051A</color></resources>\n');
    const stringsPath = path.join(android, 'values/strings.xml');
    const strings = fs.readFileSync(stringsPath, 'utf8').replace(/(<string name="(?:app_name|title_activity_main)">)[\s\S]*?(<\/string>)/g, (_, before, after) => before + xml(config.appName) + after);
    fs.writeFileSync(stringsPath, strings);
    console.log('Applied Neon Android launcher icons and app name.');
  }
  const ios = path.join(root, 'mobile/ios/App/App');
  if (fs.existsSync(ios)) {
    const catalog = path.join(ios, 'Assets.xcassets/AppIcon.appiconset'); fs.mkdirSync(catalog, { recursive: true });
    fs.copyFileSync(path.join(root, 'icons/icon-1024.png'), path.join(catalog, 'AppIcon.png'));
    fs.writeFileSync(path.join(catalog, 'Contents.json'), JSON.stringify({ images: [{ filename: 'AppIcon.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }], info: { author: 'xcode', version: 1 } }, null, 2));
    const plist = path.join(ios, 'Info.plist');
    let text = fs.readFileSync(plist, 'utf8');
    if (!/<key>CFBundleDisplayName<\/key>\s*<string>/.test(text)) throw new Error('iOS display name entry was not found.');
    text = text.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[\s\S]*?(<\/string>)/, (_, before, after) => before + xml(config.appName) + after);
    fs.writeFileSync(plist, text);
    console.log('Applied Neon iOS app icon and display name.');
  } else if (process.argv.includes('--ios')) throw new Error('Generate the iOS project before applying icons.');
}
if (require.main === module) applyAssets();
module.exports = { applyAssets };

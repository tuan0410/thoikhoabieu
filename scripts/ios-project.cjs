'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const config = require('../mobile/capacitor.config.json');
const project = require(path.join(root, 'mobile/node_modules/xcode')).project(path.join(root, 'mobile/ios/App/App.xcodeproj/project.pbxproj'));
project.parseSync();
const team = process.env.APPLE_TEAM_ID, profile = process.env.LH_PROFILE_UUID;
const buildNumber = process.env.GITHUB_RUN_NUMBER;
if (!/^[A-Z0-9]{10}$/.test(team || '') || !/^[a-fA-F0-9-]{36}$/.test(profile || '') || !/^\d+$/.test(buildNumber || '')) throw new Error('Invalid signing configuration.');
let updated = 0;
for (const entry of Object.values(project.pbxXCBuildConfigurationSection())) {
  const settings = entry?.buildSettings;
  if (!settings || String(settings.PRODUCT_BUNDLE_IDENTIFIER || '').replace(/"/g, '') !== config.appId) continue;
  Object.assign(settings, { CODE_SIGN_STYLE: 'Manual', DEVELOPMENT_TEAM: team, CODE_SIGN_IDENTITY: '"Apple Distribution"', PROVISIONING_PROFILE_SPECIFIER: profile, CURRENT_PROJECT_VERSION: buildNumber, MARKETING_VERSION: '0.1.0' });
  updated++;
}
if (!updated) throw new Error('App build configurations were not found.');
if (process.argv.includes('--check')) console.log(`Validated signing settings for ${updated} app configurations; project was not changed.`);
else fs.writeFileSync(project.filepath, project.writeSync());

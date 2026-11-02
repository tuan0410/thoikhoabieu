'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const mobile = path.join(root, 'mobile');
function prepareAssets() {
  delete require.cache[require.resolve('./build-vercel.cjs')];
  require('./build-vercel.cjs');
  fs.cpSync(path.join(root, 'public'), path.join(mobile, 'www'), { recursive: true });
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  html = html.replace('<script defer src="js/data.js">', '<script defer src="js/native-runtime.js"></script>\n<script defer src="js/data.js">');
  fs.writeFileSync(path.join(mobile, 'www/index.html'), html);
  const readers = ['uth-parser.js', 'fpt-parser.js', 'fpt-exams.js', 'semester.js'].map(name => fs.readFileSync(path.join(root, 'extension', name), 'utf8'));
  const bundle = readers.join('\n;\n') + '\n;\n' + fs.readFileSync(path.join(mobile, 'portal/reader.js'), 'utf8');
  for (const directory of ['portal/android/src/main/assets', 'portal/ios/Sources/LichHocPortal/Resources']) {
    fs.mkdirSync(path.join(mobile, directory), { recursive: true });
    fs.writeFileSync(path.join(mobile, directory, 'portal-reader.js'), bundle);
  }
  return { mobile, bundle };
}
async function build() {
  prepareAssets();
  const esbuild = require(path.join(mobile, 'node_modules/esbuild'));
  await esbuild.build({ entryPoints: [path.join(mobile, 'runtime-entry.js')], outfile: path.join(mobile, 'www/js/native-runtime.js'), bundle: true, format: 'iife', target: ['es2020'], minify: true });
  console.log('Mobile assets prepared. Run cap sync before building the app.');
}
if (require.main === module) build().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { prepareAssets };

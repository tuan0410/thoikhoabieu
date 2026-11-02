'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
// Publish only application assets; never copy the repository or database directory.
const assets = ['index.html', 'offline.html', 'style.css', 'sw.js', 'manifest.webmanifest'];
for (const folder of ['js', 'icons']) {
  function collect(directory) {
    for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const name = `${directory}/${entry.name}`;
      if (entry.isDirectory()) collect(name);
      else if (/^js\/(?:views\/)?[a-z-]+\.js$/.test(name) || /^icons\/(icon-192|icon-512|icon-maskable-512|apple-touch-icon)\.png$/.test(name)) assets.push(name);
    }
  }
  collect(folder);
}
for (const name of assets) {
  const target = path.join(root, 'public', name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, name), target);
}
console.log(`Prepared ${assets.length} public assets. API requests are handled by api/index.js.`);

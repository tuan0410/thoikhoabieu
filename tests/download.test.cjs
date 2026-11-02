const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { once } = require('node:events');
const { createApp } = require('../server.cjs');

test('Install link opens a public download page with a direct APK and an honest iPhone status', async t => {
  const app = createApp({ dbPath: ':memory:' }); app.listen(0, '127.0.0.1'); await once(app, 'listening');
  t.after(() => new Promise(resolve => app.close(resolve)));
  const base = `http://127.0.0.1:${app.address().port}`;
  const home = await (await fetch(base)).text();
  assert.match(home, /<a[^>]*href="\/download\.html"[^>]*id="installBtn"/);
  const response = await fetch(base + '/download.html');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /releases\/download\/android-preview\/lichhoc-android\.apk/);
  assert.doesNotMatch(html, /actions\/runs|artifacts\/|\.ipa"/);
  assert.match(html, /<button[^>]*disabled>Chưa có bản iPhone/);
  assert.match(html, /id="pwaInstallBtn"/);
  assert.equal((await fetch(base + '/js/download.js')).status, 200);
});

test('Native app download remains reachable from an installed PWA; web installation uses a separate button', async () => {
  const handlers = {}, main = { hidden: false }, pwa = { hidden: false };
  let prompts = 0;
  const dialog = { showModal() {}, close() {} };
  const nodes = { installBtn: main, pwaInstallBtn: pwa, installDialog: dialog, installHelp: {}, closeInstallDialog: {} };
  for (const [id, node] of Object.entries(nodes)) node.addEventListener = (event, fn) => { handlers[id + ':' + event] = fn; };
  const window = { LH: {}, matchMedia: () => ({ matches: true }), addEventListener: (event, fn) => handlers[event] = fn };
  const context = vm.createContext({ window, navigator: {}, document: { getElementById: id => nodes[id] } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/pwa.js'), 'utf8'), context);
  window.LH.pwa.init();
  assert.equal(main.hidden, false);
  assert.equal(pwa.hidden, true);
  assert.equal(handlers['installBtn:click'], undefined);
  handlers.beforeinstallprompt({ preventDefault() {}, prompt: async () => prompts++, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  await handlers['pwaInstallBtn:click']();
  assert.equal(prompts, 1);
  handlers.appinstalled();
  assert.equal(main.hidden, false);
  window.LHNative = {}; window.LH.pwa.init();
  assert.equal(main.hidden, true);
});

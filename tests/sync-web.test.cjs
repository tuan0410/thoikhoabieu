const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(version) {
  const callbacks = {}, receivers = new Set(), calls = [];
  const origin = 'https://schedule-information.vercel.app';
  const LH = { state: { user: { id: 'user' }, busy: false }, esc: x => String(x), render() {}, notice() {},
    api: async (path, method) => { calls.push([path, method]); return { ticket: 'ticket', expires: Date.now()+60000 }; }
  };
  const window = { LH, addEventListener: (name, fn) => { if (name === 'message') receivers.add(fn); }, removeEventListener: (name, fn) => receivers.delete(fn),
    postMessage: message => queueMicrotask(() => { for (const fn of receivers) fn({ source: window, origin, data: { channel: 'LICHHOC_EXTENSION', requestId: message.requestId, result: message.type === 'PING' ? { version } : { opened: true } } }); })
  };
  const context = vm.createContext({ window, location: { origin }, document: { addEventListener: (name, fn) => callbacks[name] = fn }, crypto: require('node:crypto').webcrypto, setTimeout, clearTimeout, setInterval() {}, Date });
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../js/sync.js'), 'utf8'), context);
  LH.schools = [{ id: 'uth', enabled: true, name: 'UTH', portalUrl: 'https://portal.ut.edu.vn' }];
  LH.sync.init();
  return { LH, calls, click: () => callbacks.click({ target: { closest: () => ({ dataset: { syncAction: 'connect' } }) } }) };
}
test('Hosted connection rejects old extension before creating tickets and keeps the error visible', async () => {
  const { LH, calls, click } = setup('0.4.1');
  await click();
  assert.equal(calls.length, 0);
  assert.match(LH.sync.view(), /role="alert"/);
  assert.match(LH.sync.view(), /0\.4\.2/);
});
test('Hosted connection with current extension creates ticket and restores enabled button', async () => {
  const { LH, calls, click } = setup('0.4.2');
  await click();
  assert.deepEqual(calls, [['sync/ticket', 'POST']]);
  assert.ok(LH.syncStatus.pendingUntil > Date.now());
  assert.doesNotMatch(LH.sync.view(), /role="alert"|data-sync-action="connect" disabled/);
});

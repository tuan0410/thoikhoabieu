const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Tiện ích: chỉ kết nối đúng web, đúng tab UTH, không gửi cookie và xóa vé sau khi nhập', async () => {
  const values = {}, requests = [], opened = [];
  let listener;
  const context = vm.createContext({ URL, Date,
    chrome: {
      runtime: { getManifest: () => ({ version: '0.1.0' }), onMessage: { addListener: fn => listener = fn } },
      tabs: { create: async options => { opened.push(options); return { id: 42 }; } },
      storage: { session: {
        set: async entries => Object.assign(values, entries),
        get: async key => ({ [key]: values[key] }), remove: async key => delete values[key]
      } }
    },
    fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({ summary: { count: 1 } }) }; }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../extension/background.js'), 'utf8'), context);
  const send = (type, payload, sender) => new Promise(resolve => listener({ type, payload }, sender, resolve));
  const app = { url: 'http://localhost:3000/#dong-bo', tab: { id: 1 } };
  const portal = { url: 'https://portal.ut.edu.vn/calendar', tab: { id: 42 } };
  assert.equal((await send('PING', null, app)).result.version, '0.1.0');
  const connection = { schoolId: 'uth', ticket: 'a'.repeat(64), expires: Date.now() + 600000, userName: 'Người dùng' };
  assert.ok((await send('CONNECT', connection, { url: 'https://untrusted.example/' })).error);
  assert.equal(opened.length, 0);
  assert.equal((await send('CONNECT', connection, app)).result.opened, true);
  assert.equal(opened[0].url, 'https://portal.ut.edu.vn/calendar');
  const info = await send('CONNECTION', null, portal);
  assert.equal(info.result.userName, 'Người dùng');
  assert.equal(info.result.ticket, undefined);
  assert.ok((await send('IMPORT', {}, { ...portal, tab: { id: 99 } })).error);
  assert.equal(requests.length, 0);
  assert.ok((await send('IMPORT', {}, { ...portal, url: 'https://portal.ut.edu.vn/login' })).error);
  const imported = await send('IMPORT', { schoolId: 'uth', events: [] }, portal);
  assert.equal(imported.result.summary.count, 1);
  assert.equal(requests[0].url, 'http://localhost:3000/api/sync/uth/import');
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(requests[0].options.redirect, 'error');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer ' + connection.ticket);
  assert.equal(values.connection, undefined);
  assert.ok((await send('IMPORT', {}, portal)).error);
  const fptTicket = { ...connection, schoolId: 'fpt-qn' };
  assert.equal((await send('CONNECT', fptTicket, app)).result.opened, true);
  assert.equal(opened[1].url, 'https://fap.fpt.edu.vn/');
  assert.ok((await send('IMPORT', { schoolId: 'fpt-qn' }, portal)).error);
  const fap = { url: 'https://fap.fpt.edu.vn/Report/ScheduleOfWeek.aspx', tab: { id: 42 } };
  assert.ok((await send('IMPORT', { schoolId: 'uth' }, fap)).error);
  assert.equal((await send('IMPORT', { schoolId: 'fpt-qn' }, fap)).result.summary.count, 1);
  assert.equal(requests[1].url, 'http://localhost:3000/api/sync/fpt-qn/import');
});

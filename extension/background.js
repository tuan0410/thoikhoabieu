'use strict';
const APP_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const PROVIDERS = {
  uth: { origin: 'https://portal.ut.edu.vn', entry: '/calendar', schedule: /^\/calendar\/?$/ },
  'fpt-qn': { origin: 'https://fap.fpt.edu.vn', entry: '/', schedule: /(?:\/WeeklyTimetable(?:\/|$)|\/ScheduleOfWeek\.aspx$)/i }
};
async function handle(message, sender) {
  const source = new URL(sender.url || 'about:blank');
  const app = APP_ORIGINS.includes(source.origin);
  if (message.type === 'PING' && app) return { version: chrome.runtime.getManifest().version };
  if (message.type === 'CONNECT' && app) {
    const payload = message.payload;
    const provider = Object.hasOwn(PROVIDERS, payload?.schoolId) ? PROVIDERS[payload.schoolId] : null;
    if (!provider || !/^[a-f0-9]{64}$/.test(payload.ticket) || !Number.isFinite(payload.expires) || payload.expires <= Date.now() || payload.expires > Date.now() + 11 * 60000) throw new Error('Phiên kết nối không hợp lệ.');
    const tab = await chrome.tabs.create({ url: provider.origin + provider.entry, active: true });
    await chrome.storage.session.set({ connection: {
      ticket: payload.ticket, expires: payload.expires, userName: String(payload.userName || ''),
      origin: source.origin, portalTabId: tab.id, schoolId: payload.schoolId
    } });
    return { opened: true };
  }
  if (message.type === 'DISCONNECT' && app) {
    const { connection } = await chrome.storage.session.get('connection');
    if (connection?.origin === source.origin) await chrome.storage.session.remove('connection');
    return { disconnected: true };
  }
  const { connection } = await chrome.storage.session.get('connection');
  const provider = Object.hasOwn(PROVIDERS, connection?.schoolId) ? PROVIDERS[connection.schoolId] : null;
  if (!provider || source.origin !== provider.origin) throw new Error('Trang không được hỗ trợ.');
  if (connection.expires <= Date.now() || connection.portalTabId !== sender.tab?.id) throw new Error('Hãy quay lại web Lịch Học và kết nối đúng trường để bắt đầu.');
  if (message.type === 'CONNECTION') return { userName: connection.userName, origin: connection.origin, expires: connection.expires };
  if (message.type === 'IMPORT' && provider.schedule.test(source.pathname)) {
    if (!APP_ORIGINS.includes(connection.origin)) throw new Error('Địa chỉ nhận không hợp lệ.');
    if (message.payload?.schoolId !== connection.schoolId) throw new Error('Lịch không thuộc trường đang kết nối.');
    const response = await fetch(connection.origin + '/api/sync/' + connection.schoolId + '/import', {
      method: 'POST', credentials: 'omit', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + connection.ticket },
      body: JSON.stringify(message.payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không gửi được lịch.');
    await chrome.storage.session.remove('connection');
    return result;
  }
  throw new Error('Thao tác không hợp lệ.');
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  handle(message, sender).then(result => reply({ result }), error => reply({ error: error.message }));
  return true;
});

'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { DatabaseSync } = require('node:sqlite');
const { SCHOOLS, mergeSchoolSchedule } = require('./lib/school-sync.cjs');
const isProvider = id => SCHOOLS.some(s => s.enabled && s.id === id);
const scrypt = promisify(crypto.scrypt);
const ROOT = __dirname;
const SESSION_AGE = 7 * 86400000;

function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function text(value, max, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, 'Thông tin không hợp lệ.');
  return value.trim();
}
function date(value) {
  const str = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str) || str < '2000-01-01' || str > '2100-12-31') fail(400, 'Ngày không hợp lệ.');
  const parsed = new Date(str + 'T00:00:00Z');
  if (isNaN(parsed) || parsed.toISOString().slice(0, 10) !== str) fail(400, 'Ngày không hợp lệ.');
  return str;
}
function time(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) fail(400, 'Giờ không hợp lệ.');
  return value;
}
function integer(value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) fail(400, 'Giá trị số không hợp lệ.');
  return value;
}
function cleanData(input) {
  if (!input || typeof input !== 'object') fail(400, 'Dữ liệu không hợp lệ.');
  const settings = input.settings || {};
  const start = date(settings.start);
  if (new Date(start + 'T00:00:00Z').getUTCDay() !== 1) fail(400, 'Ngày bắt đầu học kỳ phải là thứ hai.');
  const result = { settings: {
    name: text(settings.name, 80), school: text(settings.school, 160, false),
    start, weeks: integer(settings.weeks, 1, 52)
  } };
  for (const [key, limit] of [['courses', 100], ['sessions', 500], ['exams', 500], ['tasks', 1000]]) {
    if (!Array.isArray(input[key]) || input[key].length > limit) fail(400, 'Danh sách quá dài hoặc không hợp lệ.');
  }
  function idList(rows, transform) {
    const ids = new Set();
    return rows.map(row => {
      if (!row || typeof row !== 'object') fail(400, 'Mục dữ liệu không hợp lệ.');
      const id = text(row.id, 80);
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) fail(400, 'Mã dữ liệu bị trùng hoặc không hợp lệ.');
      ids.add(id);
      return { id, ...transform(row) };
    });
  }
  result.courses = idList(input.courses, c => ({
    name: text(c.name, 100), code: text(c.code, 30, false), teacher: text(c.teacher, 100, false),
    credits: integer(c.credits, 0, 30), color: /^var\(--c[1-7]\)$/.test(c.color) ? c.color : 'var(--c1)',
    ...(isProvider(c.provider) ? { provider: c.provider } : {})
  }));
  const courseIds = new Set(result.courses.map(c => c.id));
  function course(id) { if (!courseIds.has(id)) fail(400, 'Môn học không tồn tại.'); return id; }
  result.sessions = idList(input.sessions, s => {
    const from = time(s.s), to = time(s.e);
    if (from >= to) fail(400, 'Giờ kết thúc phải sau giờ bắt đầu.');
    const day = s.day ? date(s.day) : null;
    const d = integer(s.d, 1, 7);
    if (day && (new Date(day + 'T00:00:00Z').getUTCDay() || 7) !== d) fail(400, 'Ngày và thứ của buổi học không khớp.');
    return { c: course(s.c), d, s: from, e: to,
      room: text(s.room, 100, false), type: text(s.type, 60),
      ...(day ? { day } : {}), ...(isProvider(s.provider) && day ? { provider: s.provider } : {}) };
  });
  result.exams = idList(input.exams, x => ({
    c: course(x.c), day: date(x.day), time: time(x.time), dur: integer(x.dur, 1, 600),
    room: text(x.room, 100, false), form: text(x.form, 100)
  }));
  result.tasks = idList(input.tasks, t => {
    if (typeof t.done !== 'boolean') fail(400, 'Trạng thái bài tập không hợp lệ.');
    return { c: course(t.c), title: text(t.title, 160), due: date(t.due), done: t.done };
  });
  return result;
}
function emptyData() {
  const now = new Date();
  now.setDate(now.getDate() - (now.getDay() + 6) % 7);
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { settings: { name: 'Học kỳ của tôi', school: '', start, weeks: 15 }, courses: [], sessions: [], exams: [], tasks: [] };
}

function createApp({ dbPath = process.env.DB_PATH || path.join(ROOT, 'data', 'lichhoc.sqlite'), origin = process.env.APP_ORIGIN, secure = process.env.NODE_ENV === 'production' } = {}) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS schedules (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sync_tickets (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, session_token TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sync_status (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL);`);
  if (!db.prepare('PRAGMA table_info(sync_tickets)').all().some(column => column.name === 'school_id')) {
    db.exec("ALTER TABLE sync_tickets ADD COLUMN school_id TEXT NOT NULL DEFAULT 'uth'");
  }
  const attempts = new Map();
  const hash = value => crypto.createHash('sha256').update(value).digest('hex');
  const publicUser = user => ({ id: user.id, name: user.name, email: user.email });
  function session(req) {
    const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('lh_session='));
    if (!token) return null;
    return db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?')
      .get(hash(token.slice(11)), Date.now());
  }
  function setCookie(res, token, age = SESSION_AGE / 1000) {
    res.setHeader('Set-Cookie', `lh_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${secure ? '; Secure' : ''}`);
  }
  function login(user, res) {
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (token,user_id,expires) VALUES (?,?,?)').run(hash(token), user.id, Date.now() + SESSION_AGE);
    setCookie(res, token);
  }
  function json(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  }
  async function body(req) {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) fail(415, 'Yêu cầu cần có dữ liệu JSON.');
    let size = 0, chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 512000) fail(413, 'Dữ liệu quá lớn.'); chunks.push(chunk); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'Dữ liệu JSON không hợp lệ.'); }
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const expectedOrigin = origin || `http://${req.headers.host}`;
      const url = new URL(req.url, expectedOrigin);
      if (url.pathname.startsWith('/api/')) {
        // This endpoint accepts only a short-lived, one-use capability. It never uses cookies.
        const importRoute = /^\/api\/sync\/(uth|fpt-qn)\/import$/.exec(url.pathname);
        if (importRoute) {
          if (req.method !== 'POST') fail(405, 'Phương thức không hỗ trợ.');
          if (req.headers.origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(req.headers.origin)) fail(403, 'Chỉ nhận lịch từ tiện ích đã kết nối.');
          const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
          if (!token) fail(401, 'Thiếu phiên đồng bộ.');
          const ticketHash = hash(token[1]);
          const ticket = db.prepare('SELECT sync_tickets.* FROM sync_tickets JOIN sessions ON sessions.token=sync_tickets.session_token WHERE sync_tickets.token=? AND sync_tickets.expires>? AND sessions.expires>?')
            .get(ticketHash, Date.now(), Date.now());
          if (!ticket) fail(401, 'Phiên đồng bộ đã hết hạn hoặc đã sử dụng. Hãy kết nối lại từ Lịch Học.');
          if (ticket.school_id !== importRoute[1]) fail(403, 'Phiên đồng bộ không thuộc trường này.');
          const snapshot = await body(req);
          // Recheck after reading the body so two concurrent submissions cannot reuse a ticket.
          db.exec('BEGIN IMMEDIATE');
          try {
            const valid = db.prepare('SELECT sync_tickets.* FROM sync_tickets JOIN sessions ON sessions.token=sync_tickets.session_token WHERE sync_tickets.token=? AND sync_tickets.expires>? AND sessions.expires>?')
              .get(ticketHash, Date.now(), Date.now());
            if (!valid) fail(401, 'Phiên đồng bộ không còn hiệu lực.');
            const current = db.prepare('SELECT body,version FROM schedules WHERE user_id=?').get(valid.user_id);
            const merged = mergeSchoolSchedule(JSON.parse(current.body), snapshot, valid.school_id);
            const data = cleanData(merged.data);
            const summary = { ...merged.summary, importedAt: new Date().toISOString() };
            db.prepare('UPDATE schedules SET body=?,version=version+1 WHERE user_id=?').run(JSON.stringify(data), valid.user_id);
            db.prepare('INSERT INTO sync_status(user_id,body) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET body=excluded.body').run(valid.user_id, JSON.stringify(summary));
            db.prepare('DELETE FROM sync_tickets WHERE token=?').run(ticketHash);
            db.exec('COMMIT');
            return json(res, 200, { summary });
          } catch (err) { db.exec('ROLLBACK'); throw err; }
        }
        if (!['GET', 'HEAD'].includes(req.method)) {
          if (req.headers.origin !== expectedOrigin || req.headers['x-requested-with'] !== 'LichHoc') fail(403, 'Yêu cầu không hợp lệ. Hãy mở lại trang.');
        }
        if (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login') {
          if (req.method !== 'POST') fail(405, 'Phương thức không hỗ trợ.');
          const key = req.socket.remoteAddress;
          for (const [k, v] of attempts) if (v.until < Date.now()) attempts.delete(k);
          const attempt = attempts.get(key) || { count: 0, until: Date.now() + 15 * 60000 };
          if (++attempt.count > 30) fail(429, 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.');
          attempts.set(key, attempt);
          const data = await body(req);
          if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, 'Dữ liệu không hợp lệ.');
          const email = text(data.email, 254).toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Email không hợp lệ.');
          if (typeof data.password !== 'string' || data.password.length < 10 || data.password.length > 128) fail(400, 'Mật khẩu cần từ 10 đến 128 ký tự.');
          let user;
          if (url.pathname.endsWith('/register')) {
            const name = text(data.name, 80);
            const salt = crypto.randomBytes(16).toString('hex');
            const password = (await scrypt(data.password, salt, 64)).toString('hex');
            user = { id: crypto.randomUUID(), email, name, salt, password };
            db.exec('BEGIN');
            try {
              db.prepare('INSERT INTO users (id,email,name,salt,password) VALUES (?,?,?,?,?)').run(user.id, email, name, salt, password);
              db.prepare('INSERT INTO schedules (user_id,body) VALUES (?,?)').run(user.id, JSON.stringify(emptyData()));
              db.exec('COMMIT');
            } catch (err) { db.exec('ROLLBACK'); if (err.code?.startsWith('ERR_SQLITE')) fail(409, 'Không thể đăng ký với email này.'); throw err; }
          } else {
            user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
            const derived = await scrypt(data.password, user?.salt || '00000000000000000000000000000000', 64);
            if (!user || !crypto.timingSafeEqual(derived, Buffer.from(user.password, 'hex'))) fail(401, 'Email hoặc mật khẩu không đúng.');
          }
          login(user, res);
          return json(res, 200, { user: publicUser(user) });
        }
        if (url.pathname === '/api/auth/me' && req.method === 'GET') {
          const user = session(req);
          return json(res, 200, { user: user ? publicUser(user) : null });
        }
        if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
          const raw = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('lh_session='));
          if (raw) db.prepare('DELETE FROM sessions WHERE token=?').run(hash(raw.slice(11)));
          setCookie(res, '', 0);
          return json(res, 200, { ok: true });
        }
        const user = session(req);
        if (!user) fail(401, 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
        if (url.pathname === '/api/schools' && req.method === 'GET') return json(res, 200, { schools: SCHOOLS });
        if (url.pathname === '/api/sync/status' && req.method === 'GET') {
          const saved = db.prepare('SELECT body FROM sync_status WHERE user_id=?').get(user.id);
          const pending = db.prepare('SELECT expires,school_id FROM sync_tickets WHERE user_id=? AND expires>?').get(user.id, Date.now());
          return json(res, 200, { lastSync: saved ? JSON.parse(saved.body) : null, pendingUntil: pending?.expires || null, pendingSchoolId: pending?.school_id || null });
        }
        if (url.pathname === '/api/sync/ticket' && req.method === 'POST') {
          const input = await body(req);
          const school = SCHOOLS.find(s => s.id === input?.schoolId && s.enabled);
          if (!school) fail(400, 'Trường này chưa được hỗ trợ.');
          const raw = crypto.randomBytes(32).toString('hex');
          const expires = Date.now() + 10 * 60000;
          const sessionCookie = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('lh_session='));
          db.prepare('DELETE FROM sync_tickets WHERE user_id=? OR expires<=?').run(user.id, Date.now());
          db.prepare('INSERT INTO sync_tickets(token,user_id,session_token,expires,school_id) VALUES(?,?,?,?,?)').run(hash(raw), user.id, hash(sessionCookie.slice(11)), expires, school.id);
          return json(res, 200, { ticket: raw, expires, schoolId: school.id, calendarUrl: school.calendarUrl, userName: user.name });
        }
        if (url.pathname === '/api/sync/ticket' && req.method === 'DELETE') {
          db.prepare('DELETE FROM sync_tickets WHERE user_id=?').run(user.id);
          return json(res, 200, { ok: true });
        }
        if (url.pathname === '/api/data') {
          if (req.method === 'GET') {
            const row = db.prepare('SELECT body,version FROM schedules WHERE user_id=?').get(user.id);
            return json(res, 200, { data: JSON.parse(row.body), version: row.version });
          }
          if (req.method === 'PUT') {
            const input = await body(req);
            if (!input || typeof input !== 'object') fail(400, 'Dữ liệu không hợp lệ.');
            const data = cleanData(input.data);
            integer(input.version, 0, Number.MAX_SAFE_INTEGER);
            const result = db.prepare('UPDATE schedules SET body=?,version=version+1 WHERE user_id=? AND version=?')
              .run(JSON.stringify(data), user.id, input.version);
            if (!result.changes) fail(409, 'Dữ liệu đã thay đổi ở cửa sổ khác. Hãy tải lại trang trước khi sửa tiếp.');
            return json(res, 200, { data, version: input.version + 1 });
          }
          fail(405, 'Phương thức không hỗ trợ.');
        }
        fail(404, 'Không tìm thấy chức năng.');
      }
      if (!['GET', 'HEAD'].includes(req.method)) fail(405, 'Phương thức không hỗ trợ.');
      // Only application assets are public; never serve the database, tests or server source.
      const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      if (['/downloads/lichhoc-uth-extension.zip', '/downloads/lichhoc-schools-extension.zip'].includes(name)) {
        const archive = path.join(ROOT, 'downloads', 'lichhoc-uth-extension.zip');
        if (!fs.existsSync(archive)) fail(404, 'Chưa đóng gói tiện ích.');
        res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="lichhoc-schools-extension.zip"', 'Cache-Control': 'no-cache' });
        if (req.method === 'HEAD') return res.end();
        return fs.createReadStream(archive).pipe(res);
      }
      if (!(/^\/(index\.html|offline\.html|style\.css|sw\.js|manifest\.webmanifest)$/.test(name) || /^\/icons\/(icon-192|icon-512|icon-maskable-512|apple-touch-icon)\.png$/.test(name) || /^\/js\/(?:views\/)?[a-z-]+\.js$/.test(name))) fail(404, 'Không tìm thấy trang.');
      const file = path.join(ROOT, name.slice(1));
      if (!fs.existsSync(file)) fail(404, 'Không tìm thấy trang.');
      const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' }[path.extname(file)];
      res.writeHead(200, { 'Content-Type': `${mime}; charset=utf-8`, 'Cache-Control': 'no-cache' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      if (!err.status) console.error(err);
      json(res, err.status || 500, { error: err.status ? err.message : 'Máy chủ gặp lỗi. Vui lòng thử lại.' });
    }
  });
  server.on('close', () => db.close());
  return server;
}
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Lịch Học: http://localhost:${port}`));
}
module.exports = { createApp, cleanData, emptyData };

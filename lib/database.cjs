'use strict';
const fs = require('node:fs');
const path = require('node:path');

function openDatabase({ dbPath, url = process.env.TURSO_DATABASE_URL, authToken = process.env.TURSO_AUTH_TOKEN, client: suppliedClient } = {}) {
  if (process.env.VERCEL && (!url || !authToken)) {
    throw new Error('Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel, then redeploy.');
  }
  if (url) {
    if (!/^(libsql|https):\/\//.test(url)) throw new Error('Database URL must use libsql:// or https://');
    const client = suppliedClient || require('@libsql/client/web').createClient({ url, authToken });
    let transaction;
    const execute = (sql, args = []) => (transaction || client).execute({ sql, args });
    return {
      prepare(sql) {
        return {
          async get(...args) { return (await execute(sql, args)).rows[0]; },
          async all(...args) { return (await execute(sql, args)).rows; },
          async run(...args) { const result = await execute(sql, args); return { changes: result.rowsAffected }; }
        };
      },
      async exec(sql) {
        if (/^BEGIN(?: IMMEDIATE)?$/.test(sql)) { transaction = await client.transaction('write'); return; }
        if (sql === 'COMMIT' || sql === 'ROLLBACK') {
          const active = transaction;
          try { if (active) await active[sql === 'COMMIT' ? 'commit' : 'rollback'](); }
          finally { transaction = undefined; active?.close(); }
          return;
        }
        // Schema statements contain no user input. executeMultiple cannot be used in a transaction.
        await client.executeMultiple(sql);
      },
      close() { transaction?.close(); client.close(); }
    };
  }
  const { DatabaseSync } = require('node:sqlite');
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  return db;
}
module.exports = { openDatabase };

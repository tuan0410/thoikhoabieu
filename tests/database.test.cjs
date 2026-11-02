'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('../lib/database.cjs');
test('Remote database awaits transactions, preserves rowsAffected, and rolls back', async () => {
  const calls = [];
  const tx = {
    execute: async statement => { calls.push(['tx', statement]); return { rows: [{ value: 42 }], rowsAffected: 2 }; },
    commit: async () => calls.push('commit'), rollback: async () => calls.push('rollback'), close: () => calls.push('tx-close')
  };
  const client = {
    execute: async statement => { calls.push(['client', statement]); return { rows: [], rowsAffected: 0 }; },
    executeMultiple: async sql => calls.push(sql), transaction: async mode => { calls.push(mode); return tx; }, close: () => calls.push('close')
  };
  const db = openDatabase({ url: 'libsql://test.turso.io', authToken: 'test', client });
  assert.equal(await db.prepare('SELECT ?').get('absent'), undefined);
  await db.exec('BEGIN IMMEDIATE');
  assert.deepEqual(await db.prepare('SELECT ?').get(42), { value: 42 });
  assert.equal((await db.prepare('UPDATE x').run()).changes, 2);
  await db.exec('ROLLBACK');
  assert.equal((await db.prepare('UPDATE x').run()).changes, 0);
  await db.exec('BEGIN'); await db.exec('COMMIT'); db.close();
  assert.ok(calls.includes('rollback')); assert.ok(calls.includes('commit'));
  assert.deepEqual(calls[0], ['client', { sql: 'SELECT ?', args: ['absent'] }]);
});
test('Serverless refuses ephemeral SQLite when database secrets are missing', () => {
  const old = process.env.VERCEL; process.env.VERCEL = '1';
  try { assert.throws(() => openDatabase({ dbPath: ':memory:', url: '', authToken: '' }), /Configure TURSO/); }
  finally { if (old === undefined) delete process.env.VERCEL; else process.env.VERCEL = old; }
});

'use strict';
// Local source is read-only. The destination must contain no application data.
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
async function main() {
  const source = new DatabaseSync(process.env.DB_PATH || path.join(__dirname, '../data/lichhoc.sqlite'), { readOnly: true });
  try {
    const rows = Object.fromEntries(['users', 'schedules', 'sync_status'].map(table => [table, source.prepare(`SELECT * FROM ${table}`).all()]));
    console.log(`Source: ${rows.users.length} accounts, ${rows.schedules.length} schedules, ${rows.sync_status.length} sync summaries.`);
    if (!process.argv.includes('--apply')) { console.log('Dry run only. Add --apply to copy into an empty Turso database.'); return; }
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) throw new Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN locally.');
    const { createClient } = require('@libsql/client/web');
    const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
    let tx;
    try {
      // First deploy the application to create the destination schema.
      tx = await client.transaction('write');
      for (const table of ['users', 'schedules', 'sessions', 'sync_tickets', 'sync_status']) {
        if (Number((await tx.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n)) throw new Error('Destination is not empty; migration stopped.');
      }
      const columns = { users: ['id', 'email', 'name', 'salt', 'password'], schedules: ['user_id', 'body', 'version'], sync_status: ['user_id', 'body'] };
      for (const [table, keys] of Object.entries(columns)) {
        for (const row of rows[table]) await tx.execute({ sql: `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, args: keys.map(key => row[key]) });
      }
      await tx.commit();
      console.log('Copied successfully. Existing users must sign in again; local data was not changed.');
    } catch (err) { if (tx && !tx.closed) await tx.rollback(); throw err; }
    finally { tx?.close(); client.close(); }
  } finally { source.close(); }
}
main().catch(() => { console.error('Migration failed. Check environment, destination schema, and that the destination is empty. No source data was modified.'); process.exitCode = 1; });

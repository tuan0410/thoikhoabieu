// Giữ lệnh kiểm tra cũ tương thích với bộ kiểm thử hiện tại.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const files = require('node:fs').readdirSync(__dirname).filter(name => name.endsWith('.test.cjs')).map(name => 'tests/' + name);
const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: path.join(__dirname, '..'), stdio: 'inherit'
});
process.exit(result.status ?? 1);

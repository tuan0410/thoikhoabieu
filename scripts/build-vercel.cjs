'use strict';
// Serve assets through the existing explicit allowlist; never publish the repository root.
require('node:fs').mkdirSync('public', { recursive: true });

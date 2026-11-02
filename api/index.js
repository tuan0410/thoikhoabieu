'use strict';
const { createApp } = require('../server.cjs');
let app;
module.exports = async (req, res) => {
  try {
    app ||= createApp();
    await app.handler(req, res);
  } catch (error) {
    console.error('Backend initialization failed:', error.message);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ error: 'M?y ch? ch?a k?t n?i ???c database. Vui l?ng ki?m tra c?u h?nh tri?n khai.' }));
  }
};

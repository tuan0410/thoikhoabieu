(() => {
  'use strict';
  window.addEventListener('message', async event => {
    const message = event.data;
    if (event.source !== window || event.origin !== location.origin || message?.channel !== 'LICHHOC_WEB') return;
    if (!['PING', 'CONNECT', 'DISCONNECT'].includes(message.type) || typeof message.requestId !== 'string') return;
    let response;
    try { response = await chrome.runtime.sendMessage({ type: message.type, payload: message.payload }); }
    catch { response = { error: 'Tiện ích vừa được tải lại. Hãy tải lại trang Lịch Học.' }; }
    window.postMessage({ channel: 'LICHHOC_EXTENSION', requestId: message.requestId, ...response }, location.origin);
  });
})();

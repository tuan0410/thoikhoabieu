(function (LH) {
  "use strict";
  LH.api = async function (url, method, data) {
    if (window.LHNative) {
      var nativeResult = await window.LHNative.request(url, method || 'GET', data);
      if (!nativeResult.payload || typeof nativeResult.payload !== 'object') throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
      if (nativeResult.status < 200 || nativeResult.status >= 300) {
        var nativeError = new Error(nativeResult.payload.error || 'Không thực hiện được yêu cầu.');
        nativeError.status = nativeResult.status;
        throw nativeError;
      }
      return nativeResult.payload;
    }
    var response;
    try {
      response = await fetch('/api/' + url, {
        method: method || 'GET', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'LichHoc' },
        body: data === undefined ? undefined : JSON.stringify(data)
      });
    } catch (e) { throw new Error('Không kết nối được máy chủ. Thay đổi chưa được lưu.'); }
    var payload;
    try { payload = await response.json(); } catch (e) { throw new Error('Máy chủ trả về dữ liệu không hợp lệ. Hãy chạy trang bằng npm start.'); }
    if (!response.ok) {
      var error = new Error(payload.error || 'Không thực hiện được yêu cầu.');
      error.status = response.status;
      throw error;
    }
    return payload;
  };
  LH.notice = function (message, error) {
    var el = document.getElementById('notice');
    el.textContent = message;
    el.className = 'notice' + (error ? ' error' : '');
    el.hidden = !message;
    el.setAttribute('role', error ? 'alert' : 'status');
  };
  LH.commit = async function (change) {
    if (LH.state.busy) return false;
    LH.state.busy = true;
    document.body.classList.add('saving');
    try {
      var next = JSON.parse(JSON.stringify(LH.state.data));
      change(next);
      var saved = await LH.api('data', 'PUT', { data: next, version: LH.state.version });
      LH.applyData(saved);
      LH.notice('Đã lưu vào tài khoản.');
      return true;
    } catch (error) {
      LH.notice(error.message, true);
      return false;
    } finally {
      LH.state.busy = false;
      document.body.classList.remove('saving');
    }
  };
})(window.LH = window.LH || {});

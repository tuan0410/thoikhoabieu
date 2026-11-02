(function (LH) {
  'use strict';
  var installPrompt = null;
  function installed() {
    if (window.LHNative) return true;
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }
  function paint() {
    var button = document.getElementById('installBtn');
    if (button) button.hidden = installed();
  }
  LH.pwa = {
    init: function () {
      var dialog = document.getElementById('installDialog');
      var help = document.getElementById('installHelp');
      document.getElementById('installBtn').addEventListener('click', async function () {
        if (installPrompt) {
          var prompt = installPrompt; installPrompt = null;
          try { await prompt.prompt(); await prompt.userChoice; }
          catch (error) { help.textContent = 'Hãy mở menu trình duyệt và chọn Cài đặt ứng dụng hoặc Thêm vào màn hình chính.'; dialog.showModal(); }
          paint();
          return;
        }
        var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        help.textContent = !window.isSecureContext
          ? 'Để cài ứng dụng trên điện thoại, hãy mở địa chỉ HTTPS của Lịch Học. Địa chỉ localhost chỉ dùng được trên chính thiết bị đang chạy máy chủ.'
          : ios
            ? 'Trên iPhone/iPad: mở trang bằng Safari, bấm Chia sẻ → Thêm vào Màn hình chính → Thêm. Nếu có tùy chọn Mở dưới dạng ứng dụng web, hãy bật tùy chọn đó.'
            : 'Trên Android: mở bằng Chrome, bấm menu ⋮ → Cài đặt ứng dụng hoặc Thêm vào màn hình chính. Nếu chưa thấy tùy chọn, chờ trang tải xong rồi thử lại. Trên máy tính, dùng biểu tượng cài ứng dụng ở thanh địa chỉ.';
        dialog.showModal();
      });
      document.getElementById('closeInstallDialog').addEventListener('click', function () { dialog.close(); });
      window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault(); installPrompt = event; paint();
      });
      window.addEventListener('appinstalled', function () { installPrompt = null; document.getElementById('installBtn').hidden = true; dialog.close(); });
      paint();
      if (!window.LHNative && 'serviceWorker' in navigator && window.isSecureContext) {
        navigator.serviceWorker.register('/sw.js').catch(function (error) { console.warn('Không đăng ký được PWA:', error.message); });
      }
    }
  };
})(window.LH = window.LH || {});

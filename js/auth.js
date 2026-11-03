(function (LH) {
  "use strict";
  var mode = 'login';
  LH.auth = {
    paint: function () {
      var register = mode === 'register';
      document.getElementById('authTitle').textContent = register ? 'Tạo tài khoản của bạn' : 'Đăng nhập Neon';
      document.getElementById('authNameField').hidden = !register;
      document.getElementById('authName').required = register;
      document.getElementById('authPassword').autocomplete = register ? 'new-password' : 'current-password';
      document.getElementById('authSubmit').textContent = register ? 'Tạo tài khoản' : 'Đăng nhập';
      document.getElementById('authSwitch').textContent = register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký';
      document.getElementById('authError').textContent = '';
    },
    show: function () {
      document.getElementById('authScreen').hidden = false;
      document.getElementById('appShell').hidden = true;
      LH.auth.paint();
    },
    enter: async function (user) {
      var payload = await LH.api('data');
      LH.state.user = user;
      LH.state.hidden = {};
      LH.state.editing = {};
      LH.state.weekOffset = 0;
      LH.applyData(payload);
      await LH.sync.load();
      var start = location.hash.slice(1);
      LH.state.view = LH.isView(start) ? start : 'tong-quan';
      document.getElementById('authScreen').hidden = true;
      document.getElementById('appShell').hidden = false;
      document.getElementById('accountName').textContent = user.name;
      document.getElementById('authForm').reset();
      LH.notice('');
      LH.render();
    },
    init: async function () {
      document.getElementById('authSwitch').addEventListener('click', function () {
        mode = mode === 'login' ? 'register' : 'login';
        LH.auth.paint();
      });
      document.getElementById('authForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        var button = document.getElementById('authSubmit');
        button.disabled = true;
        document.getElementById('authError').textContent = '';
        try {
          var payload = await LH.api('auth/' + mode, 'POST', {
            email: document.getElementById('authEmail').value,
            password: document.getElementById('authPassword').value,
            name: document.getElementById('authName').value
          });
          await LH.auth.enter(payload.user);
        } catch (error) { document.getElementById('authError').textContent = error.message; }
        finally { button.disabled = false; }
      });
      document.getElementById('logoutBtn').addEventListener('click', async function () {
        if (LH.state.busy) return;
        try {
          await LH.api('auth/logout', 'POST', {});
          LH.state.user = null;
          LH.state.data = null;
          LH.sync.reset();
          LH.COURSES = []; LH.SESSIONS = []; LH.TASKS = []; LH.EXAMS = [];
          document.getElementById('view').innerHTML = '';
          document.getElementById('nav').innerHTML = '';
          document.getElementById('sideFoot').innerHTML = '';
          document.getElementById('accountName').textContent = '';
          LH.menu.close();
          LH.auth.show();
        } catch (error) { LH.notice(error.message, true); }
      });
      LH.auth.show();
      try {
        var current = await LH.api('auth/me');
        if (current.user) await LH.auth.enter(current.user);
      } catch (error) { document.getElementById('authError').textContent = error.message; }
    }
  };
})(window.LH = window.LH || {});

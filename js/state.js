/* Dữ liệu riêng của người dùng; không lưu lịch và thông tin đăng nhập vào localStorage. */
(function (LH) {
  "use strict";
  LH.state = { user: null, data: null, version: 0, view: "tong-quan", filter: "all", hidden: {}, busy: false, editing: {} };
  LH.applyData = function (payload) {
    LH.state.data = payload.data;
    LH.state.version = payload.version;
    LH.COURSES = payload.data.courses;
    LH.SESSIONS = payload.data.sessions;
    LH.TASKS = payload.data.tasks;
    LH.EXAMS = payload.data.exams.map(function (x) {
      return Object.assign({}, x, { date: x.day.split("-").map(Number) });
    });
    LH.SEM_START = new Date(payload.data.settings.start + "T00:00:00");
    LH.TOTAL_WEEKS = payload.data.settings.weeks;
  };
  LH.uid = function () { return crypto.randomUUID(); };
})(window.LH = window.LH || {});

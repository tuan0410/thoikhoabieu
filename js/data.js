/* Cấu hình giao diện. Dữ liệu học tập được tải từ tài khoản trên máy chủ. */
(function (LH) {
  "use strict";
  LH.DAY_NAMES = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
  LH.VIEWS = [
    { id: "tong-quan", title: "Tổng quan", icon: "home" },
    { id: "thoi-khoa-bieu", title: "Thời khóa biểu", icon: "cal" },
    { id: "mon-hoc", title: "Môn học", icon: "book" },
    { id: "bai-tap", title: "Bài tập và deadline", icon: "task" },
    { id: "lich-thi", title: "Lịch kiểm tra và thi", icon: "exam" },
    { id: "quan-ly", title: "Quản lý lịch cá nhân", icon: "cal" },
    { id: "dong-bo", title: "Đồng bộ lịch trường", icon: "cal" }
  ];
  LH.COURSES = [];
  LH.SESSIONS = [];
  LH.EXAMS = [];
  LH.TASKS = [];
})(window.LH = window.LH || {});

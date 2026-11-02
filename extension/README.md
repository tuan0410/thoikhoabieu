# Lịch Học · UTH & FPT Quy Nhơn (Demo 0.2.0)

Để dùng FPT Quy Nhơn: cài hoặc Reload tiện ích này, tải lại web Lịch Học, chọn FPT Quy Nhơn để mở https://fap.fpt.edu.vn/. Chọn FU–Quy Nhơn, tự đăng nhập và vào Weekly timetable. Bấm Đọc lịch tuần → kiểm tra → Gửi về Lịch Học. Không nhập lịch thi, không đoán giờ từ slot; chưa kiểm chứng trên tài khoản FAP thật. Hướng dẫn UTH bên dưới vẫn áp dụng.

1. Chạy web bằng `npm.cmd start` ở thư mục dự án, mở http://localhost:3000 và đăng nhập.
2. Mở `chrome://extensions` hoặc `edge://extensions`, bật Developer mode.
3. Bấm Load unpacked, chọn thư mục này (chứa manifest.json).
4. Tải lại tab web Lịch Học, vào Đồng bộ lịch trường, chọn UTH, bấm Kết nối và mở lịch UTH.
5. Tự đăng nhập UTH. Vào /calendar, bấm Đọc lịch tuần trong bảng Lịch Học ở góc dưới bên phải.
6. Kiểm tra bản xem trước và tài khoản nhận, bấm Gửi về Lịch Học.

Demo chỉ hỗ trợ localhost:3000 và 127.0.0.1:3000 trên cùng trình duyệt/profile, một kết nối mỗi lần, vé 10 phút dùng một lần. Muốn cập nhật tuần khác, kết nối lại.

Tiện ích chỉ đọc lịch đang hiển thị, không đọc cookie/mật khẩu/token trường, không gửi yêu cầu đăng nhập trường. Không có đồng bộ nền, lịch thi hay LMS. Lịch UTH trong tuần đang nhập sẽ được thay thế, lịch nhập tay được giữ lại.

Parser đã qua kiểm thử với dữ liệu/DOM mô phỏng; chưa kiểm chứng trên phiên UTH thật. Nếu không nhận đủ 7 ngày và giờ học rõ ràng, tiện ích sẽ báo lỗi thay vì đoán. Thư mục này là mã nguồn cần tự cài ở chế độ phát triển, chưa phát hành trên cửa hàng tiện ích.

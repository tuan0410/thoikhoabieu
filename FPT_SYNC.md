# Đồng bộ FPT Quy Nhơn qua FAP

## Dùng bản demo 0.2.0

1. Mở web Lịch Học trên máy tính, đăng nhập và vào **Đồng bộ lịch trường**.
2. Tải ZIP tiện ích mới, giải nén và Load unpacked trong `chrome://extensions` hoặc `edge://extensions`. Nếu đã dùng bản UTH 0.1.0, thay thư mục tiện ích bằng mã mới và bấm **Reload**. Không cần cài hai bản song song.
3. Tải lại tab Lịch Học. Với PWA, đóng hết cửa sổ ứng dụng rồi mở lại để nhận bản cập nhật.
4. Chọn **FPT Quy Nhơn** → **Kết nối và mở lịch FPT Quy Nhơn**.
5. Trên https://fap.fpt.edu.vn/, chọn cơ sở **FU–Quy Nhơn** và tự đăng nhập bằng phương thức trường cung cấp.
6. Vào **Weekly timetable / Thời khóa biểu từng tuần**, chọn đúng năm và tuần muốn nhập.
7. Trong bảng **Lịch Học · FPT Quy Nhơn**, bấm **Đọc lịch tuần**. Kiểm tra môn, ngày, giờ, phòng và tài khoản nhận rồi bấm **Gửi về Lịch Học**.
8. Quay lại Lịch Học → **Kiểm tra lại** hoặc **Xem tuần vừa nhập**.

Tiện ích không đọc mật khẩu, cookie/token FAP hoặc thông tin đăng nhập Google/FeID. Không có quyền trên các trang đăng nhập Google/FeID.

## Phạm vi và giới hạn

- Parser hỗ trợ cấu trúc bảng FAP cũ và bảng WeeklyTimetable mới; đọc ngày từ cột và năm từ lựa chọn năm hoặc ngày tham chiếu.
- Đọc giờ hiển thị như `07:00-09:20` hoặc `7h00-9h20`; không đoán giờ từ slot hoặc áp dụng giờ cố định giữa các cơ sở.
- Thiếu năm, thiếu cột ngày, nhiều khoảng giờ trong một ô hoặc nội dung không nhận diện: dừng nhập. Tuần giao năm cần ngày tham chiếu chính xác hoặc đầy đủ năm trong tiêu đề cột.
- Chỉ thay lịch mang nguồn `fpt-qn` trong tuần vừa đọc, giữ UTH, lịch nhập tay và các tuần khác. Nhập lại không tạo trùng.
- Vé gắn với người dùng, phiên đăng nhập và trường, có hiệu lực 10 phút, dùng một lần. Không thể dùng vé UTH để nhập FPT hoặc ngược lại.
- Không tự xác minh cơ sở của sinh viên trên FAP: người dùng cần chọn FU–Quy Nhơn và đối chiếu đúng lịch cá nhân trước khi gửi.
- Chưa nhập lịch thi, chưa đồng bộ nền và chưa đọc trực tiếp từ PWA điện thoại. Điện thoại xem lịch đã lưu bằng cùng tài khoản/máy chủ.

**Chưa kiểm chứng trên tài khoản FAP Quy Nhơn thật.** FAP trả 403 với công cụ đọc web trong môi trường phát triển. Kiểm thử dùng dữ liệu/DOM mô phỏng và API HTTP local; có thể cần điều chỉnh parser khi thử trên giao diện hiện hành.

## Nguồn tham khảo

- Tài liệu FPT Quy Nhơn về FAP và FU–Quy Nhơn (2021, đối chiếu giao diện hiện hành): https://lmsqn.fpt.edu.vn/hd/wp-content/uploads/2021/09/HUONG-DAN-CNTT-FPTU.QN-09.2021.pdf
- Hướng dẫn FAP chính thức: https://daihoc.fpt.edu.vn/tin-tuc-chung-2/huong-dan-su-dung-cong-thong-tin-dao-tao-fap-cho-tan-sinh-vien-dai-hoc-fpt/
- Tham khảo cấu trúc DOM từ dự án cộng đồng, không phải API chính thức: https://github.com/yunkhngn/fptu-schedule/blob/main/content.js

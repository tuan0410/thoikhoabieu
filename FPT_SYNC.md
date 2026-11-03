# Đồng bộ FPT Quy Nhơn qua FAP

## Dùng bản demo 0.2.0

### Cập nhật 0.4.0: đọc lịch thi ExamSchedule

**Sửa lỗi 0.4.1:** lấy tất cả các dòng lịch thi khác nhau trong bảng, cho phép nhiều ca cùng mã môn/loại thi. Khóa nhận diện gồm mã môn, loại thi, ngày, giờ, thời lượng và phòng; chỉ bỏ dòng giống hệt. Nhập lại cùng bảng không tạo trùng. Vì chưa có mã định danh lịch thi ổn định từ FAP, thay đổi ngày/giờ/phòng được giữ như một lịch riêng, không tự xóa lịch cũ để tránh mất ca thi khác. Bản ghi cũ kiểu 0.4.0 chỉ được chuyển sang khóa mới khi khớp chính xác một ca đang nhập.

Cài/Reload tiện ích 0.4.0, khởi động lại máy chủ và tải lại tab ứng dụng/FAP. Kết nối FPT Quy Nhơn từ web Neon; trong **chính tab FAP vừa mở**, bấm liên kết **Mở lịch thi FAP** ở bảng tiện ích để tới `/ExamSchedule`. Bấm **Đọc lịch thi** → kiểm tra mã môn, ngày, giờ, thời lượng, phòng, loại thi → **Gửi về Neon**. Kết quả xuất hiện trong **Lịch kiểm tra và thi**.

Mỗi vé chỉ nhập một lần. Nếu đã gửi lịch học trước đó, hãy kết nối lại để lấy vé mới trước khi đọc/gửi lịch thi. Không mở lịch thi ở tab khác với tab do nút Kết nối mở ra.

Parser nhận diện tiêu đề hoặc `data-label` của bảng tiếng Việt/Anh. Ngày phải có năm; giờ cần khoảng bắt đầu/kết thúc hoặc giờ bắt đầu kèm thời lượng rõ ràng. Lịch TBA/chưa đủ giờ sẽ báo dòng lỗi, không tự đoán. Đọc phần đang hiển thị; chưa tự đi qua phân trang hoặc đổi bộ lọc.

Máy chủ lưu riêng từng ca thi theo quy tắc 0.4.1 ở trên. Giữ lịch học, lịch thi nhập tay và các lịch thi cũ không có trong bản nhập; chưa tự nhận biết lịch đã hủy.

**Chưa kiểm chứng trên phiên FAP thật** vì trang trả 403 với công cụ đọc web. Nếu lỗi nhận diện, bấm **Xuất mẫu chẩn đoán lịch thi** trên trang ExamSchedule. File JSON chỉ có cấu trúc cột, nhãn đã chuẩn hóa và các giá trị ngày/giờ định dạng rõ ràng; không chứa tên/mã môn, phòng, mã sinh viên, mật khẩu, cookie, token hoặc HTML toàn trang. Có thể gửi file JSON hoặc mở file và dán nội dung vào chat; không cần ảnh.

### Cập nhật 0.3.0: đọc cả học kỳ

Cài/Reload tiện ích 0.3.0, khởi động lại máy chủ Node.js và tải lại tab Neon/FAP. Trên bảng tiện ích FPT, chọn **thứ hai đầu kỳ** và **chủ nhật cuối kỳ**, bấm **Đọc cả học kỳ**. Tiện ích tải lần lượt lịch của từng tuần, hiển thị tiến độ và cho xem trước toàn bộ trước khi gửi một lần. Có nút hủy đọc.

Hỗ trợ điều khiển tuần dạng `input[type=week]` ở WeeklyTimetable và form ASP.NET có `__doPostBack` ở ScheduleOfWeek.aspx. Nếu điều khiển thực tế khác, sẽ báo không hỗ trợ thay vì báo đã đọc cả kỳ. FAP cũ cần chọn đúng năm trước; khoảng giao năm có thể phải chia theo năm nếu danh sách tuần không chứa tuần cần đọc.

Một tuần lỗi/sai ngày sẽ dừng toàn bộ, không gửi phần đã đọc. Tuần trống chỉ được chấp nhận nếu parser đọc đủ ngày và các hàng slot trống; bản xem trước nêu rõ việc thay thế lịch FPT trong phạm vi. Máy chủ lưu toàn học kỳ trong một giao dịch. Tối đa 52 tuần và 3.000 buổi học lưu trong tài khoản. UTH vẫn dùng chế độ tuần; chế độ học kỳ này dành cho FPT. Chưa kiểm chứng luồng tải nhiều tuần trên tài khoản FAP thật.

1. Mở web Neon trên máy tính, đăng nhập và vào **Đồng bộ lịch trường**.
2. Tải ZIP tiện ích mới, giải nén và Load unpacked trong `chrome://extensions` hoặc `edge://extensions`. Nếu đã dùng bản UTH 0.1.0, thay thư mục tiện ích bằng mã mới và bấm **Reload**. Không cần cài hai bản song song.
3. Tải lại tab Neon. Với PWA, đóng hết cửa sổ ứng dụng rồi mở lại để nhận bản cập nhật.
4. Chọn **FPT Quy Nhơn** → **Kết nối và mở lịch FPT Quy Nhơn**.
5. Trên https://fap.fpt.edu.vn/, chọn cơ sở **FU–Quy Nhơn** và tự đăng nhập bằng phương thức trường cung cấp.
6. Vào **Weekly timetable / Thời khóa biểu từng tuần**, chọn đúng năm và tuần muốn nhập.
7. Trong bảng **Neon · FPT Quy Nhơn**, bấm **Đọc lịch tuần**. Kiểm tra môn, ngày, giờ, phòng và tài khoản nhận rồi bấm **Gửi về Neon**.
8. Quay lại Neon → **Kiểm tra lại** hoặc **Xem tuần vừa nhập**.

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

## Cập nhật 0.4.3

Đọc cả kỳ tiếp tục qua tuần chưa được xếp lịch: chấp nhận phản hồi WeekPartial trống hoặc thông báo không có lịch cho đúng tuần yêu cầu. Tuần đó hiển thị 0 buổi trong bản xem trước. Trang đăng nhập, lỗi máy chủ hoặc nội dung lớp chưa nhận diện vẫn dừng để tránh mất lịch. Khi xác nhận gửi, lịch FPT cũ trong tuần được xác nhận trống sẽ được xóa; lịch tay và nguồn khác được giữ. Chưa kiểm chứng trực tiếp trên tài khoản FAP thật. Tải gói mới, giải nén thay thư mục tiện ích, Reload rồi tải lại trang Neon và FAP.

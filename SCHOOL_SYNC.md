# Đồng bộ lịch trường — demo UTH

## Chạy thử

**Cập nhật 0.2.0:** đã bổ sung **FPT Quy Nhơn**; xem [FPT_SYNC.md](FPT_SYNC.md). Tiện ích chung hỗ trợ UTH và FPT, tách dữ liệu/vé theo trường. Tải bản mới ở `/downloads/lichhoc-schools-extension.zip`; đường dẫn UTH cũ vẫn dùng được.

1. Chạy `npm.cmd start`, mở **http://localhost:3000**, đăng nhập tài khoản Neon.
2. Vào **Đồng bộ lịch trường**, chọn **UTH · Đại học Giao thông vận tải TP.HCM**.
3. Tải ZIP tiện ích từ trang này và giải nén, hoặc dùng thư mục `extension/` trong mã nguồn.
4. Mở `chrome://extensions` hoặc `edge://extensions`, bật Developer mode, bấm **Load unpacked / Tải tiện ích đã giải nén**, chọn thư mục có `manifest.json`.
5. Tải lại tab Neon, bấm **Kết nối và mở lịch UTH**.
6. Tab **https://portal.ut.edu.vn/calendar** mở ra. Sinh viên tự đăng nhập vào trường và mở mục Lịch học nếu bị chuyển về trang chủ.
7. Trong bảng **Neon · UTH** ở góc dưới bên phải, bấm **Đọc lịch tuần**. Mở rộng cửa sổ máy tính để nhìn đủ thứ hai đến chủ nhật.
8. Đối chiếu tên môn, ngày, giờ, phòng và tên tài khoản nhận. Bấm **Gửi về Neon**.
9. Quay lại tab Neon. Trang tự kiểm tra trạng thái sau mỗi 4 giây khi đang được xem; có nút **Kiểm tra lại** và **Xem tuần vừa nhập**.

Tiện ích và web phải ở cùng trình duyệt/profile. Máy chủ local phải đang chạy. Demo hỗ trợ chính xác hai origin `http://localhost:3000` và `http://127.0.0.1:3000`. Nếu không tìm thấy tiện ích, tải lại trang sau khi cài.

## Đã triển khai

- Chọn trường từ danh mục do máy chủ cấp. UTH hoạt động trong luồng demo; tùy chọn **Trường khác · sắp hỗ trợ** có thông báo và đường dẫn nhập tay.
- Mở cổng/trang lịch theo cấu hình trường, không nhận URL chuyển hướng tùy ý từ trang ngoài.
- Tạo vé đồng bộ ngẫu nhiên 256 bit, có hiệu lực 10 phút và chỉ dùng một lần. Máy chủ chỉ lưu hash của vé.
- Vé gắn với người dùng và phiên đăng nhập Neon. Hủy phiên, kết nối lại hoặc đăng xuất làm vé cũ mất hiệu lực.
- Tiện ích ghép vé với đúng tab UTH vừa được mở, giữ vé trong storage.session, không đưa vé cho trang UTH.
- Chỉ đọc văn bản và vị trí các cột ngày/thẻ môn trên trang lịch. Không đọc cookie, mật khẩu, token đăng nhập trường; không tự thực hiện đăng nhập.
- Hiển thị bản xem trước. Trước khi gửi, đọc lại và từ chối nếu lịch đã đổi kể từ bản xem trước.
- Nhập môn học và buổi học có ngày cụ thể. Không biến một tuần đọc được thành lịch lặp lại toàn học kỳ.
- Nhập lại sẽ thay các buổi có nguồn UTH trong đúng tuần đó; giữ lịch nhập tay, bài tập, lịch thi và tuần khác. Chỉ cập nhật tên/mã các môn UTH, giữ giảng viên/tín chỉ người dùng bổ sung.
- Có nút chuyển tuần trên thời khóa biểu; thống kê tuần và tổng số buổi tính theo loại lịch lặp/lịch theo ngày.
- Nhập dữ liệu và ghi trạng thái nằm trong cùng giao dịch SQLite, không tạo trùng khi hai yêu cầu cùng dùng một vé.

## Giới hạn đã biết

**Chưa kiểm chứng trên phiên đăng nhập UTH thật hoặc cài trực tiếp tiện ích bằng công cụ trình duyệt của phiên làm việc này.** Công cụ trình duyệt không có browser access host. Parser hiện được kiểm thử với dữ liệu mô phỏng và DOM mô phỏng dựa trên mô tả cấu trúc công khai. Có thể cần điều chỉnh khi thử trên giao diện UTH hiện tại.

- Nhập tuần đang hiển thị theo yêu cầu, chưa tự cập nhật nền, chưa tự chuyển qua toàn học kỳ.
- Chưa nhập lịch kiểm tra/thi hoặc deadline từ LMS.
- Yêu cầu nhận diện đủ 7 ngày liên tiếp. Không đoán giờ từ số tiết. Nếu thiếu ngày, không đọc được giờ hoặc vị trí cột mơ hồ, tiện ích báo lỗi.
- Tuần không có thẻ môn sẽ không được gửi từ tiện ích demo để tránh xóa lịch do giao diện chưa tải xong. Nếu trường hủy toàn bộ buổi của một tuần, hiện cần xóa các mục đó bằng giao diện quản lý.
- Lịch UTH người dùng sửa trong web vẫn mang nguồn UTH; lần đồng bộ lại tuần đó sẽ cập nhật theo trường. Lịch nhập tay độc lập không bị thay thế.
- Không kiểm tra được sinh viên đang đăng nhập UTH có phải chủ tài khoản Neon hay không. Người dùng cần đối chiếu trước khi gửi; tiện ích chỉ đọc tab được mở trong lần kết nối đó.
- Chỉ giữ một kết nối đang chờ trong tiện ích demo. Bắt đầu kết nối tài khoản khác sẽ thay kết nối hiện tại.

## Thêm trường và đưa lên Internet

Danh mục nằm ở `lib/school-sync.cjs` (`SCHOOLS`). Mỗi trường mới cần URL cổng, URL lịch, parser và bộ nhập riêng đã kiểm chứng. Không bật một trường chỉ bằng cách đổi URL UTH.

Khi triển khai web trên tên miền thật, bổ sung origin HTTPS chính xác vào `extension/background.js` (`APP_ORIGINS`) và `host_permissions`/`content_scripts.matches` trong `extension/manifest.json`; đóng gói lại tiện ích. Không dùng quyền `<all_urls>`. Cấu hình APP_ORIGIN/HTTPS của máy chủ theo README. Tiện ích không tự cài vào trình duyệt.

## Nguồn tham khảo

- Cổng chính thức UTH: https://portal.ut.edu.vn/
- Thông tin UTH về lịch trên trang cá nhân: https://iec.ut.edu.vn/vi/cac-kenh-thong-tin-lien-he-ve-dao-tao-cong-tac-sinh-vien-chuong-trinh-hoan-toan-tieng-anh/
- Tham khảo mô tả cấu trúc DOM lịch UTH từ dự án cộng đồng (không phải API chính thức của trường): https://github.com/ThinhNguyen2005/extensions_uth_helper/blob/master/content.js
- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome extension requests: https://developer.chrome.com/docs/extensions/develop/concepts/network-requests
- Chrome storage.session: https://developer.chrome.com/docs/extensions/reference/api/storage

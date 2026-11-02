# Lịch Học trên Android và iPhone (PWA)

Đây là ứng dụng web cài từ trình duyệt, có biểu tượng trên màn hình chính và mở trong cửa sổ riêng. Không cần APK, Google Play hoặc App Store.

## Cài trên điện thoại

Trước tiên cần triển khai máy chủ theo README và mở web bằng **địa chỉ HTTPS thật**. `http://localhost:3000` trên điện thoại trỏ tới chính điện thoại, không trỏ tới máy tính đang chạy Node.js. Địa chỉ HTTP của máy trong mạng LAN không đủ để bật đầy đủ PWA trên điện thoại.

- **Android:** mở địa chỉ HTTPS bằng Chrome, đăng nhập, bấm **Cài ứng dụng**. Nếu trình duyệt không hiện hộp thoại, mở menu ⋮ → **Cài đặt ứng dụng** hoặc **Thêm vào màn hình chính**.
- **iPhone/iPad:** mở địa chỉ HTTPS bằng Safari, bấm **Chia sẻ** → **Thêm vào Màn hình chính** → **Thêm**. Nếu có tùy chọn mở dưới dạng ứng dụng web, bật tùy chọn đó.
- Sau khi cài, mở từ biểu tượng **Lịch Học**. Có thể cần đăng nhập lại trong ứng dụng đã cài.

Tên tùy chọn có thể thay đổi theo phiên bản/trình duyệt. Nút **Cài ứng dụng** có hướng dẫn tương ứng. Ứng dụng không tự cài thay người dùng.

## Các thay đổi cho mobile

- Manifest với chế độ standalone, biểu tượng 192/512 px, maskable icon và apple-touch-icon 180 px.
- Lịch tuần chuyển thành danh sách từng ngày trên màn hình nhỏ; vẫn có chuyển tuần và lọc môn. Trên màn hình lớn vẫn dùng lưới giờ.
- Nút bấm lớn hơn, trường nhập dùng font 16 px và khoảng trống cho vùng an toàn của điện thoại.
- Service worker chuẩn bị các tài nguyên giao diện công khai. Khi mở lại mà mất mạng, hiển thị trang giải thích và nút thử lại.
- Không cache API, mật khẩu, phiên đăng nhập hoặc lịch cá nhân trong Cache Storage. Phiên đăng nhập vẫn do cookie HttpOnly quản lý như bản web.

**Bản hiện tại cần kết nối máy chủ để đăng nhập, đọc và lưu lịch. Chưa có xem lịch ngoại tuyến, thông báo đẩy hoặc nhắc lịch nền.** Không đưa các chức năng chưa triển khai vào luồng cài ứng dụng.

## Đồng bộ UTH

Tiện ích demo UTH vẫn chạy trên Chrome/Edge máy tính, không chạy trong PWA điện thoại. Dùng máy tính nhập lịch vào tài khoản, rồi đăng nhập cùng tài khoản trên điện thoại để xem lịch. Cả hai phải dùng **cùng máy chủ/cơ sở dữ liệu**.

Khi đưa lên HTTPS, cập nhật origin của tiện ích theo SCHOOL_SYNC.md; tiện ích hiện đóng gói cho localhost:3000. Chưa có bộ đọc UTH trực tiếp trên điện thoại.

## Phát triển và phát hành bản cập nhật

- `npm.cmd start`: thử bản web/PWA trên chính máy tính bằng localhost.
- `npm.cmd test`: kiểm tra tài nguyên cài đặt, kích thước icon, chính sách service worker và các chức năng tài khoản/lịch.
- `python scripts/make_icons.py`: tạo lại icon từ hình lịch của ứng dụng, không cần thư viện Python bên ngoài.
- Khi thay đổi tập tài nguyên precache hoặc phát hành giao diện mới, đổi tên cache trong `sw.js` (ví dụ `lichhoc-shell-v2`). Worker mới chờ các cửa sổ đang dùng worker cũ đóng để tránh tự tải lại khi người dùng đang nhập form.
- Service worker và các file giao diện được máy chủ trả về với `Cache-Control: no-cache` để trình duyệt kiểm tra cập nhật.

Đã kiểm thử bằng mã và HTTP local; chưa thử cài thực tế trên thiết bị Android/iPhone vì công cụ trình duyệt của môi trường hiện không có kết nối. Chưa có tên miền HTTPS được triển khai trong phiên này.

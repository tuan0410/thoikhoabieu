# Neon trên Android và iPhone

Logo nguồn nằm trong `brand/neon-logo.png`. Các kích thước PNG đã xuất được lưu ở `icons`; `scripts/export-icons.ps1` là công cụ xuất lại trên Windows. Sau `cap add/sync`, `scripts/mobile-platform-assets.cjs` đặt icon Android/iPhone và tên Neon vào project native. Bundle ID vẫn là `com.tuan0410.lichhoc` để các bản cài tiếp tục thuộc cùng ứng dụng. `scripts/make_icons.py` hiện kiểm tra các PNG có sẵn, không vẽ lại logo cũ.

Mã app Capacitor dùng lại giao diện web, gọi backend HTTPS trên Vercel và dùng chung tài khoản/Turso. Không cần cài tiện ích trình duyệt trong bản native. Đây là mã triển khai để build và kiểm chứng, chưa phải bản đã phát hành trên App Store/Google Play.

## Luồng sử dụng

Trên web, nút **Cài ứng dụng** mở `/download.html`. Android tải trực tiếp `lichhoc-android.apk` từ release thử nghiệm `android-preview`, không yêu cầu GitHub login hoặc giải nén artifact. Workflow Android cập nhật file này sau khi build thành công trên `main`. iPhone hiện chưa có link TestFlight công khai; khi phát hành, cập nhật mục iPhone trong `download.html` bằng link TestFlight thật. Chức năng cài PWA có nút riêng trên trang tải.

1. Cài app native, đăng nhập tài khoản Neon.
2. Mở Đồng bộ, chọn trường và phạm vi. FPT có tuần, cả kỳ và lịch thi; UTH hiện có tuần đang mở.
3. Bấm Kết nối và mở lịch. App mở một WebView cổng trường riêng; sinh viên tự chọn cơ sở/đăng nhập.
4. Mở lịch, bấm **Đọc lịch** trên thanh điều khiển native. FPT đọc cả kỳ sẽ lần lượt gọi các tuần và chấp nhận tuần đã xác nhận trống.
5. App quay về bản xem trước. Chỉ bấm **Lưu vào tài khoản** mới gửi snapshot lên server.
6. Web, PWA, Android và iPhone đăng nhập cùng tài khoản để xem cùng dữ liệu.

## Build bằng máy phát triển

**Có Apple Developer nhưng chưa có máy Mac:** dùng [hướng dẫn ký và gửi TestFlight trên GitHub Actions](IOS_CLOUD.md). Mã workflow đã có; cần bạn đặt certificate/profile/API key trong GitHub Secrets để ký thật.

Node 24, npm và mạng để tải SDK. Android dùng Android Studio, SDK phù hợp Capacitor 8 và Java 21. iPhone dùng máy Mac có Xcode phù hợp Capacitor 8; bản cài thật cần ký bằng tài khoản Apple. Xem [môi trường Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup).

Trong `mobile`:

```sh
npm install
npm run add:android
npm run open:android
```

Trên Mac:

```sh
npm install
npm run add:ios
npm run open:ios
```

Sau lần tạo project đầu tiên, chạy `npm run sync` khi sửa mã web/bộ đọc, rồi build trong IDE. Không chạy `add` lần nữa với project đã tồn tại. Các project Android/iOS được sinh bởi CLI; source plugin trong `mobile/portal` được tự đăng ký. Bộ đọc từ `extension` được đóng gói trong app; không tải script thực thi từ cổng trường hay server của ứng dụng.

Build trước khi `cap sync`: bước build tạo `www` và resource bộ đọc native. Nếu sau này sửa plugin khi npm đã sao chép local package thay vì symlink, cài lại local dependency rồi sync.

## Kiểm tra tự động trên GitHub

Workflow **Mobile build checks** tạo Android debug APK và build iOS Simulator không ký. Artifact iOS Simulator **không cài được trên iPhone thật**; cần Xcode ký bản thiết bị hoặc phân phối TestFlight. Debug APK dùng để thử, chưa phải bản Play Store. Workflow không chứa khóa ký hay database token. Log workflow là bằng chứng build, chưa chứng minh đăng nhập trường thành công.

## Ranh giới và phần chưa xác minh

- Web/PWA không có quyền đọc tab cổng trường. Người dùng điện thoại cần bản native để dùng bộ đọc tích hợp. Cài PWA từ trình duyệt không biến nó thành bản native.
- Đăng nhập FAP/UTH trong WebView **chưa kiểm chứng trên tài khoản thật**. Google không cho OAuth trong embedded user-agent theo [chính sách](https://developers.google.com/identity/protocols/oauth2/policies). Nếu trường bắt buộc luồng này và chặn app, không giả user-agent, lấy cookie từ trình duyệt ngoài hoặc vượt chặn. Cần API/luồng được trường cho phép trước khi có thể hoàn tất kết nối đó. Mở trình duyệt ngoài không tự chuyển phiên về WebView.
- Cổng trường không có Capacitor bridge/JavaScriptInterface. Chỉ inject bộ đọc sau khi bấm nút native ở đúng HTTPS host và đường dẫn lịch. Trang đăng nhập và host ngoài allowlist không được đọc. Cookie cổng trường ở thiết bị, không đưa lên API.
- API Neon dùng CapacitorHttp native cookie jar và Origin cố định `https://schedule-information.vercel.app`; không mở CORS toàn cục và không lưu session token trong localStorage. Cần thử đăng nhập/khởi động lại/đăng xuất trên cả hai hệ điều hành.
- Snapshot được lưu qua `/api/sync/mobile/import`, kiểm tra phiên đăng nhập, Origin, schema và giao dịch database. Dữ liệu được lưu riêng theo tài khoản. Bản xem trước bị loại nếu đổi tài khoản. Cookie/mật khẩu trường không thuộc payload.
- Chỉ đọc khi người dùng thao tác, chưa có đồng bộ nền. UTH chưa đọc cả kỳ. Lịch thi FPT chỉ đọc bảng đang hiển thị, không tự phân trang.

## Kiểm chứng trước khi phát hành

Chạy `npm test` ở root; build Android/iOS; thử trên Android và iPhone thật: đăng ký, tải lại app, đăng nhập lại, thêm lịch, đăng xuất, kiểm tra hai tài khoản tách biệt. Đăng nhập trường, đọc cả kỳ có tuần trống, hủy giữa chừng, sai trang, hết phiên, xem trước trước khi lưu và mở lại lịch trên web. Không quảng bá hỗ trợ cổng trường đã hoạt động cho tới khi các bước này được kiểm chứng.

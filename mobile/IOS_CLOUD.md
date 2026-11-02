# Cài app iPhone qua TestFlight khi không có máy Mac

Có thể dùng máy macOS tạm thời của GitHub Actions để build, ký và gửi app lên App Store Connect. Bạn chỉ cần trình duyệt, tài khoản Apple Developer đang hoạt động và quyền tạo certificate/profile. Không cần đưa mật khẩu Apple ID cho ứng dụng hoặc gửi khóa qua chat.

Workflow đã có trong repo:

- **Prepare iPhone signing request**: tạo CSR và private key **được mã hóa** để bạn tạo certificate bằng trình duyệt.
- **Build signed iPhone app**: ký app, tạo IPA; chỉ gửi lên TestFlight nếu bạn đánh dấu lựa chọn upload khi chạy workflow. Mặc định không upload.

Hai workflow ký này chưa được chạy với thông tin Apple thật. Build iOS Simulator thành công không thay cho kiểm chứng ký và cài app lên thiết bị.

## 1. Tạo mật khẩu bảo vệ khóa ký

Trên **GitHub** mở repo `tuan0410/thoikhoabieu` → **Settings → Secrets and variables → Actions → New repository secret**. Đây là GitHub Secrets, không phải biến môi trường Vercel.

Tạo secret `IOS_SIGNING_KEY_PASSWORD`: mật khẩu ngẫu nhiên dài ít nhất 20 ký tự, giữ trong trình quản lý mật khẩu. Mật khẩu này dùng bảo vệ private key mới, không phải mật khẩu Apple ID.

Vào **Actions → Prepare iPhone signing request → Run workflow → main**. Khi chạy xong, tải artifact `ios-signing-request`, giải nén. Có hai file:

- `CertificateSigningRequest.certSigningRequest`: CSR để gửi cho Apple.
- `ios-signing-key.pem`: private key đã mã hóa. Giữ cùng mật khẩu; không commit hoặc gửi qua chat. Artifact chỉ giữ 7 ngày, tải và cất bản sao trong nơi riêng tư trước khi hết hạn.

Không chạy lại workflow để thay khóa một cách vô tình: certificate tạo từ CSR cũ chỉ khớp với private key cũ.

## 2. Tạo certificate, App ID và profile trên Apple

1. Mở [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list).
2. Trong **Certificates**, tạo **Apple Distribution**, tải CSR ở bước 1 lên, rồi tải certificate `.cer` xuống. Nếu đã hết hạn mức certificate, quản lý cùng chủ tài khoản; không tự thu hồi certificate đang dùng cho ứng dụng khác.
3. Trong **Identifiers**, đăng ký App ID rõ ràng với Bundle ID **`com.tuan0410.lichhoc`**, khớp `mobile/capacitor.config.json`. Nếu muốn dùng Bundle ID khác, sửa cấu hình và tạo lại profile theo ID đó trước khi build.
4. Trong **Profiles**, tạo profile phân phối **App Store Connect / App Store**, chọn đúng App ID và certificate vừa tạo. Tải file `.mobileprovision` về. Không chọn Development hoặc Ad Hoc cho workflow này.
5. Trong mục thông tin Membership của tài khoản Developer, lấy **Team ID** 10 ký tự.
6. Mở [App Store Connect](https://appstoreconnect.apple.com) → **My Apps → New App**, tạo app iOS, chọn đúng Bundle ID ở trên và đặt SKU riêng, ví dụ `lichhoc-ios`. Bản mã hiện đặt marketing version `0.1.0`.

## 3. Đưa thông tin ký vào GitHub Secrets

Tạo thêm các repository secrets:

| Secret | Giá trị |
| --- | --- |
| `IOS_SIGNING_KEY_BASE64` | Base64 của `ios-signing-key.pem` ở bước 1 |
| `IOS_CERTIFICATE_BASE64` | Base64 của certificate `.cer` từ Apple |
| `IOS_PROFILE_BASE64` | Base64 của profile `.mobileprovision` |
| `APPLE_TEAM_ID` | Team ID của Apple Developer |

Giữ secret `IOS_SIGNING_KEY_PASSWORD` đã tạo ở bước 1.

Trên Windows, dùng PowerShell để copy Base64 của **một file** vào clipboard, rồi dán thẳng vào GitHub Secret tương ứng. Thay đường dẫn bằng file thật:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\duong-dan\ios-signing-key.pem')) | Set-Clipboard
```

Lặp lại cho file `.cer` và `.mobileprovision`. Không dán Base64 này vào chat hoặc file README. Certificate phải ở định dạng DER `.cer` Apple cung cấp, private key ở dạng PEM mã hóa từ workflow chuẩn bị.

## 4. Tạo API key để upload TestFlight

App Store Connect → **Users and Access → Integrations → App Store Connect API**. Tạo team API key với quyền được phép upload app, ví dụ App Manager. Có thể cần Account Holder/Admin cấp quyền API trước.

Thêm vào GitHub Secrets:

| Secret | Giá trị |
| --- | --- |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_ID` | Key ID |
| `ASC_PRIVATE_KEY` | Toàn bộ nội dung PEM của file `.p8`, gồm BEGIN/END và xuống dòng; không Base64 |

File `.p8` thường chỉ tải được một lần; lưu riêng tư. Không phải token Turso và không phải Apple ID password. Chỉ cần ba secret này nếu muốn workflow upload lên TestFlight.

## 5. Build và cài trên iPhone

Vào **Actions → Build signed iPhone app → Run workflow → main**:

- Chưa chọn upload: tạo artifact `lichhoc-iphone-appstore` để kiểm tra xuất IPA. IPA loại App Store không cài trực tiếp bằng cách bấm file trên iPhone.
- Chọn **Upload the signed app…**: build, ký rồi upload lên App Store Connect. Không tự phát hành công khai trên App Store hoặc tự mời người khác.

Sau khi Apple xử lý xong, vào App Store Connect → app → **TestFlight**. Hoàn thành thông tin beta/export compliance mà Apple yêu cầu, chọn build và cấu hình nhóm thử nghiệm. Thử nghiệm ngoài nhóm nội bộ có thể cần Beta App Review. Cài ứng dụng **TestFlight** của Apple trên iPhone, nhận lời mời/link hợp lệ rồi cài Lịch Học từ đó.

Build number lấy từ số lần chạy workflow. Nếu build đã upload thành công, chạy workflow mới cho lần tiếp theo thay vì upload lại cùng build number. Không thu hồi certificate sau mỗi lần chạy: workflow chỉ xóa bản sao tạm trên runner.

## 6. Kiểm tra tính năng thực tế

Đăng nhập Lịch Học → Đồng bộ → chọn FPT/UTH → mở cổng trường → tự đăng nhập → mở lịch → Đọc lịch → xem trước → Lưu vào tài khoản. Mở web bằng cùng tài khoản để kiểm tra lịch đã lưu.

Đăng nhập trường trong WebView vẫn cần kiểm chứng. Nếu FAP bắt buộc Google OAuth và Google chặn trình duyệt nhúng, ký/TestFlight không tự giải quyết được hạn chế đó. Cần API hoặc luồng được trường hỗ trợ; app không giả đăng nhập hoặc tự vượt chặn. Không quảng bá đã đồng bộ thành công trước khi thử tài khoản thật trên cả Android/iPhone.

Tài liệu nền tảng: [Ký app trên GitHub Actions](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications), [Apple: upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds), [Apple upload action](https://github.com/Apple-Actions/upload-testflight-build).

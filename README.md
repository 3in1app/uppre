# Kick Gold — bản nâng cấp bảo mật

Bản này giữ giao diện khách hàng, khung tiện ích, tài khoản khách, bảng quản trị và cấp/thu hồi key thủ công; đồng thời thay xác thực Admin kiểu HTTP Basic bằng phiên quản trị cookie do máy chủ phát hành.

## Bảo mật quan trọng nhất

- `KICK_GOLD_API_KEY` chỉ được đọc từ biến môi trường trên máy chủ. Không đặt khóa API trong `public/index.html`, `public/admin.html`, HTML, JavaScript phía trình duyệt, URL hoặc dữ liệu trả về cho khách.
- API kích hoạt chỉ gọi từ `server.js`. Khách không được gửi header API key của nhà cung cấp.
- Admin đăng nhập qua `POST /api/admin/login`. Máy chủ tạo token ngẫu nhiên, chỉ giữ hash token trong bộ nhớ, đặt cookie `HttpOnly; SameSite=Strict` và `Secure` khi production/HTTPS. Phiên hết hạn sau 2 giờ hoặc khi khởi động lại máy chủ.
- Mọi API quản trị tiếp tục kiểm tra phiên ở phía máy chủ. Không thể bảo vệ dữ liệu chỉ bằng cách ẩn nút trên giao diện.
- Đăng nhập Admin giới hạn 5 lần/15 phút. Có kiểm tra `Origin` cho yêu cầu thay đổi dữ liệu, `helmet`, giới hạn JSON 1 MB, tắt header `X-Powered-By`, và header chống cache cho phản hồi.
- Lỗi từ API bên ngoài được chuyển thành thông báo an toàn; không trả nguyên văn lỗi upstream có thể chứa thông tin nội bộ. Dữ liệu trả về cho khách chỉ ở endpoint yêu cầu đăng nhập và đã qua key hợp lệ.
- Hoạt động thay đổi dữ liệu quản trị được ghi vào `data/admin-audit.log`; không ghi mật khẩu, API key hay nội dung request body. Admin có thể xem các sự kiện gần nhất tại mục **Nhật ký Admin**; endpoint này yêu cầu phiên quản trị hợp lệ.
- `.env`, dữ liệu JSON, log và ảnh tải lên đã được đưa vào `.gitignore`.

> Không có website nào được bảo đảm “không thể bị hack”. Bản này giảm các đường lộ thông tin phổ biến, nhưng triển khai công khai vẫn cần HTTPS, biến môi trường an toàn, sao lưu, cập nhật phụ thuộc và giám sát. Không bao giờ gửi file `.env` hoặc API key cho khách.

## Chạy thử trên Windows

1. Cài Node.js 18 trở lên.
2. Giải nén ZIP vào thư mục ngắn, ví dụ `C:\\web\\kick-gold`.
3. Mở CMD tại thư mục đó.
4. Chạy:
   ```cmd
   npm install
   copy .env.example .env
   notepad .env
   ```
5. Trong `.env`, điền API key thật do nhà cung cấp cấp và đặt `ADMIN_USER`/`ADMIN_PASSWORD` riêng. Mật khẩu admin nên dài tối thiểu 24 ký tự ngẫu nhiên. Không dùng nguyên giá trị mẫu.
6. Chạy:
   ```cmd
   npm start
   ```
7. Mở `http://localhost:3000`. Vào nút Quản trị Admin, đăng nhập bằng thông tin trong `.env`.

Trên máy local dùng `NODE_ENV=development` và `TRUST_PROXY=0`. Không mở cổng máy chủ trực tiếp ra Internet khi chưa có HTTPS.

## Triển khai công khai

- Dùng hosting Node.js có HTTPS và persistent disk; chỉ chạy **một instance** với bản JSON hiện tại. Đăng nhập Admin từ máy tính/điện thoại khác sẽ xem cùng dữ liệu khi tất cả cùng truy cập đúng website đã triển khai và hosting giữ nguyên thư mục `data/`; chạy bản ZIP trên các máy riêng lẻ sẽ tạo dữ liệu riêng, không tự đồng bộ.
- Thiết lập các biến môi trường trực tiếp trong phần Environment/Secrets của hosting: `NODE_ENV=production`, `KICK_GOLD_API_KEY`, `ADMIN_USER`, `ADMIN_PASSWORD`, `PORT` (nếu nền tảng yêu cầu), `TRUST_PROXY=1` khi hosting kết thúc TLS tại reverse proxy đáng tin cậy.
- Production sẽ từ chối khởi động nếu thiếu API key, tên admin hoặc mật khẩu đủ mạnh, hay chưa cấu hình `TRUST_PROXY=1`.
- Không đặt bí mật vào biến `VITE_*`, `NEXT_PUBLIC_*`, HTML hoặc bất kỳ biến nào được đóng gói vào trình duyệt.
- Giới hạn quyền truy cập vào dashboard hosting, secrets, logs và bản sao lưu. Bật MFA cho tài khoản hosting/domain nếu có.
- Chỉ dùng một instance: dữ liệu hiện lưu JSON trên ổ đĩa và phiên Admin lưu trong RAM. Không dùng autoscaling/multi-instance; khi triển khai lớn hơn phải chuyển dữ liệu sang PostgreSQL và phiên quản trị sang store dùng chung trước.
- Bật backup mã hóa, kiểm tra khả năng khôi phục, theo dõi lỗi/chi phí và cập nhật npm dependencies định kỳ.

## 5 phần triển khai

1. **Bảo mật:** phiên Admin phía máy chủ, cookie HttpOnly/SameSite/Secure, rate limit, kiểm tra Origin, Helmet, không trả lỗi upstream thô, `.gitignore` cho bí mật/dữ liệu.
2. **Dữ liệu:** giữ tương thích dữ liệu JSON hiện tại để không làm mất khách/key khi nâng cấp; dùng persistent disk và backup. Chuyển PostgreSQL là bước bắt buộc trước khi chạy nhiều instance hoặc quy mô lớn, chưa tự động chuyển dữ liệu trong ZIP này.
3. **Quản trị:** dashboard thống kê, quản lý tài khoản, cấp/thu hồi key truy cập, nút gọi API thu hồi Gold thật, lịch sử dịch vụ và trang nhật ký Admin có thể lọc 50/100/200 sự kiện gần nhất. API nhật ký chỉ trả metadata, không trả mật khẩu, API key hoặc key thô.
4. **Khách hàng:** đăng ký/đăng nhập, kiểm tra phiên ở server và trang quản lý tài khoản.
5. **Key thủ công:** Admin tạo key, key gốc chỉ hiện một lần, server lưu hash SHA-256, kiểm tra key ở cả bước xác minh và kích hoạt, thu hồi key có hiệu lực ở server.

## Key thủ công

- Đăng nhập Admin → **Quản lý key Kick Gold** → tạo key → sao chép gửi riêng cho khách.
- Key không ràng buộc IP; admin có thể thu hồi bất kỳ lúc nào.
- Máy chủ chỉ lưu hash của key. Không gửi key vào log hoặc kho mã nguồn.

## Dữ liệu và giới hạn

- Tài khoản khách lưu trong `data/customer-accounts.json`; phiên khách trong `data/customer-sessions.json`; key trong `data/kick-access-keys.json`; lịch sử dịch vụ trong `data/kick-customers.json`.
- Các file này không được phục vụ từ thư mục `public/`, và được loại khỏi Git.
- JSON file là phương án đơn-instance, không phù hợp ghi đồng thời quy mô lớn. PostgreSQL, object storage cho ảnh và session store dùng chung là yêu cầu trước khi mở rộng.
- **Thu hồi Gold thật:** trang Admin có nút “Thu hồi Gold thật”, gọi `POST https://locket.jayteam.click/api/v1/users/status` với `{"username":"...","status":"DISABLED"}` và header `X-API-KEY` từ `KICK_GOLD_API_KEY`. Website chỉ ghi nhận đã thu hồi khi upstream trả HTTP thành công và JSON `success: true`; thao tác “Ngừng theo dõi”, “Xóa bản ghi” và “Thu hồi key truy cập website” vẫn là các thao tác khác nhau.
- Endpoint thu hồi ở trên được tích hợp theo tài liệu API partner được cung cấp, nhưng chưa thể xác minh từ gói mã nguồn rằng máy chủ nhà cung cấp đã triển khai endpoint này hoặc key cụ thể được cấp quyền. Hãy thử với một tài khoản thử nghiệm bạn được phép quản lý; nếu API trả lỗi hoặc IP chưa được duyệt, website sẽ hiển thị thất bại và không đánh dấu Gold là đã thu hồi. Không nhập mật khẩu Locket của khách vào website.

## Kiểm tra trước khi mở website

- [ ] HTTPS hoạt động và chuyển hướng HTTP sang HTTPS ở reverse proxy.
- [ ] API key chỉ tồn tại trong Environment/Secrets của máy chủ.
- [ ] Mật khẩu admin độc nhất, dài tối thiểu 24 ký tự; bật MFA cho hosting/domain.
- [ ] `NODE_ENV=production`, `TRUST_PROXY=1` nếu chạy sau proxy HTTPS.
- [ ] Thử đăng nhập admin sai 6 lần để kiểm tra rate limit.
- [ ] Thử mở `/api/admin/dashboard` và `/api/admin/audit` khi chưa đăng nhập; phải nhận `401`.
- [ ] Đăng nhập Admin, thực hiện thao tác thử rồi xác nhận mục **Nhật ký Admin** chỉ hiển thị metadata và không lộ key thô.
- [ ] Kiểm tra DevTools → Network/Source: không có API key trong HTML/JS hoặc response công khai.
- [ ] Backup và thử khôi phục dữ liệu.
- [ ] Không bật nhiều instance với JSON storage.


## Giai đoạn 5 — Vòng đời key truy cập

Trang Admin cho phép đặt ngày giờ hết hạn cụ thể, chỉnh sửa nhãn, hạn mức lượt dùng và thời điểm hết hạn của key hiện có. Để trống ngày giờ nghĩa là không hết hạn; `0` ở hạn mức nghĩa là không giới hạn. Key hết hạn hoặc hết lượt sẽ tự động bị từ chối. Key thô chỉ hiển thị một lần lúc tạo; hệ thống lưu hash nên không thể xem lại hoặc sửa chuỗi key gốc — nếu cần chuỗi key khác, hãy tạo key mới và thu hồi key cũ.

## Giai đoạn 4 — Trải nghiệm khách hàng

Giai đoạn 4 bổ sung cổng khách hàng và các tiện ích tự phục vụ:

- **Tổng quan tài khoản:** số bản ghi dịch vụ, số dịch vụ đang hoạt động, tổng lượt kích hoạt ghi nhận và lịch sử dịch vụ theo tên tài khoản đang đăng nhập.
- **Bảo mật tài khoản:** đổi mật khẩu bằng cách xác minh mật khẩu hiện tại; mật khẩu mới được băm bằng scrypt với salt ngẫu nhiên. Khi đổi mật khẩu, các phiên khác bị thu hồi và phiên hiện tại được giữ lại.
- **Quản lý phiên:** xem thời điểm tạo/hết hạn và nhận biết phiên hiện tại; có thể đăng xuất tất cả phiên khác.
- **Giao diện di động:** bố cục tổng quan, bảng dịch vụ và công cụ Studio tự co giãn theo màn hình.
- **Trạng thái có giới hạn:** trang tổng quan phản ánh bản ghi máy chủ, không khẳng định trạng thái Gold trực tiếp từ nhà cung cấp. Studio chỉ mở bảng chia sẻ của thiết bị; website không thể tự xác nhận bài đã đăng.

### Giới hạn cần biết

- Khôi phục mật khẩu qua email và xác minh email **chưa được bật**: dự án chưa có cấu hình SMTP/dịch vụ email hoặc quy trình xác minh. Không nên giả lập chức năng gửi email khi chưa có nhà cung cấp thật.
- Bản nháp/yêu thích lưu trong `localStorage` của trình duyệt hiện tại; không đồng bộ giữa thiết bị và có thể mất nếu xoá dữ liệu trình duyệt.
- Dữ liệu tài khoản/dịch vụ hiện vẫn dùng tệp JSON. PostgreSQL chưa được triển khai trong gói này.

### Kiểm tra nhanh sau khi cập nhật

1. Chạy `npm install`, cấu hình `.env`, rồi `npm start`.
2. Đăng ký/đăng nhập một tài khoản khách hàng.
3. Kiểm tra khu vực tổng quan và danh sách dịch vụ; tài khoản mới chưa có lịch sử là trạng thái bình thường.
4. Đổi mật khẩu bằng mật khẩu hiện tại; thử đăng nhập lại ở cửa sổ riêng để kiểm tra phiên cũ đã bị thu hồi.
5. Lưu một bản nháp caption, tải lại trang và kiểm tra bản nháp vẫn còn trên cùng trình duyệt.
6. Mở website ở chiều rộng di động và kiểm tra bố cục.

Các bước trên là checklist triển khai thủ công; cần chạy trên máy chủ có dependencies và cấu hình thật để kiểm tra tích hợp đầy đủ.

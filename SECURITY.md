# Security policy / kiểm tra bảo mật

## Bí mật
- API secret chỉ ở server environment.
- Không commit `.env`, dữ liệu `data/*.json`, `data/*.log` hay uploads.
- Nếu API key từng được đưa vào HTML, ảnh chụp, Git hoặc gửi nhầm cho khách: thu hồi/rotate ngay với nhà cung cấp.

## Admin
- Xác thực bằng cookie HttpOnly, token ngẫu nhiên 256-bit, hash token phía server, SameSite=Strict, Secure trong production.
- Phiên quản trị tối đa 120 phút và bị xóa khi tiến trình khởi động lại.
- Login giới hạn 5 lần trong 15 phút; thao tác admin kiểm tra Origin khi trình duyệt gửi header này.
- Không bật production nếu thiếu biến môi trường bắt buộc hoặc mật khẩu admin quá yếu.

## Triển khai
- Chỉ phục vụ qua HTTPS.
- Bảo vệ tài khoản hosting, DNS và Git bằng MFA.
- Dùng persistent disk, backup mã hóa, một instance duy nhất cho bản JSON.
- Trước khi scale: chuyển dữ liệu sang PostgreSQL, dùng session store chia sẻ, migrate và kiểm tra restore.
- Thường xuyên chạy `npm audit` và cập nhật phụ thuộc đã kiểm tra tương thích.

## Báo cáo
Không gửi API key, mật khẩu, cookie phiên hay dữ liệu khách trong báo cáo lỗi. Thu hồi ngay mọi bí mật bị lộ.

## Kiểm tra thủ công sau khi deploy
- Mở `/api/admin/dashboard` ở cửa sổ riêng tư khi chưa đăng nhập: phải nhận `401` và không có dữ liệu dashboard.
- Thử gọi POST admin từ origin khác: phải nhận `403`.
- Tìm chuỗi API key thật trong toàn bộ `public/`: không được có kết quả.
- Kiểm tra Network/Response khi khách kích hoạt: chỉ được có thông tin khách hàng cần hiển thị, không có `X-API-KEY`, header upstream hay biến môi trường.
- Kiểm tra backup không công khai; không đặt thư mục `data/`, `.env`, log hoặc backup bên trong `public/`.

# Giai đoạn 4 — Trải nghiệm khách hàng

## Đã bổ sung
- API tổng quan dịch vụ giới hạn theo tài khoản hiện đăng nhập.
- API liệt kê phiên đăng nhập đang hoạt động, thu hồi phiên khác và đổi mật khẩu.
- Khu vực khách hàng với chỉ số dịch vụ, lịch sử trạng thái, đổi mật khẩu và quản lý phiên.
- Bản nháp/yêu thích Locket Studio lưu caption và tuỳ chọn màu trong localStorage theo tài khoản; không lưu media.
- Bố cục responsive cho màn hình nhỏ.
- Tăng phiên bản dự án lên 1.2.0.

## Kiểm tra đã chạy
- `node --check server.js`
- Trích xuất toàn bộ script inline từ `public/index.html` và chạy `node --check`
- Kiểm tra ZIP sau khi đóng gói (`unzip -t`)

## Chưa xác nhận / chưa triển khai
- Chưa chạy end-to-end với dependencies, API nhà cung cấp hoặc tài khoản thật trong môi trường này.
- Email khôi phục/xác minh chưa triển khai vì chưa có SMTP/dịch vụ email.
- Dữ liệu vẫn lưu JSON, chưa chuyển PostgreSQL.

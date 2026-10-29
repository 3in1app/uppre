# Giai đoạn 3 — Nâng cấp bảng quản trị

## Đã bổ sung

- Mục **Nhật ký Admin** ngay trong dashboard, hỗ trợ tải 50, 100 hoặc 200 sự kiện gần nhất.
- Endpoint `GET /api/admin/audit` được bảo vệ bởi middleware phiên quản trị hiện có. Không đăng nhập sẽ không đọc được nhật ký.
- API nhật ký chỉ trả các trường metadata đã giới hạn độ dài: thời gian, tên admin, phương thức HTTP, đường dẫn API và trạng thái ghi nhận. Không trả nội dung request body, mật khẩu, API key, session token hay key truy cập thô.
- Giao diện dùng `textContent` để hiển thị dữ liệu nhật ký, tránh đưa dữ liệu log trực tiếp vào HTML.
- Dashboard hiện vẫn bao gồm thống kê, tài khoản khách, cấp/thu hồi key, cấu hình khung tiện ích và lịch sử dịch vụ.

## Kiểm tra thực hiện

- `node --check server.js`
- JavaScript nội tuyến trong `public/admin.html` được trích xuất và kiểm tra cú pháp bằng `node --check`.
- Kiểm tra ZIP và rà soát dấu hiệu bí mật bị nhúng trong file public.

## Giới hạn

Đây là nhật ký các yêu cầu thay đổi dữ liệu được middleware quản trị ghi nhận, không phải hệ thống SIEM/audit bất biến. JSON storage và log trên đĩa phù hợp thử nghiệm hoặc một instance; trước khi mở rộng nên chuyển sang PostgreSQL, lưu log tập trung và bổ sung MFA cho Admin. Cần kiểm thử lại trên môi trường hosting thật trước khi mở công khai.

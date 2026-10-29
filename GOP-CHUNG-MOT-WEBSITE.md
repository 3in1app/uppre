# Gộp khu vực khách hàng và Admin trong một website

- Chạy website bằng `npm install` rồi `npm start`.
- Mở một địa chỉ duy nhất: `http://localhost:3000/`.
- Thanh công cụ trên cùng có `Khu vực khách hàng` và `Quản trị Admin`.
- Chọn `Quản trị Admin` sẽ mở bảng quản trị ngay trong trang chính.
- Admin phải nhập cả tên tài khoản và mật khẩu được cấu hình trong `.env` (`ADMIN_USER` và `ADMIN_PASSWORD`). Không dùng các giá trị mẫu trong `.env.example` làm thông tin đăng nhập thật.
- Cần cấu hình `ADMIN_PASSWORD` dài, ngẫu nhiên và giữ riêng tư trước khi chạy trên môi trường thật.

Lưu ý: `/admin.html` vẫn là trang giao diện được nhúng bên trong trang chính; các thao tác quản trị phải qua API có xác thực Admin ở máy chủ. Không đưa file `.env` hoặc mật khẩu thật vào ZIP hay chia sẻ công khai.

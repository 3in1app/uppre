# Giai đoạn 5 — Vòng đời key truy cập

## Đã bổ sung
- Admin có thể tạo key với số ngày hết hạn (0 = không hết hạn; giới hạn 3650 ngày).
- Admin có thể đặt hạn mức lượt gọi kích hoạt (0 = không giới hạn; giới hạn 1.000.000 lượt).
- Máy chủ từ chối key đã bị thu hồi, hết hạn hoặc đã chạm giới hạn lượt dùng.
- Bảng quản trị hiển thị ngày hết hạn, số lượt đã dùng/tổng lượt, và trạng thái hoạt động/thu hồi/hết hạn/hết lượt.
- Bảng thống kê Admin tính key còn hiệu lực theo trạng thái thời gian và hạn mức, không chỉ dựa vào cờ đã lưu.
- Key thô vẫn chỉ hiển thị một lần khi tạo; máy chủ chỉ lưu hash SHA-256. Key không bị ràng buộc theo IP.
- Đã tăng phiên bản dự án lên 1.3.0.

## Quy tắc sử dụng
- `Hết hạn sau = 0`: key không có thời hạn; giá trị từ 1 đến 3650 tính theo ngày 24 giờ kể từ lúc tạo.
- `Giới hạn lượt dùng = 0`: không giới hạn; giá trị dương chặn các lần kích hoạt sau khi đạt mức tối đa.
- Lượt dùng được ghi nhận khi yêu cầu kích hoạt vượt qua kiểm tra đầu vào và cấu hình API máy chủ; lỗi từ nhà cung cấp vẫn có thể được tính là một lần gửi yêu cầu.
- Thu hồi là thao tác một chiều trong giao diện hiện tại; để cấp lại quyền, tạo key mới.

## Kiểm tra
- Kiểm tra cú pháp `server.js` bằng `node --check`.
- Kiểm tra cú pháp JavaScript inline trong `public/admin.html` và `public/index.html`.
- Kiểm tra JSON `package.json`, cấu trúc ZIP và xác nhận không đóng gói `.env`/`node_modules`.
- Chưa kiểm thử end-to-end với API nhà cung cấp thật; cần cấu hình biến môi trường hợp lệ khi triển khai.

## Bản vá 1.3.1 – Luồng đăng ký tài khoản
- Sửa sự kiện yêu cầu đăng nhập: phản hồi 401 từ API khi khách chưa đăng nhập không còn tự chuyển tab đăng ký về tab đăng nhập. Chỉ chuyển về đăng nhập khi phiên người dùng đã đăng nhập thực sự bị hết hạn.


## Bản vá giao diện 1.3.2
- Đã gỡ canvas và mã JavaScript hiệu ứng mưa rơi.
- Xóa nút bật/tắt mưa; giữ nguyên trình phát nhạc, chọn bài, phát/dừng và âm lượng.
- Đổi nhãn giao diện từ Rainy Night sang trình phát nhạc.

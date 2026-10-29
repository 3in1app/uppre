# Nhạc nền do Admin quản lý

- Ẩn giao diện trình phát nhạc phía khách.
- Khi tải trang, website lấy video ID từ `/api/music-config` và nhúng YouTube với autoplay, controls ẩn và loop.
- Thêm mục Nhạc nền trong `/admin.html`; API thay đổi cấu hình yêu cầu phiên Admin hợp lệ.
- Video mặc định: `AwsLOWxaZfk`.
- Giới hạn nền tảng: Chrome/Edge thường chặn autoplay có âm thanh nếu người dùng chưa tương tác; website không thể vượt qua chính sách này.
- Chỉ chấp nhận URL YouTube/youtu.be/embed hợp lệ; không nhận HTML hoặc iframe do người dùng cung cấp.

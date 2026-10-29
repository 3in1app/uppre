# 📚 TÀI LIỆU HƯỚNG DẪN TÍCH HỢP PARTNER API (ĐỐI TÁC LOCKET GOLD)

> **Dành cho**: Đối tác, Đại lý, Website bán hàng tự động, Bot Telegram / Discord  
> **Phiên bản API**: `v1.2` (Bổ sung tính năng Bật / Tắt và Xóa người dùng)  
> **Base URL**: `https://locket.jayteam.click`  
> **Định dạng dữ liệu**: `JSON` (UTF-8)

---

## 🔐 1. Cơ Chế Xác Thực & Bảo Mật (Authentication)

Mọi yêu cầu gửi đến API đều cần truyền **API Key** được cấp bởi Quản trị viên theo một trong hai cách sau:

### Cách 1: Header `X-API-KEY` (Khuyên dùng)
```http
X-API-KEY: kg_sec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Cách 2: Header `Authorization Bearer`
```http
Authorization: Bearer kg_sec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 🛡️ Chính Sách Bảo Mật Server IP Binding:
- **Tự động liên kết Server IP**: Lần gọi API đầu tiên từ máy chủ hoặc IP hosting của bạn sẽ được hệ thống tự động ghi nhận và liên kết độc quyền với API Key đó.
- **Nếu đổi máy chủ**: Vui lòng liên hệ Admin để reset hoặc thêm IP máy chủ mới vào Whitelist.
- **Cách ly dữ liệu tuyệt đối (Data Isolation)**: Bạn **chỉ có quyền** quản lý (xem, tắt, bật, xóa) những người dùng do chính API Key của bạn kích hoạt. Tuyệt đối không thể can thiệp vào khách hàng của bên khác.

---

## 📋 2. Bảng Tổng Hợp Endpoints

| Chức Năng | Phương Thức | Endpoint | Mục Đích |
|---|---|---|---|
| **Kích hoạt Gold** | `POST` | `/api/v1/kick-gold` | Cấp Locket Gold VIP 60s cho khách hàng |
| **Thông tin Key** | `GET` | `/api/v1/key-info` | Kiểm tra hạn mức, số lượt còn lại & thống kê |
| **Danh sách khách** | `GET` / `POST` | `/api/v1/users` | Xem danh sách người đã được cấp Gold |
| **Bật / Tắt Gold** | `POST` | `/api/v1/users/status` | Tạm dừng (tắt) hoặc kích hoạt lại (bật) Gold |
| **Xóa vĩnh viễn** | `POST` / `DELETE` | `/api/v1/users/delete` | Xóa hoàn toàn khách khỏi hệ thống |

---

## ⚡ 3. Chi Tiết Từng API Endpoint

### 3.1. Kích hoạt Locket Gold VIP (`POST /api/v1/kick-gold`)

Cấp quyền Locket Gold VIP trọn đời cho khách hàng (quay 60s max, mở full 38 khung viền, kèm chứng chỉ DNS).

- **URL**: `https://locket.jayteam.click/api/v1/kick-gold`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `X-API-KEY: kg_sec_...`
- **Request Body**:
```json
{
  "locket_username": "hoanganh"
}
```
> *Lưu ý*: Có thể truyền `hoanganh`, `@hoanganh` hoặc link mời `https://locket.cam/hoanganh`.

- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Kích hoạt Locket Gold thành công!",
  "data": {
    "username": "hoanganh",
    "uid": "AB12CD34EF56GH78IJ90KL",
    "package": "Locket Gold VIP Trọn Đời",
    "expires_at": "2099-12-31 23:59:59",
    "download_url": "https://locket.jayteam.click/download.php?token=jt_xxxxxx&server=1",
    "customer_message": "🎉 KÍCH HOẠT COMBO 3-IN-1: LOCKET GOLD, SPOTIFY & YOUTUBE THÀNH CÔNG!\n👤 Khách hàng: @hoanganh\n..."
  }
}
```

---

### 3.2. Tra Cứu Thông Tin API Key & Hạn Mức (`GET /api/v1/key-info`)

Kiểm tra trạng thái key, tổng lượt cấp, số lượt còn lại, và thống kê số khách đang hoạt động hoặc tạm dừng.

- **URL**: `https://locket.jayteam.click/api/v1/key-info` (hoặc `/api/v1/me`)
- **Method**: `GET`
- **Headers**: `X-API-KEY: kg_sec_...`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Lấy thông tin API Key thành công!",
  "data": {
    "partner_name": "Đại Lý VIP Hà Nội",
    "api_key": "kg_sec_9a...4c3d",
    "status": "ACTIVE",
    "allocated_credits": 500,
    "used_credits": 42,
    "remaining_credits": 458,
    "is_unlimited": false,
    "total_granted_users": 42,
    "active_users": 40,
    "disabled_users": 2,
    "bound_server_ip": "103.77.x.x",
    "allowed_ips": ["103.77.x.x"],
    "last_used_at": "2026-10-29 01:10:00",
    "created_at": "2026-10-20 14:00:00"
  }
}
```

---

### 3.3. Xem Danh Sách Người Đã Cấp Gold (`GET /api/v1/users`)

Lấy danh sách các tài khoản khách hàng mà bạn đã kích hoạt, có hỗ trợ phân trang, tìm kiếm và lọc trạng thái.

- **URL**: `https://locket.jayteam.click/api/v1/users`
- **Method**: `GET`
- **Headers**: `X-API-KEY: kg_sec_...`
- **Query Parameters**:
  - `page`: Trang hiện tại (mặc định: `1`).
  - `limit`: Số người trên 1 trang (mặc định: `20`, tối đa: `100`).
  - `search`: Từ khóa tìm kiếm theo username hoặc UID (tùy chọn).
  - `status`: Lọc theo trạng thái `ACTIVE` (đang bật), `DISABLED` (đang tắt) hoặc `ALL` (tất cả).
- **Ví dụ gọi**:
  `GET /api/v1/users?page=1&limit=20&status=ACTIVE&search=nam`

- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Lấy danh sách người dùng thành công!",
  "data": {
    "users": [
      {
        "id": 1024,
        "username": "namnguyen",
        "display_name": "@namnguyen",
        "avatar_url": "https://locket.jayteam.click/avatars/namnguyen.svg",
        "uid": "usr_998877665544",
        "status": "ACTIVE",
        "package_name": "Locket Gold VIP Trọn Đời",
        "video_length": "60s (Max VIP)",
        "expires_at": "2099-12-31 23:59:59",
        "created_at": "2026-10-28 15:20:00",
        "download_url": "https://locket.jayteam.click/download.php?token=jt_xxxxxx&server=1"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 20,
      "total_pages": 3
    }
  }
}
```

---

### 3.4. Tắt / Bật Lại Trạng Thái Gold (`POST /api/v1/users/status`)

Cho phép bạn **tắt quyền Gold** của khách hàng (khi khách hết hạn thuê, nợ cước, huỷ đơn) hoặc **bật lại** khi khách gia hạn.

- **URL**: `https://locket.jayteam.click/api/v1/users/status`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `X-API-KEY: kg_sec_...`

#### Trường hợp 1: Tắt Gold (Vô hiệu hóa)
```json
{
  "username": "hoanganh",
  "status": "DISABLED"
}
```
*(Hệ thống chấp nhận `status: "DISABLED"` hoặc `action: "disable"` / `action: "off"`)*

- **Response**:
```json
{
  "success": true,
  "message": "Đã tắt (vô hiệu hóa) Locket Gold cho người dùng @hoanganh thành công!",
  "data": {
    "username": "hoanganh",
    "uid": "AB12CD34EF56GH78IJ90KL",
    "status": "DISABLED",
    "updated_at": "2026-10-29 01:15:00"
  }
}
```
> **Hiệu quả ngay lập tức**: Máy chủ lập tức vô hiệu hoá cache, app Locket của khách sẽ bị hạ về tài khoản Free thông thường (video 3s, mất huy hiệu Gold).

#### Trường hợp 2: Bật lại Gold (Tái kích hoạt)
```json
{
  "username": "hoanganh",
  "status": "ACTIVE"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Đã bật lại (kích hoạt) Locket Gold cho người dùng @hoanganh thành công!",
  "data": {
    "username": "hoanganh",
    "uid": "AB12CD34EF56GH78IJ90KL",
    "status": "ACTIVE",
    "updated_at": "2026-10-29 01:16:00"
  }
}
```

---

### 3.5. Xóa Vĩnh Viễn Người Dùng (`POST /api/v1/users/delete`)

Xóa hoàn toàn người dùng khỏi cơ sở dữ liệu và dọn sạch mọi cache trên hệ thống.

- **URL**: `https://locket.jayteam.click/api/v1/users/delete` *(hoặc `DELETE /api/v1/users`)*
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `X-API-KEY: kg_sec_...`
- **Request Body**:
```json
{
  "username": "hoanganh"
}
```

- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Đã xóa vĩnh viễn người dùng @hoanganh khỏi hệ thống Locket Gold!",
  "data": {
    "username": "hoanganh",
    "uid": "AB12CD34EF56GH78IJ90KL",
    "deleted": true,
    "deleted_at": "2026-10-29 01:18:00"
  }
}
```

---

## 💻 4. Code Mẫu Tích Hợp (Code Snippets)

### 4.1. cURL (Terminal / Command Line)

#### Kích hoạt Gold:
```bash
curl -X POST "https://locket.jayteam.click/api/v1/kick-gold" \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"locket_username": "hoanganh"}'
```

#### Tắt Gold của khách:
```bash
curl -X POST "https://locket.jayteam.click/api/v1/users/status" \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username": "hoanganh", "status": "DISABLED"}'
```

#### Xóa khách hàng:
```bash
curl -X POST "https://locket.jayteam.click/api/v1/users/delete" \
  -H "X-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"username": "hoanganh"}'
```

---

### 4.2. Python (`requests`)

```python
import requests

API_URL = "https://locket.jayteam.click/api/v1"
API_KEY = "kg_sec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

headers = {
    "X-API-KEY": API_KEY,
    "Content-Type": "application/json"
}

# 1. Kích hoạt Locket Gold
def kick_gold(username):
    res = requests.post(f"{API_URL}/kick-gold", headers=headers, json={"locket_username": username})
    return res.json()

# 2. Xem danh sách người đã cấp
def get_users(page=1, limit=20, status="ALL"):
    res = requests.get(f"{API_URL}/users", headers=headers, params={"page": page, "limit": limit, "status": status})
    return res.json()

# 3. Tắt Gold (DISABLED) hoặc Bật Gold (ACTIVE)
def set_user_status(username, status="DISABLED"):
    res = requests.post(f"{API_URL}/users/status", headers=headers, json={"username": username, "status": status})
    return res.json()

# 4. Xóa vĩnh viễn người dùng
def delete_user(username):
    res = requests.post(f"{API_URL}/users/delete", headers=headers, json={"username": username})
    return res.json()

# Ví dụ chạy:
if __name__ == "__main__":
    print("Kích hoạt:", kick_gold("hoanganh"))
    print("Tắt Gold:", set_user_status("hoanganh", "DISABLED"))
    print("Xóa khách:", delete_user("hoanganh"))
```

---

### 4.3. Node.js / JavaScript (`fetch`)

```javascript
const API_URL = 'https://locket.jayteam.click/api/v1';
const API_KEY = 'kg_sec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

const headers = {
  'X-API-KEY': API_KEY,
  'Content-Type': 'application/json'
};

// 1. Kích hoạt Gold
async function kickGold(username) {
  const res = await fetch(`${API_URL}/kick-gold`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ locket_username: username })
  });
  return res.json();
}

// 2. Lấy danh sách khách
async function getUsers(page = 1, limit = 20) {
  const res = await fetch(`${API_URL}/users?page=${page}&limit=${limit}`, {
    headers
  });
  return res.json();
}

// 3. Tắt / Bật Gold
async function setUserStatus(username, status = 'DISABLED') {
  const res = await fetch(`${API_URL}/users/status`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username, status })
  });
  return res.json();
}

// 4. Xóa vĩnh viễn khách
async function deleteUser(username) {
  const res = await fetch(`${API_URL}/users/delete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username })
  });
  return res.json();
}
```

---

### 4.4. PHP (`cURL`)

```php
<?php
$apiUrl = 'https://locket.jayteam.click/api/v1';
$apiKey = 'kg_sec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

function callPartnerApi($endpoint, $method = 'GET', $data = []) {
    global $apiUrl, $apiKey;
    $ch = curl_init();
    $url = $apiUrl . $endpoint;
    
    $headers = [
        'X-API-KEY: ' . $apiKey,
        'Content-Type: application/json'
    ];
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    } elseif ($method === 'GET' && !empty($data)) {
        $url .= '?' . http_build_query($data);
    }
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// 1. Kích hoạt
$kick = callPartnerApi('/kick-gold', 'POST', ['locket_username' => 'hoanganh']);
print_r($kick);

// 2. Tắt Gold
$disable = callPartnerApi('/users/status', 'POST', ['username' => 'hoanganh', 'status' => 'DISABLED']);
print_r($disable);

// 3. Xóa khách
$delete = callPartnerApi('/users/delete', 'POST', ['username' => 'hoanganh']);
print_r($delete);
```

---

## ⚠️ 5. Bảng Mã Lỗi (Error Codes Reference)

| HTTP Code | Mã Lỗi (`error`) | Nguyên Nhân & Cách Khắc Phục |
|---|---|---|
| `400` | `MISSING_USERNAME` | Thiếu trường `username` hoặc `locket_username`. |
| `401` | `MISSING_API_KEY` | Chưa truyền header `X-API-KEY` hoặc `Authorization: Bearer`. |
| `401` | `INVALID_API_KEY` | API Key sai, không tồn tại trên hệ thống. |
| `403` | `KEY_PAUSED` | API Key đang bị Quản trị viên tạm khóa do vi phạm. |
| `403` | `SERVER_IP_NOT_ALLOWED` | Địa chỉ IP máy chủ của bạn chưa được duyệt vào Whitelist. Liên hệ Admin để duyệt IP. |
| `403` | `IP_BANNED` | Địa chỉ IP bị khóa vĩnh viễn do chia sẻ key bừa bãi. |
| `403` | `OUT_OF_CREDITS` | API Key đã sử dụng hết hạn mức số lượt. Cần nạp thêm lượt. |
| `403` | `FORBIDDEN_DATA_EXTRACTION`| Cố gắng truy cập các đường dẫn ngoài thẩm quyền. |
| `404` | `USER_NOT_FOUND_OR_FORBIDDEN` | Không tìm thấy người dùng, hoặc người dùng này **không phải do API Key của bạn cấp**. |
| `405` | `METHOD_NOT_ALLOWED` | Gọi sai phương thức HTTP (ví dụ gọi GET vào endpoint POST). |

---

## 🎨 6. ĐƯỜNG DẪN SITE CHỈNH CHÚ THÍCH & ĐỔI KHUNG VIỀN CHO KHÁCH HÀNG

Sau khi kích hoạt, ngoài link cài đặt DNS, hệ thống cung cấp sẵn trang Web cá nhân hóa cho từng khách hàng:
- **Đường dẫn Studio Khách Hàng:** `https://locket.jayteam.click/caption.html?u=@username`
- **Các tính năng nổi bật dành riêng cho khách hàng:**
  - 🎨 **Tự do soạn Chú thích VIP**: Chọn màu chữ, nền gradient tùy biến đa sắc, gắn icon Emoji sinh động (Cutie Pie 🌸, Baby Love 💖, Đà Lạt 🌲,...). Khi mở camera Locket trên iPhone, bảng chú thích hiển thị đúng 100% màu sắc và icon đã soạn.
  - 🖼️ **Kho 38+ Khung Viền Widget Locket**: Khách hàng tự do duyệt kho khung viền VIP, thử nghiệm trực quan trên widget iPhone mô phỏng và bấm áp dụng khung viền cho widget của mình ngay trên web.
  - 🚀 **Đăng ảnh khoảnh khắc (Moment)**: Cho phép tải ảnh trực tiếp lên widget bạn bè từ máy tính hoặc điện thoại mà không cần mở app.

---

*Hỗ trợ kỹ thuật 24/7 từ BQT JayTeam. Chúc đối tác kinh doanh phát đạt!*

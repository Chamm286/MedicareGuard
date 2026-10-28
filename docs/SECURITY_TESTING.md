# Kiểm thử tấn công MedicareGuard

Tài liệu này dùng cho demo trước thầy/cô. Chỉ chạy trên môi trường demo local hoặc tunnel demo, không chạy vào production.

## 1. Cách nhanh nhất: chạy một lệnh

Từ thư mục gốc dự án:

```bash
npm run demo:attack
```

Script sẽ tự thực hiện 4 tình huống:

1. SQL injection vào tìm kiếm sản phẩm.
2. Truy cập API quản trị cửa hàng khi chưa đăng nhập.
3. Sửa giá/tổng tiền/trạng thái đơn từ phía client.
4. Thanh toán thẻ giá trị cao với IP Hà Lan nhưng giao hàng Singapore.

Sau đó script in ra:

- HTTP status và kết luận từng tình huống.
- Risk score, trạng thái đơn, alert ID và kết quả dispatch n8n.
- 5 cảnh báo mới trong SOC.
- 5 sự kiện gian lận mới trong Store Admin.
- Link để mở `/alerts`, `/store/admin`, n8n và Telegram.

## 2. Cách kiểm tra bằng giao diện

1. Mở `http://localhost:3000/store`.
2. Thêm một sản phẩm giá trị cao vào giỏ, ví dụ máy đo huyết áp hoặc ghế y tế.
3. Vào `/store/checkout`, chọn thanh toán thẻ.
4. Nhập địa chỉ giao hàng ở quốc gia khác với IP demo.
5. Đặt hàng.

Kết quả mong đợi:

- Đơn chuyển sang `Tạm giữ kiểm tra` (`on_hold`).
- Risk score từ 65 trở lên.
- Có alert mới trong `/alerts`.
- Có sự kiện `checkout_fraud_review` trong `/store/admin`.
- n8n chạy workflow `ecommerce-fraud-response`.
- Telegram gửi cảnh báo qua `@riceguard_alert_bot`.

## 3. Bộ kiểm thử đầy đủ 21/21

```bash
cd backend
npm run test:security
```

Bộ test kiểm tra:

- SQL injection ở tìm kiếm và slug sản phẩm.
- XSS lưu trong đánh giá.
- IDOR khi xem đơn hàng.
- Price tampering và mass assignment.
- Coupon abuse, quantity âm, vượt tồn kho.
- Phân quyền customer/admin.
- Gian lận IP/quốc gia và dispatch n8n.

## 4. Xem cảnh báo ở đâu

| Nơi xem | URL |
| --- | --- |
| SOC alerts | `http://localhost:3000/alerts` |
| Store admin | `http://localhost:3000/store/admin` |
| n8n executions | `http://localhost:5678` |
| Telegram | `@riceguard_alert_bot` |

## 5. Cách hệ thống phát hiện

- Backend ghi nhận IP thật từ `CF-Connecting-IP`, `X-Real-IP`, `X-Forwarded-For`.
- Quốc gia lấy từ `CF-IPCountry` hoặc map IP demo.
- Risk engine cộng điểm theo các dấu hiệu: lệch IP/quốc gia, đơn giá trị cao, thanh toán thẻ, guest checkout, velocity.
- Risk `>= 60`: tạo alert/security event.
- Risk `>= 65`: giữ đơn `on_hold` và gọi webhook n8n `mg-ecommerce-fraud`.
- n8n gửi Telegram/SMTP và cập nhật lại alert/security event.

## 6. Lưu ý

- Đây là thanh toán mô phỏng, không dùng thẻ thật.
- Không chạy script tấn công vào hệ thống thật khi chưa được phép.
- Nếu n8n không chạy, alert vẫn được tạo trong SOC nhưng dispatch có thể báo lỗi.

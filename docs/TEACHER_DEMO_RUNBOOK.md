# Kịch bản demo và bộ test case cho giảng viên

Tài liệu này dùng để chấm bài demo MedicareGuard SOC. Mọi thao tác đều có thể thực hiện trên console tiếng Việt.

## 1. Chuẩn bị

```bash
docker compose up -d postgres
cd backend && npm run seed:reset && npm start
cd ../frontend && npm run dev
```

- Console: http://localhost:3000
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs/
- n8n: http://localhost:5678
- Mailpit: http://localhost:8025

Tài khoản: `admin@medicareguard.io` / `Admin@123`.

## 2. Test case bắt buộc

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Đăng nhập sai mật khẩu | Hiển thị lỗi tiếng Việt, không vào dashboard |
| 2 | Đăng nhập đúng | Vào `/dashboard`, toàn bộ menu và số liệu bằng tiếng Việt |
| 3 | Mở `/portal` | Cổng bệnh nhân Medicare mô phỏng, có danh sách bệnh nhân và nút tấn công |
| 4 | Bấm **Ransomware** trên portal | Tạo cảnh báo mới, tự động chạy workflow `Cô lập & Phục hồi Ransomware`, log tiếng Việt |
| 5 | Bấm **Phishing** | Tạo cảnh báo phishing, chạy workflow `Phân tích & Xử lý Phishing` |
| 6 | Bấm **Credential stuffing** | Tạo cảnh báo credential, chạy workflow leo thang SLA |
| 7 | Mở `/alerts` | Danh sách cảnh báo có mức độ, điểm rủi ro, thời gian, trạng thái tiếng Việt |
| 8 | Mở chi tiết cảnh báo | Có timeline, bình luận, hành động chuyển trạng thái/giao việc |
| 9 | Mở `/automation` | Thấy 5 workflow, tổng 84 node, trạng thái thực thi |
| 10 | Chạy workflow từ UI | Execution chuyển sang thành công, số node và thời lượng hiển thị |
| 11 | Kiểm tra Telegram | Nhận thẻ HTML có tiêu đề, mức độ, điểm rủi ro, liên kết; không có JSON, không có chữ ký n8n |
| 12 | Kiểm tra Mailpit | Email HTML có màu mức độ, bảng thông tin và nút mở console |
| 13 | Mở `/reports` và tải PDF | Báo cáo tiếng Việt, đúng dữ liệu |
| 14 | Mở `/api/docs/` | Swagger UI liệt kê toàn bộ endpoint, đăng nhập Bearer được |
| 15 | Gọi `GET /api/_meta/endpoints` | Trả về 547 endpoint nghiệp vụ |
| 16 | Mở console qua Cloudflare Tunnel | Đăng nhập và tải dữ liệu bình thường, không lỗi CORS |

## 3. Kiểm tra tự động

```bash
cd backend && npm test
cd ../frontend && npx tsc --noEmit && npm run build
```

Kết quả kỳ vọng: smoke suite **61/61**, TypeScript không lỗi, build thành công.

## 4. Điểm cần chứng minh

- Toàn bộ giao diện và dữ liệu seed bằng tiếng Việt.
- Cảnh báo portal tạo ra dữ liệu thật trong PostgreSQL và kích hoạt n8n thật.
- Telegram và Gmail là hai kênh độc lập, có thể tắt từng kênh bằng biến môi trường.
- Swagger được sinh tự động từ router, không phải file tĩnh.
- Demo truy cập được từ xa qua Cloudflare Tunnel.

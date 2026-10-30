# Cloudflare Demo Hosting

The local stack is exposed through Cloudflare Quick Tunnels so the console, API, n8n and the database admin UI can be opened from any browser during the demo.

## Public URLs

| Service | URL |
| --- | --- |
| SOC console (Next.js) | https://dollar-disclose-dynamic-graph.trycloudflare.com |
| Medicare Store | https://dollar-disclose-dynamic-graph.trycloudflare.com/store |
| Store admin | https://dollar-disclose-dynamic-graph.trycloudflare.com/store/admin |
| REST API | https://return-sagem-westminster-acres.trycloudflare.com/api |
| Store API | https://return-sagem-westminster-acres.trycloudflare.com/api/store/products |
| Swagger UI | https://dollar-disclose-dynamic-graph.trycloudflare.com/api/docs/ |
| n8n editor | https://let-fell-dns-persons.trycloudflare.com |
| pgAdmin (database UI) | https://limit-precipitation-programmes-patio.trycloudflare.com |
| Mailpit (hộp thư demo) | https://van-dependent-sensitivity-dear.trycloudflare.com |

Demo login:

- SOC console: `admin@medicareguard.io` / `Admin@123`
- Store customer: `an.nguyen@example.com` / `Customer@123`
- pgAdmin: `admin@riceguard.vn` / `admin123`
- PostgreSQL inside pgAdmin: host `172.17.0.1` (Docker host), port `5433`, database `medicareguard`, user `medicare`, password `medicare`. From a container on `medicareguard-soc_socnet`, use `mg-postgres:5432` instead.

## Ba bề mặt demo

| Bề mặt | Đường dẫn | Vai trò |
| --- | --- | --- |
| SOC Console | `/dashboard` | Nơi giám sát cảnh báo, sự cố, tài sản, log, automation. Đây là “sản phẩm an ninh mạng”. |
| Cổng bệnh nhân | `/portal` | Mục tiêu mô phỏng: hồ sơ bệnh nhân giả lập và 5 nút tạo tấn công. Không phải bệnh viện thật. |
| Medicare Store | `/store` | Mục tiêu thương mại điện tử: mua hàng, checkout, gian lận đơn hàng. |

Luồng demo chuẩn: `/portal` → bấm một kịch bản tấn công → mở `/dashboard` xem alert → xem Telegram/Mailpit.

## Medicare Store demo flow

1. Open `/store`, add a product to the cart and apply a coupon at checkout.
2. Complete a normal checkout to see the order confirmation and order tracking page.
3. For the fraud scenario, use a high-value card order with a large quantity (>=20 items) from a Vietnamese IP; the backend holds the order, creates a SOC alert and dispatches `mg-ecommerce-fraud` to n8n.
4. Show the Telegram alert, the n8n execution, and the store admin page at `/store/admin` using the SOC admin account.

## Kiểm thử tự động toàn bộ kịch bản Việt Nam

Chạy một lần để kiểm tra catalog, SQL injection, admin 401, đăng nhập khách, coupon, price tampering, checkout thường, checkout rủi ro cao, 5 kịch bản portal, Telegram/n8n và Mailpit:

```bash
npm run test:vn
```

Test này tạo thêm đơn hàng và cảnh báo. Trước buổi demo muốn số liệu sạch theo seed:

```bash
cd backend && npm run seed:reset
```

## Vì sao dashboard có số?

- `Sản phẩm`: đếm `store_products` đang active, hiện là 12 sản phẩm seed.
- `Đơn hàng` / `Đơn cần xử lý`: đếm `store_orders`; đơn mới checkout sẽ tăng ngay.
- `Khách hàng`: đếm `store_customers`.
- `Doanh thu đã thanh toán`: tổng `total` của đơn có `payment_status = 'paid'`.
- `Sự kiện gian lận`: lấy từ `store_security_events`, do checkout rủi ro cao tạo ra.
- `Bán chạy`: tổng hợp từ `store_order_items`.

Dữ liệu seed có 6 đơn, tất cả IP đều ở Việt Nam. Hai đơn rủi ro cao dùng kịch bản đơn giá trị lớn + thẻ + số lượng lớn, nên vẫn bị tạm giữ mà không cần IP nước ngoài. Ngưỡng chặn và gửi n8n là `risk_score >= 50`. Checkout thật từ trình duyệt của bạn cũng lấy IP/quốc gia Việt Nam.

## Khách hàng "tấn công" gì?

Khách bình thường chỉ mua hàng. Kịch bản tấn công là một khách/attacker gửi request trực tiếp tới API:

1. SQL injection ở tìm kiếm sản phẩm: thử `' OR 1=1 --`; backend dùng parameterized query nên không lộ dữ liệu.
2. Gọi API admin khi chưa đăng nhập: trả `401`.
3. Sửa giá trong giỏ/checkout: backend bỏ qua giá client gửi lên và tính lại từ DB.
4. Checkout gian lận: đơn giá trị cao, thẻ tín dụng, số lượng lớn (>=20 món) từ IP Việt Nam; đơn bị `on_hold`, tạo alert và gọi n8n.

## Khi nào gửi Telegram/Mailpit?

- Chỉ khi checkout tạo đơn có `risk_score >= 50`: backend gọi webhook n8n `mg-ecommerce-fraud`.
- n8n gửi Telegram thật nếu `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` có trong môi trường.
- "Gmail" trong demo được mô phỏng bằng SMTP local Mailpit (`127.0.0.1:1025`), không phải Gmail thật. Xem thư tại link Mailpit ở trên.
- Các workflow SOC khác (giám sát tấn công, ransomware, phishing, SLA) cũng gửi Telegram/Mailpit khi có sự kiện.
- Thêm vào giỏ, xem sản phẩm, đăng nhập bình thường không gửi Telegram/Mailpit.

## Đổi tên miền Quick Tunnel?

Quick Tunnel do Cloudflare cấp hostname ngẫu nhiên và **không thể đổi tên**. Muốn link cố định/đẹp như `medicareguard.pages.dev` hoặc `app.tenmien.com` cần đăng nhập Cloudflare và dùng Pages/named tunnel.

## Start the tunnels

```bash
setsid bash -c 'exec cloudflared tunnel --url http://localhost:3000 --no-autoupdate' </dev/null >/tmp/cloudflared-web.log 2>&1 & disown
setsid bash -c 'exec cloudflared tunnel --url http://localhost:4000 --no-autoupdate' </dev/null >/tmp/cloudflared-api.log 2>&1 & disown
setsid bash -c 'exec cloudflared tunnel --url http://localhost:5678 --no-autoupdate' </dev/null >/tmp/cloudflared-n8n.log 2>&1 & disown
setsid bash -c 'exec cloudflared tunnel --url http://localhost:5050 --no-autoupdate' </dev/null >/tmp/cloudflared-db.log 2>&1 & disown
setsid bash -c 'exec cloudflared tunnel --url http://localhost:8025 --no-autoupdate' </dev/null >/tmp/cloudflared-mailpit.log 2>&1 & disown
```

Read the generated URLs:

```bash
grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared-*.log
```

The frontend proxies `/api/*` to the local backend through `frontend/next.config.mjs`, so the browser only needs the console URL. CORS also accepts `*.trycloudflare.com` in non-production for the API and n8n tunnels.

## Important limitations

- Quick Tunnels are intended for demos. They have no uptime guarantee and the hostname changes every time `cloudflared` starts.
- PostgreSQL is not exposed directly. pgAdmin is the web entry point; close the tunnel after the demo or replace the weak pgAdmin password.
- For production, use a named Cloudflare Tunnel with Cloudflare Access, a managed PostgreSQL provider (Neon, Supabase, RDS) and Cloudflare Hyperdrive. n8n and PostgreSQL cannot run natively on Cloudflare Pages/Workers.

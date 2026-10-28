# Cloudflare deployment blueprint

Mục tiêu: đưa MedicareGuard ra public bằng Cloudflare, có URL ổn định, TLS, WAF và Access.
Tài liệu này nói rõ phần nào chạy được trực tiếp trên Cloudflare và phần nào không.

## 1. Giới hạn thực tế của Cloudflare

| Thành phần | Chạy trực tiếp trên Cloudflare? | Ghi chú |
| --- | --- | --- |
| Next.js frontend | Có | Cloudflare Pages + OpenNext adapter, hoặc static export nếu bỏ dynamic routes. |
| Express backend | Không nguyên trạng | Workers không chạy Express/Postgres TCP trực tiếp. Cần refactor sang Hono/Workers hoặc chạy container/VPS. |
| n8n | Không | n8n là service Node.js chạy dài hạn, cần DB và volume. Phải chạy VPS/container/Render. |
| PostgreSQL | Không | Cloudflare D1 là SQLite, không phải PostgreSQL. Dùng Neon/Supabase/RDS hoặc Postgres trong VPS. |
| Ảnh sản phẩm | Có | Có thể đưa lên R2 hoặc Cloudflare Pages static assets. |
| WAF, Access, DNS, TLS | Có | Đây là phần Cloudflare mạnh nhất và nên dùng cho toàn bộ demo. |

Kết luận: không thể “đưa tất cả n8n + PostgreSQL + Express lên Cloudflare Workers” trong code hiện tại.
Kiến trúc đúng là: **Cloudflare làm cửa ngõ + frontend**, còn backend/n8n/Postgres chạy trên VPS/container hoặc managed service.

## 2. Kiến trúc khuyến nghị

```text
Internet
   |
Cloudflare DNS + WAF + Access
   |-- app.domain.com   -> Cloudflare Pages (Next.js)
   |-- api.domain.com   -> Cloudflare Tunnel -> backend:4000
   |-- n8n.domain.com   -> Cloudflare Tunnel -> n8n:5678 (Access protected)
   |-- db.domain.com    -> Cloudflare Tunnel -> pgAdmin:5050 (Access protected)
                              |
                         VPS / Docker Compose
                         |-- backend
                         |-- n8n
                         |-- PostgreSQL (hoặc Neon/Supabase)
```

## 3. Kiểm tra trước khi deploy

```bash
./deploy/cloudflare/preflight.sh
```

Script kiểm tra Node, Docker, cloudflared, wrangler, đăng nhập Cloudflare, biến môi trường domain và health local. Script không deploy và không đọc token.

## 4. Phương án nhanh nhất cho demo

Giữ stack hiện tại chạy bằng Docker Compose trên máy/VPS, sau đó dùng **named Cloudflare Tunnel** thay cho Quick Tunnel.

### Bước 1: đăng nhập Cloudflare

```bash
cloudflared tunnel login
```

### Bước 2: tạo tunnel

```bash
cloudflared tunnel create medicareguard
```

Lệnh này tạo file credentials trong `~/.cloudflared/<TUNNEL_ID>.json`.

### Bước 3: tạo config

Sao chép `cloudflared/config.yml.example` thành `~/.cloudflared/config.yml`, thay:

- `<TUNNEL_ID>`
- `example.com` bằng domain thật
- đường dẫn credentials

### Bước 4: trỏ DNS

```bash
cloudflared tunnel route dns medicareguard app.example.com
cloudflared tunnel route dns medicareguard api.example.com
cloudflared tunnel route dns medicareguard n8n.example.com
cloudflared tunnel route dns medicareguard db.example.com
```

### Bước 5: chạy tunnel

```bash
cloudflared tunnel run medicareguard
```

### Bước 6: cấu hình ứng dụng

Backend:

```env
CORS_ORIGINS=https://app.example.com
PUBLIC_APP_URL=https://app.example.com
N8N_BASE_URL=https://n8n.example.com
```

Frontend:

```env
BACKEND_INTERNAL_URL=http://backend:4000
NEXT_PUBLIC_API_URL=https://api.example.com/api
```

n8n:

```env
N8N_HOST=n8n.example.com
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n.example.com/
MG_CONSOLE_URL=https://app.example.com
```

### Bước 7: khóa n8n và pgAdmin bằng Cloudflare Access

Tạo Access Application cho:

- `n8n.example.com`
- `db.example.com`

Chỉ cho email của bạn/thầy cô đi qua. Không để pgAdmin public không bảo vệ.

## 5. Phương án Cloudflare Pages cho frontend

Frontend hiện là Next.js 15, có dynamic routes. Có 2 cách:

1. **OpenNext Cloudflare adapter** (khuyến nghị): build Next.js thành Worker/Pages bundle.
2. **Static export**: chỉ dùng nếu chấp nhận bỏ SSR/dynamic routes hoặc thêm `generateStaticParams` cho mọi route động.

Các bước tổng quát:

```bash
cd frontend
npx opennextjs-cloudflare build
npx wrangler pages deploy .open-next/assets --project-name medicareguard
```

Trước khi deploy, phải đăng nhập:

```bash
npx wrangler login
```

Sau khi deploy, gắn custom domain `app.example.com` trong Cloudflare Pages.

## 6. Phương án managed services

Nếu không muốn giữ VPS:

- **Frontend:** Cloudflare Pages.
- **Backend:** Render/Railway/Fly.io (Dockerfile đã có).
- **n8n:** Render/Railway/Fly.io (Docker image `n8nio/n8n`).
- **PostgreSQL:** Neon/Supabase/RDS.
- **Cloudflare:** DNS, WAF, Access, Tunnel nếu backend cần IP ổn định.

Biến môi trường backend cần đổi:

```env
DATABASE_URL=postgresql://...
DATABASE_SSL=true
CORS_ORIGINS=https://app.example.com
N8N_BASE_URL=https://n8n.example.com
```

## 7. Checklist trước khi public

- [ ] `npm run build` pass.
- [ ] `npm test` pass 61/61.
- [ ] `npm run test:security` pass 21/21.
- [ ] `npm run demo:attack` chạy được.
- [ ] Đổi `JWT_SECRET`, `POSTGRES_PASSWORD`, `N8N_ENCRYPTION_KEY`.
- [ ] Bật Cloudflare Access cho n8n/pgAdmin.
- [ ] Bật WAF managed rules.
- [ ] Giới hạn CORS đúng domain.
- [ ] Backup PostgreSQL.
- [ ] Không public pgAdmin bằng mật khẩu yếu.

## 8. Thông tin cần có để deploy thật

Để deploy lên tài khoản của bạn, cần một trong hai:

1. Chạy `npx wrangler login` và `cloudflared tunnel login` trên máy này, hoặc
2. Cung cấp `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (token có quyền Pages, Workers, DNS, Tunnel).

Ngoài ra cần:

- Domain đã trỏ nameserver về Cloudflare.
- Quyết định backend/n8n/Postgres chạy ở đâu: máy hiện tại, VPS, hay Render/Railway + Neon/Supabase.

Không nên gửi token vào chat. Cách an toàn nhất là tự chạy lệnh login trên máy này.

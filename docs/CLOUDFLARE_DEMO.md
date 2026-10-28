# Cloudflare Demo Hosting

The local stack is exposed through Cloudflare Quick Tunnels so the console, API, n8n and the database admin UI can be opened from any browser during the demo.

## Public URLs

| Service | URL |
| --- | --- |
| SOC console (Next.js) | https://aerospace-advancement-their-bowling.trycloudflare.com |
| Medicare Store | https://aerospace-advancement-their-bowling.trycloudflare.com/store |
| Store admin | https://aerospace-advancement-their-bowling.trycloudflare.com/store/admin |
| REST API | https://humanities-hottest-vol-inter.trycloudflare.com/api |
| Store API | https://humanities-hottest-vol-inter.trycloudflare.com/api/store/products |
| Swagger UI | https://aerospace-advancement-their-bowling.trycloudflare.com/api/docs/ |
| n8n editor | https://birmingham-screens-identified-virtual.trycloudflare.com |
| pgAdmin (database UI) | https://atlantic-plants-note-heights.trycloudflare.com |

Demo login:

- SOC console: `admin@medicareguard.io` / `Admin@123`
- Store customer: `an.nguyen@example.com` / `Customer@123`
- pgAdmin: `admin@riceguard.vn` / `admin123`
- PostgreSQL inside pgAdmin: host `medicareguard-postgres`, port `5432`, database `medicareguard`, user `medicare`, password `medicare`

## Medicare Store demo flow

1. Open `/store`, add a product to the cart and apply a coupon at checkout.
2. Complete a normal checkout to see the order confirmation and order tracking page.
3. For the fraud scenario, use a high-value card order with a mismatched country/IP; the backend holds the order, creates a SOC alert and dispatches `mg-ecommerce-fraud` to n8n.
4. Show the Telegram alert, the n8n execution, and the store admin page at `/store/admin` using the SOC admin account.

## Start the tunnels

```bash
setsid bash -c 'exec cloudflared tunnel --url http://localhost:3000 --no-autoupdate' </dev/null >/tmp/cloudflared-web.log 2>&1 & disown
setsid bash -c 'exec cloudflared tunnel --url http://localhost:4000 --no-autoupdate' </dev/null >/tmp/cloudflared-api.log 2>&1 & disown
setsid bash -c 'exec cloudflared tunnel --url http://localhost:5678 --no-autoupdate' </dev/null >/tmp/cloudflared-n8n.log 2>&1 & disown
setsid bash -c 'exec cloudflared tunnel --url http://localhost:5050 --no-autoupdate' </dev/null >/tmp/cloudflared-db.log 2>&1 & disown
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

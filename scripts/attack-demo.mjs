import { randomUUID } from "node:crypto";

const API = (process.env.API_URL || "http://localhost:4000/api").replace(/\/$/, "");
const WEB = (process.env.WEB_URL || "http://localhost:3000").replace(/\/$/, "");
const line = "─".repeat(64);

const request = async (path, { method = "GET", body, headers = {}, token, cartToken } = {}) => {
  const finalHeaders = { ...headers };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (cartToken) finalHeaders["x-cart-token"] = cartToken;
  const response = await fetch(`${API}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  return { status: response.status, ok: response.ok, body: payload };
};

const print = (label, value) => console.log(`  ${label}: ${value}`);

console.log(`\n${line}\nMEDICAREGUARD ATTACK DEMO\n${line}`);
console.log(`API: ${API}\nWEB: ${WEB}\n`);

const login = await request("/auth/login", {
  method: "POST",
  body: { email: "admin@medicareguard.io", password: "Admin@123" },
});
if (!login.ok || !login.body?.token) {
  console.error("Không đăng nhập được SOC admin. Kiểm tra backend và seed dữ liệu.");
  process.exit(1);
}
const adminToken = login.body.token;

const catalog = await request("/store/products?limit=24");
const products = catalog.body?.data || [];
const cheap = products.find((product) => product.stock > 10) || products[0];
const expensive = products
  .filter((product) => product.effective_price >= 2_000_000)
  .sort((a, b) => b.effective_price - a.effective_price)[0] || products[0];
if (!cheap || !expensive) {
  console.error("Không tải được sản phẩm để chạy demo.");
  process.exit(1);
}

console.log("1. SQL injection vào tìm kiếm sản phẩm");
const sqli = await request(`/store/products?q=${encodeURIComponent("' OR 1=1--")}`);
print("HTTP", sqli.status);
print("Số dòng trả về", (sqli.body?.data || []).length);
print("Kết luận", sqli.status === 200 && (sqli.body?.data || []).length === 0 ? "ĐÃ CHẶN (parameterized query)" : "CẦN KIỂM TRA");

console.log("\n2. Truy cập trái phép API quản trị cửa hàng");
const unauth = await request("/store/admin/orders");
print("HTTP", unauth.status);
print("Kết luận", unauth.status === 401 ? "ĐÃ CHẶN (thiếu token)" : "CẦN KIỂM TRA");

console.log("\n3. Sửa giá và trạng thái đơn từ phía client");
const tamperCart = await request("/store/cart", { method: "POST", body: {} });
const tamperToken = tamperCart.body?.data?.token;
await request(`/store/cart/${tamperToken}/items`, {
  method: "POST",
  body: { productId: cheap.id, quantity: 1 },
});
const tampered = await request("/store/checkout", {
  method: "POST",
  headers: { "CF-Connecting-IP": "113.161.72.18", "CF-IPCountry": "VN" },
  body: {
    cartToken: tamperToken,
    paymentMethod: "cod",
    items: [{ productId: cheap.id, quantity: 1, unitPrice: 1, lineTotal: 1 }],
    total: 1,
    riskScore: 0,
    status: "delivered",
    paymentStatus: "paid",
    shipping: {
      name: "Nguyễn Văn An",
      email: `attack-${randomUUID()}@example.com`,
      phone: "0901234567",
      address: "12 Nguyễn Huệ",
      city: "TP. Hồ Chí Minh",
      country: "Việt Nam",
      countryCode: "VN",
    },
  },
});
const tamperedOrder = tampered.body?.data?.order;
print("HTTP", tampered.status);
print("Subtotal server tính", tamperedOrder?.subtotal);
print("Total client gửi", 1);
print("Trạng thái đơn", tamperedOrder?.status);
print("Thanh toán", tamperedOrder?.payment_status);
print(
  "Kết luận",
  tamperedOrder?.subtotal === cheap.effective_price && tamperedOrder?.status !== "delivered" && tamperedOrder?.payment_status !== "paid"
    ? "ĐÃ CHẶN (server tự tính giá và bỏ qua trạng thái giả)"
    : "CẦN KIỂM TRA",
);

console.log("\n4. Gian lận thanh toán: IP/quốc gia lệch, đơn giá trị cao");
const fraudCart = await request("/store/cart", { method: "POST", body: {} });
const fraudToken = fraudCart.body?.data?.token;
await request(`/store/cart/${fraudToken}/items`, {
  method: "POST",
  body: { productId: expensive.id, quantity: 4 },
});
const fraud = await request("/store/checkout", {
  method: "POST",
  headers: {
    "CF-Connecting-IP": "77.35.40.181",
    "CF-IPCountry": "NL",
    "User-Agent": "MedicareGuard-Attack-Demo/1.0",
  },
  body: {
    cartToken: fraudToken,
    paymentMethod: "card",
    shipping: {
      name: "Kẻ Gian Demo",
      email: `fraud-${randomUUID()}@example.com`,
      phone: "0900000000",
      address: "1 Marina Boulevard",
      city: "Singapore",
      country: "Singapore",
      countryCode: "SG",
    },
  },
});
const fraudData = fraud.body?.data;
print("HTTP", fraud.status);
print("Mã đơn", fraudData?.order?.order_number);
print("Trạng thái", fraudData?.order?.status);
print("Risk score", fraudData?.risk?.riskScore);
print("Flags", (fraudData?.risk?.flags || []).join(", ") || "không có");
print("Alert ID", fraudData?.fraud?.alertId || "không có");
print("n8n dispatch", JSON.stringify(fraudData?.fraud?.dispatch || {}));
print(
  "Kết luận",
  fraudData?.order?.status === "on_hold" && (fraudData?.risk?.riskScore || 0) >= 65
    ? "ĐÃ PHÁT HIỆN (đơn bị tạm giữ, cảnh báo SOC + n8n)"
    : "CẦN KIỂM TRA",
);

await new Promise((resolve) => setTimeout(resolve, 1500));

console.log("\n5. Cảnh báo mới trong SOC");
const alerts = await request("/alerts?limit=5", { token: adminToken });
for (const alert of (alerts.body?.data || []).slice(0, 5)) {
  console.log(`  [${alert.severity || "?"}] ${alert.title || alert.name || alert.id} | ${alert.source_ip || alert.sourceIp || ""}`);
}

console.log("\n6. Sự kiện gian lận mới trong Store Admin");
const events = await request("/store/admin/security-events?limit=5", { token: adminToken });
for (const event of (events.body?.data || []).slice(0, 5)) {
  console.log(`  [${event.severity}] ${event.event_type} | risk ${event.risk_score} | ${event.ip_address} (${event.country_code || "?"})`);
}

console.log(`\n${line}`);
console.log("Mở các trang sau để trình diễn:");
console.log(`  SOC alerts:   ${WEB}/alerts`);
console.log(`  Store admin:  ${WEB}/store/admin`);
console.log(`  n8n:          http://localhost:5678`);
console.log(`  Telegram:     @riceguard_alert_bot`);
console.log(`${line}\n`);

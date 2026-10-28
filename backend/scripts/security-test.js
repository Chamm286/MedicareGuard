const { randomUUID } = require("node:crypto");

const API = (process.env.API_URL || "http://localhost:4000/api").replace(/\/$/, "");
const results = [];

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

const record = (name, passed, detail) => {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const expect = (name, condition, detail) => record(name, Boolean(condition), detail);

async function main() {
const adminLogin = await request("/auth/login", {
  method: "POST",
  body: { email: "admin@medicareguard.io", password: "Admin@123" },
});
const adminToken = adminLogin.body?.token;
expect("SOC admin login for security tests", adminLogin.ok && adminToken, `HTTP ${adminLogin.status}`);

const catalog = await request("/store/products?limit=24");
const products = catalog.body?.data || [];
expect("Store catalog is reachable", catalog.ok && products.length > 0, `${products.length} products`);
const cheap = products.find((product) => product.stock > 10) || products[0];
const expensive = products.filter((product) => product.effective_price >= 2_000_000).sort((a, b) => b.effective_price - a.effective_price)[0] || products[0];

const sqliSearch = await request(`/store/products?q=${encodeURIComponent("' OR 1=1--")}`);
expect("SQL injection in product search is parameterized", sqliSearch.status === 200 && (sqliSearch.body?.data || []).length === 0, `HTTP ${sqliSearch.status}, ${(sqliSearch.body?.data || []).length} rows`);

const sqliSlug = await request(`/store/products/${encodeURIComponent("' OR 1=1--")}`);
expect("SQL injection in product slug is rejected", sqliSlug.status === 404, `HTTP ${sqliSlug.status}`);

const unauthAdmin = await request("/store/admin/orders");
expect("Store admin API requires authentication", unauthAdmin.status === 401, `HTTP ${unauthAdmin.status}`);

const customerLogin = await request("/store/auth/login", {
  method: "POST",
  body: { email: "an.nguyen@example.com", password: "Customer@123" },
});
const customerToken = customerLogin.body?.token;
expect("Seeded customer can authenticate", customerLogin.ok && customerToken, `HTTP ${customerLogin.status}`);

const customerAdmin = await request("/store/admin/orders", { token: customerToken });
expect("Customer token cannot access store admin", customerAdmin.status === 401 || customerAdmin.status === 403, `HTTP ${customerAdmin.status}`);

const cartResponse = await request("/store/cart", { method: "POST", body: {} });
const cartToken = cartResponse.body?.data?.token;
expect("Cart token is issued", cartResponse.ok && cartToken, `HTTP ${cartResponse.status}`);

const negativeQty = await request(`/store/cart/${cartToken}/items`, {
  method: "POST",
  body: { productId: cheap.id, quantity: -5 },
});
expect("Negative quantity is rejected", negativeQty.status === 400, `HTTP ${negativeQty.status}`);

const oversizedQty = await request(`/store/cart/${cartToken}/items`, {
  method: "POST",
  body: { productId: cheap.id, quantity: 99 },
});
expect("Quantity above stock is rejected", oversizedQty.status === 409 || oversizedQty.status === 400, `HTTP ${oversizedQty.status}`);

const invalidCoupon = await request(`/store/cart/${cartToken}/coupon`, {
  method: "POST",
  body: { code: "HACKER100" },
});
expect("Unknown coupon is rejected", invalidCoupon.status === 400, `HTTP ${invalidCoupon.status}`);

const lowValueCoupon = await request(`/store/cart/${cartToken}/coupon`, {
  method: "POST",
  body: { code: "VIP20" },
});
expect("Coupon minimum spend is enforced", lowValueCoupon.status === 400, `HTTP ${lowValueCoupon.status}`);

await request(`/store/cart/${cartToken}/items`, { method: "POST", body: { productId: cheap.id, quantity: 1 } });
const tamperedCheckout = await request("/store/checkout", {
  method: "POST",
  headers: { "CF-Connecting-IP": "113.161.72.18", "CF-IPCountry": "VN" },
  body: {
    cartToken,
    paymentMethod: "cod",
    items: [{ productId: cheap.id, quantity: 1, unitPrice: 1, lineTotal: 1 }],
    total: 1,
    riskScore: 0,
    status: "delivered",
    paymentStatus: "paid",
    shipping: { name: "Nguyễn Văn An", email: `security-${randomUUID()}@example.com`, phone: "0901234567", address: "12 Nguyễn Huệ", city: "TP. HCM", country: "Việt Nam", countryCode: "VN" },
  },
});
const tamperedOrder = tamperedCheckout.body?.data?.order;
expect("Price tampering is ignored by server-side pricing", tamperedCheckout.status === 201 && tamperedOrder?.subtotal === cheap.effective_price && tamperedOrder?.total !== 1, `subtotal ${tamperedOrder?.subtotal}, total ${tamperedOrder?.total}`);
expect("Mass-assignment cannot force order/payment status", tamperedOrder?.status !== "delivered" && tamperedOrder?.payment_status !== "paid", `status ${tamperedOrder?.status}, payment ${tamperedOrder?.payment_status}`);

const idorNoAuth = await request(`/store/orders/${tamperedOrder?.id}`);
expect("Order lookup blocks unauthenticated IDOR", idorNoAuth.status === 403 || idorNoAuth.status === 401, `HTTP ${idorNoAuth.status}`);

const idorWrongEmail = await request(`/store/orders/${tamperedOrder?.id}?email=attacker@example.com`);
expect("Order lookup blocks wrong guest email", idorWrongEmail.status === 403, `HTTP ${idorWrongEmail.status}`);

const xssReview = await request(`/store/products/${products[0].id}/reviews`, {
  method: "POST",
  token: customerToken,
  body: { rating: 5, title: "<img src=x onerror=alert(1)>", body: "<script>alert('xss')</script> Sản phẩm tốt" },
});
const xssText = `${xssReview.body?.data?.title || ""} ${xssReview.body?.data?.body || ""}`;
expect("Stored XSS in reviews is sanitized", xssReview.status === 201 && !/<script|<img/i.test(xssText), `HTTP ${xssReview.status}`);

const fraudCart = await request("/store/cart", { method: "POST", body: {} });
const fraudToken = fraudCart.body?.data?.token;
await request(`/store/cart/${fraudToken}/items`, { method: "POST", body: { productId: expensive.id, quantity: 4 } });
const fraudCheckout = await request("/store/checkout", {
  method: "POST",
  headers: { "CF-Connecting-IP": "77.35.40.181", "CF-IPCountry": "NL", "User-Agent": "MedicareGuard-Security-Test/1.0" },
  body: {
    cartToken: fraudToken,
    paymentMethod: "card",
    shipping: { name: "Kẻ Gian Demo", email: `fraud-${randomUUID()}@example.com`, phone: "0900000000", address: "1 Marina Boulevard", city: "Singapore", country: "Singapore", countryCode: "SG" },
  },
});
const fraudData = fraudCheckout.body?.data;
expect("IP/country mismatch and high value trigger fraud review", fraudCheckout.status === 201 && fraudData?.order?.status === "on_hold" && fraudData?.risk?.riskScore >= 65, `status ${fraudData?.order?.status}, risk ${fraudData?.risk?.riskScore}`);
expect("Fraud alert is created and dispatched to n8n", Boolean(fraudData?.fraud?.alertId) && fraudData?.fraud?.dispatch?.dispatched === true, `dispatch ${JSON.stringify(fraudData?.fraud?.dispatch)}`);

const adminOrders = await request("/store/admin/orders?limit=5", { token: adminToken });
expect("SOC admin can review store orders", adminOrders.ok && Array.isArray(adminOrders.body?.data), `HTTP ${adminOrders.status}`);

const adminEvents = await request("/store/admin/security-events", { token: adminToken });
expect("SOC admin can review fraud events", adminEvents.ok && (adminEvents.body?.data || []).some((event) => event.event_type === "checkout_fraud_review"), `HTTP ${adminEvents.status}`);

const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} security checks passed.`);
if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error("Security test crashed:", error);
  process.exit(1);
});

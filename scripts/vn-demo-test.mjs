import process from "node:process";

const API = (process.env.API_URL || "http://localhost:4000/api").replace(/\/$/, "");
const MAILPIT = (process.env.MAILPIT_URL || "http://localhost:8025").replace(/\/$/, "");
const VN_HEADERS = { "CF-Connecting-IP": "113.161.72.18", "CF-IPCountry": "VN", "User-Agent": "MedicareGuard-VN-Demo/1.0" };
const CUSTOMER = { email: "an.nguyen@example.com", password: "Customer@123" };
const SOC = { email: "admin@medicareguard.io", password: "Admin@123" };

let passed = 0;
let failed = 0;

const check = (label, condition, detail = "") => {
  if (condition) {
    passed += 1;
    console.log(`PASS ${label}${detail ? ` · ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`FAIL ${label}${detail ? ` · ${detail}` : ""}`);
  }
};

const request = async (path, { method = "GET", body, token, headers = {} } = {}) => {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep text
  }
  return { status: response.status, ok: response.ok, data };
};

const mailpitCount = async () => {
  try {
    const response = await fetch(`${MAILPIT}/api/v1/messages`, { signal: AbortSignal.timeout(5000) });
    const payload = await response.json();
    return Number(payload.total || 0);
  } catch {
    return null;
  }
};

const waitForMailIncrease = async (before, timeoutMs = 15000) => {
  if (before === null) return null;
  const deadline = Date.now() + timeoutMs;
  let current = before;
  while (Date.now() < deadline) {
    current = await mailpitCount();
    if (current !== null && current > before) return current;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return current;
};

const createCart = async (token) => {
  const result = await request("/store/cart", { method: "POST", body: {}, token, headers: VN_HEADERS });
  if (result.status !== 200) throw new Error(`create cart failed: ${result.status} ${JSON.stringify(result.data)}`);
  return result.data.data;
};

const addItem = async (cartToken, productId, quantity, extra = {}) => {
  const result = await request(`/store/cart/${cartToken}/items`, {
    method: "POST",
    body: { productId, quantity, ...extra },
    headers: VN_HEADERS,
  });
  if (result.status !== 201) throw new Error(`add item failed: ${result.status} ${JSON.stringify(result.data)}`);
  return result.data.data;
};

const checkout = async ({ cartToken, token, shipping, paymentMethod, extra = {} }) => {
  const result = await request("/store/checkout", {
    method: "POST",
    body: { cartToken, paymentMethod, shipping, ...extra },
    token,
    headers: VN_HEADERS,
  });
  return result;
};

const shipping = (suffix = "") => ({
  name: `Nguyễn Văn An${suffix}`,
  email: `vn-demo-${Date.now()}${suffix}@example.com`,
  phone: "0901234567",
  address: "123 Nguyễn Huệ, Quận 1",
  city: "TP. Hồ Chí Minh",
  country: "Việt Nam",
  countryCode: "VN",
});

const main = async () => {
  console.log("MedicareGuard · Vietnam demo test");
  console.log(`API ${API}`);
  console.log("");

  const products = await request("/store/products?limit=50", { headers: VN_HEADERS });
  const productList = products.data?.data || [];
  check("Store sản phẩm trả 200", products.status === 200, `${productList.length} sản phẩm`);
  const product = productList.find((item) => Number(item.stock) >= 20) || productList[0];
  check("Có sản phẩm đủ tồn kho cho kịch bản số lượng lớn", Boolean(product) && Number(product.stock) >= 20, product ? `${product.sku} stock ${product.stock}` : "không có");

  const sqli = await request(`/store/products?q=${encodeURIComponent("' OR 1=1 --")}`, { headers: VN_HEADERS });
  check("SQL injection không trả toàn bộ sản phẩm", sqli.status === 200 && (sqli.data?.data || []).length === 0, `status ${sqli.status}, rows ${(sqli.data?.data || []).length}`);

  const unauthorized = await request("/store/admin/stats", { headers: VN_HEADERS });
  check("API admin không token trả 401", unauthorized.status === 401, `status ${unauthorized.status}`);

  const login = await request("/store/auth/login", { method: "POST", body: CUSTOMER, headers: VN_HEADERS });
  const customerToken = login.data?.token;
  check("Khách hàng Việt Nam đăng nhập được", login.status === 200 && Boolean(customerToken), `status ${login.status}`);

  const customerOrders = await request("/store/orders", { token: customerToken, headers: VN_HEADERS });
  check("Khách hàng xem được đơn của mình", customerOrders.status === 200 && Array.isArray(customerOrders.data?.data), `status ${customerOrders.status}`);

  const normalCart = await createCart();
  await addItem(normalCart.token, product.id, 1);
  const normal = await checkout({ cartToken: normalCart.token, shipping: shipping("-normal"), paymentMethod: "cod" });
  check("Checkout Việt Nam bình thường thành công", normal.status === 201 && normal.data?.data?.risk?.riskScore < 60, `status ${normal.data?.data?.order?.status}, risk ${normal.data?.data?.risk?.riskScore}`);
  check("Checkout bình thường ghi nhận IP/quốc gia Việt Nam", normal.data?.data?.client?.countryCode === "VN", `${normal.data?.data?.client?.ip} · ${normal.data?.data?.client?.country}`);

  const customerCart = await createCart(customerToken);
  await addItem(customerCart.token, product.id, 1);
  const customerCheckout = await checkout({ cartToken: customerCart.token, token: customerToken, shipping: shipping("-customer"), paymentMethod: "cod" });
  check("Checkout bằng tài khoản khách hàng thành công", customerCheckout.status === 201 && Boolean(customerCheckout.data?.data?.order?.customer_id), `status ${customerCheckout.status}`);

  const couponCart = await createCart();
  await addItem(couponCart.token, product.id, 2);
  const coupon = await request(`/store/cart/${couponCart.token}/coupon`, { method: "POST", body: { code: "MEDICARE10" }, headers: VN_HEADERS });
  check("Coupon MEDICARE10 áp dụng được", coupon.status === 200 && Number(coupon.data?.data?.discount) > 0, `discount ${coupon.data?.data?.discount}`);

  const tamperCart = await createCart();
  await addItem(tamperCart.token, product.id, 1, { unitPrice: 1, lineTotal: 1 });
  const tamper = await checkout({ cartToken: tamperCart.token, shipping: shipping("-tamper"), paymentMethod: "cod", extra: { subtotal: 1, total: 1 } });
  const tamperOrder = tamper.data?.data?.order;
  check("Sửa giá client không có tác dụng", tamper.status === 201 && Number(tamperOrder?.total) > 1 && Number(tamperOrder?.subtotal) === Number(product.effective_price), `server total ${tamperOrder?.total}, subtotal ${tamperOrder?.subtotal}`);

  const beforeMail = await mailpitCount();
  const highCart = await createCart();
  await addItem(highCart.token, product.id, 20);
  const high = await checkout({ cartToken: highCart.token, shipping: shipping("-high"), paymentMethod: "card" });
  const highData = high.data?.data;
  check("Checkout rủi ro cao tại Việt Nam bị tạm giữ", high.status === 201 && highData?.order?.status === "on_hold" && highData?.risk?.riskScore >= 50, `status ${highData?.order?.status}, risk ${highData?.risk?.riskScore}`);
  check("Cảnh báo gian lận được tạo", Boolean(highData?.fraud?.alertId), highData?.fraud?.alertId || "không có");
  check("n8n nhận workflow gian lận", highData?.fraud?.dispatch?.dispatched === true, highData?.fraud?.dispatch?.status || "không có");

  const scenarios = ["ransomware", "phishing", "credential", "exfiltration", "insider"];
  for (const scenario of scenarios) {
    const attack = await request("/demo/attack", {
      method: "POST",
      body: { scenario, patientId: "BN-2401" },
      headers: VN_HEADERS,
    });
    const alert = attack.data?.data?.alert;
    check(`Portal · ${scenario} tạo cảnh báo Việt Nam`, attack.status === 201 && alert?.country === "Việt Nam" && String(alert?.source_ip || "").length > 0, `${alert?.source_ip} · ${alert?.risk_score}/100`);
    check(`Portal · ${scenario} gọi n8n`, attack.data?.data?.dispatched === true, attack.data?.data?.dispatchStatus || "không có");
  }

  const afterMail = await waitForMailIncrease(beforeMail);
  if (beforeMail !== null && afterMail !== null) {
    check("Mailpit nhận thêm email demo", afterMail > beforeMail, `${beforeMail} → ${afterMail}`);
  }

  const socLogin = await request("/auth/login", { method: "POST", body: SOC, headers: VN_HEADERS });
  const socToken = socLogin.data?.token;
  check("SOC admin đăng nhập được", socLogin.status === 200 && Boolean(socToken), `status ${socLogin.status}`);
  const storeStats = await request("/store/admin/stats", { token: socToken, headers: VN_HEADERS });
  check("SOC xem được store admin stats", storeStats.status === 200, `status ${storeStats.status}`);
  const alerts = await request("/alerts?limit=5", { token: socToken, headers: VN_HEADERS });
  check("SOC xem được cảnh báo", alerts.status === 200, `status ${alerts.status}`);

  console.log("");
  console.log(`Kết quả: ${passed} pass, ${failed} fail`);
  if (failed > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error("VN demo test crashed:", error);
  process.exitCode = 1;
});

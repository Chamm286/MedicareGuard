const express = require("express");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { query, withTransaction } = require("../config/db");
const config = require("../config/env");
const { asyncHandler, HttpError, parsePagination } = require("../utils/http");
const { authenticate, requirePermission } = require("../middleware/auth");
const { recordActivity, recordAudit } = require("../services/audit");

const router = express.Router();
const STORE_ISSUER = "medicareguard-store";
const STORE_AUDIENCE = "store";
const PAYMENT_METHODS = new Set(["cod", "bank_transfer", "card", "sepay"]);
const ORDER_STATUSES = new Set(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "on_hold"]);
const PAYMENT_STATUSES = new Set(["unpaid", "pending", "paid", "refunded", "failed"]);

const sepayConfig = () => ({
  accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || process.env.SEPAY_ACCOUNT || "",
  bankCode: process.env.SEPAY_BANK_CODE || process.env.SEPAY_BANK || "",
  accountName: process.env.SEPAY_ACCOUNT_NAME || "Medicare Store",
  webhookSecret: process.env.SEPAY_WEBHOOK_SECRET || process.env.SEPAY_SECRET || "",
});

const sepayQrUrl = (order) => {
  const cfg = sepayConfig();
  if (!cfg.accountNumber || !cfg.bankCode) return null;
  const params = new URLSearchParams({
    acc: cfg.accountNumber,
    bank: cfg.bankCode,
    amount: String(Math.round(Number(order.total || 0))),
    des: order.order_number,
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
};

const sepayPaymentPayload = (order) => {
  const cfg = sepayConfig();
  return {
    provider: "sepay",
    method: "sepay",
    status: order.payment_status,
    accountNumber: cfg.accountNumber || null,
    accountName: cfg.accountName,
    bankCode: cfg.bankCode || null,
    amount: money(order.total),
    currency: order.currency || "VND",
    content: order.order_number,
    qrUrl: sepayQrUrl(order),
    instructions: cfg.accountNumber
      ? `Chuyển khoản ${money(order.total).toLocaleString("vi-VN")} ₫ tới tài khoản ${cfg.accountNumber} (${cfg.bankCode}) với nội dung ${order.order_number}.`
      : "Cấu hình SEPAY_ACCOUNT_NUMBER và SEPAY_BANK_CODE để tạo mã QR thanh toán.",
  };
};

const COUNTRY_NAMES = {
  VN: "Việt Nam", SG: "Singapore", NL: "Hà Lan", EG: "Ai Cập", US: "Hoa Kỳ", CN: "Trung Quốc",
  RU: "Nga", JP: "Nhật Bản", KR: "Hàn Quốc", DE: "Đức", FR: "Pháp", GB: "Vương quốc Anh",
  IN: "Ấn Độ", ID: "Indonesia", TH: "Thái Lan", MY: "Malaysia", AU: "Úc", CA: "Canada",
  BR: "Brazil", IR: "Iran", KP: "Triều Tiên", UA: "Ukraine", RO: "Romania", NG: "Nigeria",
  TR: "Thổ Nhĩ Kỳ", PH: "Philippines", TW: "Đài Loan", HK: "Hồng Kông", UN: "Không xác định",
};

const DEMO_GEO = [
  { prefix: "45.175.", code: "VN" },
  { prefix: "203.83.", code: "SG" },
  { prefix: "77.35.", code: "NL" },
  { prefix: "41.233.", code: "EG" },
];

const isPrivateIp = (ip) => !ip || ip === "::1" || ip === "unknown" || /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::ffff:127\.|fc|fd|fe80)/i.test(ip);

const firstIp = (value) => String(value || "").split(",")[0].trim().replace(/^::ffff:/, "");

const clientContext = (req) => {
  const candidates = [
    ["cf-connecting-ip", req.headers["cf-connecting-ip"]],
    ["x-real-ip", req.headers["x-real-ip"]],
    ["x-forwarded-for", req.headers["x-forwarded-for"]],
    ["socket", req.ip],
  ];
  const selected = candidates.find(([, value]) => firstIp(value));
  const ip = firstIp(selected?.[1]) || "unknown";
  const headerCountry = String(req.headers["cf-ipcountry"] || "").toUpperCase();
  const demo = DEMO_GEO.find((entry) => ip.startsWith(entry.prefix));
  const countryCode = isPrivateIp(ip) ? "VN" : /^[A-Z]{2}$/.test(headerCountry) ? headerCountry : demo?.code || "UN";
  return {
    ip,
    ipSource: selected?.[0] || "unknown",
    countryCode,
    country: COUNTRY_NAMES[countryCode] || "Không xác định",
    userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
  };
};

const sanitizeText = (value, max = 2000) =>
  String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const numeric = (value) => Number(value || 0);

const money = (value) => Math.round(numeric(value) * 100) / 100;

const publicCustomer = (row) => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  phone: row.phone,
  address: row.address,
  city: row.city,
  country: row.country,
  countryCode: row.country_code,
  createdAt: row.created_at,
});

const signCustomerToken = (customer) =>
  jwt.sign(
    { email: customer.email, name: customer.full_name },
    config.jwt.secret,
    { subject: customer.id, expiresIn: "7d", issuer: STORE_ISSUER, audience: STORE_AUDIENCE },
  );

const customerAuth = (req, _res, next) => {
  const [scheme, token] = String(req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return next(new HttpError(401, "Cần đăng nhập tài khoản khách hàng"));
  try {
    const payload = jwt.verify(token, config.jwt.secret, { issuer: STORE_ISSUER, audience: STORE_AUDIENCE });
    req.customer = { id: payload.sub, email: payload.email, name: payload.name };
    return next();
  } catch (error) {
    return next(new HttpError(401, error.name === "TokenExpiredError" ? "Phiên khách hàng đã hết hạn" : "Token khách hàng không hợp lệ"));
  }
};

const optionalCustomer = (req, _res, next) => {
  const [scheme, token] = String(req.headers.authorization || "").split(" ");
  if (scheme === "Bearer" && token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret, { issuer: STORE_ISSUER, audience: STORE_AUDIENCE });
      req.customer = { id: payload.sub, email: payload.email, name: payload.name };
    } catch (_error) {
      req.customer = null;
    }
  }
  return next();
};

const cartToken = () => crypto.randomBytes(24).toString("hex");

const loadCart = async (client, token, { create = false } = {}) => {
  const runner = client || { query };
  const result = await runner.query("SELECT * FROM store_carts WHERE token = $1 LIMIT 1", [token]);
  if (result.rows[0]) return result.rows[0];
  if (!create) throw new HttpError(404, "Không tìm thấy giỏ hàng");
  const created = await runner.query(
    `INSERT INTO store_carts (token, expires_at) VALUES ($1, now() + interval '7 days') RETURNING *`,
    [token],
  );
  return created.rows[0];
};

const calculateCoupon = async (runner, couponCode, subtotal) => {
  if (!couponCode) return { discount: 0, coupon: null };
  const result = await runner.query(
    `SELECT * FROM store_coupons
     WHERE upper(code) = upper($1) AND active = true
       AND (starts_at IS NULL OR starts_at <= now())
       AND (expires_at IS NULL OR expires_at > now())
       AND (max_uses IS NULL OR used_count < max_uses)
     LIMIT 1`,
    [couponCode],
  );
  const coupon = result.rows[0];
  if (!coupon) throw new HttpError(400, "Mã giảm giá không hợp lệ hoặc đã hết hạn");
  if (subtotal < numeric(coupon.min_subtotal)) {
    throw new HttpError(400, `Mã giảm giá chỉ áp dụng cho đơn từ ${money(coupon.min_subtotal).toLocaleString("vi-VN")} ₫`);
  }
  const discount = coupon.type === "percent" ? (subtotal * numeric(coupon.value)) / 100 : numeric(coupon.value);
  return { discount: money(Math.min(discount, subtotal)), coupon };
};

const recalcCart = async (runner, cartId, couponCode) => {
  const items = await runner.query(
    `SELECT ci.id, ci.product_id, ci.quantity, p.price, p.sale_price, p.stock, p.name, p.sku, p.image_url
     FROM store_cart_items ci JOIN store_products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1 ORDER BY ci.created_at`,
    [cartId],
  );
  let subtotal = 0;
  for (const item of items.rows) {
    const unit = money(item.sale_price ?? item.price);
    const line = money(unit * item.quantity);
    subtotal = money(subtotal + line);
    await runner.query("UPDATE store_cart_items SET unit_price = $2, line_total = $3 WHERE id = $1", [item.id, unit, line]);
  }
  const { discount } = await calculateCoupon(runner, couponCode, subtotal);
  const total = money(Math.max(0, subtotal - discount));
  const updated = await runner.query(
    `UPDATE store_carts SET subtotal = $2, discount = $3, total = $4, coupon_code = $5, updated_at = now() WHERE id = $1 RETURNING *`,
    [cartId, subtotal, discount, total, couponCode || null],
  );
  return { cart: updated.rows[0], items: items.rows, subtotal, discount, total };
};

const cartPayload = async (client, cartId) => {
  const runner = client || { query };
  const cart = await runner.query("SELECT * FROM store_carts WHERE id = $1", [cartId]);
  if (!cart.rows[0]) throw new HttpError(404, "Không tìm thấy giỏ hàng");
  const items = await runner.query(
    `SELECT ci.id, ci.product_id, ci.quantity, ci.unit_price, ci.line_total, p.name, p.sku, p.slug, p.image_url, p.stock, p.category
     FROM store_cart_items ci JOIN store_products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1 ORDER BY ci.created_at`,
    [cartId],
  );
  return {
    token: cart.rows[0].token,
    status: cart.rows[0].status,
    couponCode: cart.rows[0].coupon_code,
    subtotal: money(cart.rows[0].subtotal),
    discount: money(cart.rows[0].discount),
    total: money(cart.rows[0].total),
    currency: cart.rows[0].currency,
    items: items.rows.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: money(item.unit_price),
      line_total: money(item.line_total),
    })),
    itemCount: items.rows.reduce((sum, item) => sum + Number(item.quantity), 0),
  };
};

const FRAUD_RISK_THRESHOLD = 50;
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;
const ORDER_VELOCITY_WINDOW = "1 minute";
const ORDER_VELOCITY_LIMIT = 4;

const normalizePhone = (value) => String(value || "").replace(/[\s.\-()]/g, "");

const isValidVietnamesePhone = (value) => /^(0(3|5|7|8|9)\d{8}|\+84(3|5|7|8|9)\d{8})$/.test(normalizePhone(value));

const isValidAddress = (value) => {
  const address = String(value || "").trim();
  return address.length >= 10
    && address.length <= 300
    && /[0-9A-Za-zÀ-ỹ]/.test(address)
    && !/[<>{}[\]$%^*=~`|\\]/.test(address);
};

const evaluateRisk = ({
  total,
  paymentMethod,
  context,
  shippingCountryCode,
  items,
  customer,
  phone,
  address,
  recentOrderCount = 0,
  customerCreatedAt = null,
}) => {
  let score = 0;
  const flags = [];

  if (context.countryCode !== "VN" && context.countryCode !== "UN") {
    score += 35;
    flags.push("foreign_ip");
  }
  if (shippingCountryCode && context.countryCode !== shippingCountryCode) {
    score += 10;
    flags.push("ip_country_mismatch");
  }
  if (context.countryCode === "UN") {
    score += 10;
    flags.push("unknown_ip_country");
  }
  if (total >= 10_000_000) {
    score += 30;
    flags.push("high_value_order");
  } else if (total >= 5_000_000) {
    score += 15;
    flags.push("elevated_value_order");
  }
  if (paymentMethod === "card" && total >= 3_000_000) {
    score += 15;
    flags.push("card_high_value");
  }
  const quantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  if (quantity >= 20) {
    score += 30;
    flags.push("bulk_quantity");
  }
  if (recentOrderCount >= ORDER_VELOCITY_LIMIT) {
    score += 40;
    flags.push("order_velocity");
  }
  if (!isValidVietnamesePhone(phone)) {
    score += 20;
    flags.push("invalid_phone");
  }
  if (!isValidAddress(address)) {
    score += 20;
    flags.push("invalid_address");
  }
  if (customerCreatedAt && total >= 5_000_000) {
    const accountAge = Date.now() - new Date(customerCreatedAt).getTime();
    if (Number.isFinite(accountAge) && accountAge >= 0 && accountAge <= NEW_ACCOUNT_WINDOW_MS) {
      score += 30;
      flags.push("new_account_high_value");
    }
  }
  if (!customer) {
    score += 8;
    flags.push("guest_checkout");
  }
  if (context.ipSource === "unknown") {
    score += 10;
    flags.push("missing_client_ip");
  }
  return { riskScore: Math.min(100, score), flags };
};

const n8nBaseUrl = () => (process.env.N8N_BASE_URL || process.env.N8N_URL || "http://localhost:5678").replace(/\/$/, "");

const dispatchFraudWorkflow = async (payload) => {
  try {
    const response = await fetch(`${n8nBaseUrl()}/webhook/mg-ecommerce-fraud`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
    return { dispatched: response.ok, status: response.ok ? "dispatched" : `HTTP ${response.status}` };
  } catch (error) {
    return { dispatched: false, status: error.name === "TimeoutError" ? "timeout" : "n8n-offline" };
  }
};

const raiseFraudAlert = async ({ order, context, riskScore, flags, items }) => {
  const severity = riskScore >= 80 ? "critical" : riskScore >= FRAUD_RISK_THRESHOLD ? "high" : "medium";
  const title = `Gian lận thương mại điện tử — đơn ${order.order_number}`;
  const description = [
    `Đơn hàng ${order.order_number} trị giá ${money(order.total).toLocaleString("vi-VN")} ₫ có điểm rủi ro ${riskScore}/100.`,
    `IP ${context.ip} (${context.country}) qua ${context.ipSource}; giao tới ${order.shipping_city}, ${order.shipping_country}.`,
    flags.length ? `Dấu hiệu: ${flags.join(", ")}.` : "Không có dấu hiệu bổ sung.",
  ].join(" ");
  const alert = await query(
    `INSERT INTO alerts (title, description, severity, status, source, source_ip, country, country_code, risk_score, confidence, tags, metadata, detected_at)
     VALUES ($1,$2,$3,'open','Medicare Store · Fraud Engine',$4,$5,$6,$7,90,$8,$9,now())
     RETURNING *`,
    [
      title,
      description,
      severity,
      context.ip,
      context.country,
      context.countryCode,
      riskScore,
      ["ecommerce", "fraud", ...flags],
      JSON.stringify({ orderId: order.id, orderNumber: order.order_number, customerEmail: order.shipping_email, ipSource: context.ipSource, items: items.length }),
    ],
  );
  await query(
    `INSERT INTO store_security_events (event_type, severity, ip_address, country, country_code, order_id, risk_score, metadata)
     VALUES ('checkout_fraud_review',$1,$2,$3,$4,$5,$6,$7)`,
    [severity, context.ip, context.country, context.countryCode, order.id, riskScore, JSON.stringify({ flags, ipSource: context.ipSource })],
  );
  const dispatch = await dispatchFraudWorkflow({
    entityId: alert.rows[0].id,
    alertId: alert.rows[0].id,
    orderId: order.id,
    orderNumber: order.order_number,
    riskScore,
    flags,
    ip: context.ip,
    country: context.country,
    countryCode: context.countryCode,
    ipSource: context.ipSource,
    total: money(order.total),
    email: order.shipping_email,
    items: items.map((item) => ({ sku: item.sku, name: item.name, quantity: item.quantity, lineTotal: item.line_total })),
  });
  return { alert: alert.rows[0], dispatch };
};

const orderPayload = async (orderId) => {
  const order = await query("SELECT * FROM store_orders WHERE id = $1", [orderId]);
  if (!order.rows[0]) throw new HttpError(404, "Không tìm thấy đơn hàng");
  const items = await query("SELECT * FROM store_order_items WHERE order_id = $1 ORDER BY created_at", [orderId]);
  const payments = await query("SELECT provider, status, amount, transaction_ref, created_at FROM store_payments WHERE order_id = $1 ORDER BY created_at", [orderId]);
  const payload = {
    ...order.rows[0],
    subtotal: money(order.rows[0].subtotal),
    discount: money(order.rows[0].discount),
    shipping_fee: money(order.rows[0].shipping_fee),
    tax: money(order.rows[0].tax),
    total: money(order.rows[0].total),
    items: items.rows.map((item) => ({ ...item, unit_price: money(item.unit_price), line_total: money(item.line_total) })),
    payments: payments.rows.map((payment) => ({ ...payment, amount: money(payment.amount) })),
  };
  if (payload.payment_method === "sepay") payload.sepay = sepayPaymentPayload(payload);
  return payload;
};

router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination({ ...req.query, limit: req.query.limit || 24 });
    const values = [];
    const conditions = ["status = 'active'"];
    if (req.query.q) {
      values.push(`%${sanitizeText(req.query.q, 120)}%`);
      conditions.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length} OR brand ILIKE $${values.length} OR sku ILIKE $${values.length})`);
    }
    if (req.query.category) {
      values.push(sanitizeText(req.query.category, 80));
      conditions.push(`category = $${values.length}`);
    }
    if (req.query.minPrice) {
      values.push(Number(req.query.minPrice));
      conditions.push(`COALESCE(sale_price, price) >= $${values.length}`);
    }
    if (req.query.maxPrice) {
      values.push(Number(req.query.maxPrice));
      conditions.push(`COALESCE(sale_price, price) <= $${values.length}`);
    }
    const sortMap = { price_asc: "effective_price ASC", price_desc: "effective_price DESC", rating: "rating DESC", newest: "created_at DESC" };
    const sort = sortMap[req.query.sort] || "rating DESC, created_at DESC";
    const where = `WHERE ${conditions.join(" AND ")}`;
    const count = await query(`SELECT count(*)::int AS total FROM store_products ${where}`, values);
    const dataValues = [...values, limit, offset];
    const products = await query(
      `SELECT *, COALESCE(sale_price, price) AS effective_price
       FROM store_products ${where} ORDER BY ${sort} LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`,
      dataValues,
    );
    res.json({
      data: products.rows.map((product) => ({
        ...product,
        price: money(product.price),
        sale_price: product.sale_price === null ? null : money(product.sale_price),
        effective_price: money(product.effective_price),
        rating: numeric(product.rating),
      })),
      pagination: { page, limit, total: count.rows[0].total, pages: Math.ceil(count.rows[0].total / limit) || 1 },
    });
  }),
);

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT category, count(*)::int AS total, min(COALESCE(sale_price, price)) AS from_price
       FROM store_products WHERE status = 'active' GROUP BY category ORDER BY category`,
    );
    res.json({ data: result.rows });
  }),
);

router.get(
  "/products/:slug",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT *, COALESCE(sale_price, price) AS effective_price FROM store_products WHERE (slug = $1 OR id::text = $1) AND status = 'active' LIMIT 1`,
      [req.params.slug],
    );
    if (!result.rows[0]) throw new HttpError(404, "Không tìm thấy sản phẩm");
    const reviews = await query(
      `SELECT r.id, r.rating, r.title, r.body, r.created_at, c.full_name AS customer_name
       FROM store_reviews r LEFT JOIN store_customers c ON c.id = r.customer_id
       WHERE r.product_id = $1 AND r.status = 'published' ORDER BY r.created_at DESC LIMIT 20`,
      [result.rows[0].id],
    );
    res.json({
      data: {
        ...result.rows[0],
        price: money(result.rows[0].price),
        sale_price: result.rows[0].sale_price === null ? null : money(result.rows[0].sale_price),
        effective_price: money(result.rows[0].effective_price),
        rating: numeric(result.rows[0].rating),
        reviews: reviews.rows,
      },
    });
  }),
);

router.get(
  "/products/:id/reviews",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT r.id, r.rating, r.title, r.body, r.created_at, c.full_name AS customer_name
       FROM store_reviews r LEFT JOIN store_customers c ON c.id = r.customer_id
       WHERE r.product_id = $1 AND r.status = 'published' ORDER BY r.created_at DESC LIMIT 50`,
      [req.params.id],
    );
    res.json({ data: result.rows });
  }),
);

router.post(
  "/products/:id/reviews",
  customerAuth,
  asyncHandler(async (req, res) => {
    const rating = Number(req.body?.rating);
    const body = sanitizeText(req.body?.body, 1500);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, "Điểm đánh giá phải từ 1 đến 5");
    if (body.length < 5) throw new HttpError(400, "Nội dung đánh giá quá ngắn");
    const product = await query("SELECT id FROM store_products WHERE id::text = $1 OR slug = $1 LIMIT 1", [req.params.id]);
    if (!product.rows[0]) throw new HttpError(404, "Không tìm thấy sản phẩm");
    const purchased = await query(
      `SELECT 1 FROM store_order_items oi JOIN store_orders o ON o.id = oi.order_id
       WHERE oi.product_id = $1 AND o.customer_id = $2 AND o.payment_status = 'paid' LIMIT 1`,
      [product.rows[0].id, req.customer.id],
    );
    if (!purchased.rows.length) throw new HttpError(403, "Chỉ khách đã mua sản phẩm mới được đánh giá");
    const result = await query(
      `INSERT INTO store_reviews (product_id, customer_id, rating, title, body)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, rating, title, body, created_at`,
      [product.rows[0].id, req.customer.id, rating, sanitizeText(req.body?.title, 180) || null, body],
    );
    await query(
      `UPDATE store_products SET rating = COALESCE((SELECT round(avg(rating)::numeric, 2) FROM store_reviews WHERE product_id = $1 AND status = 'published'), rating) WHERE id = $1`,
      [product.rows[0].id],
    );
    res.status(201).json({ data: result.rows[0] });
  }),
);

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau." },
});

router.post(
  "/auth/register",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const fullName = sanitizeText(req.body?.fullName, 160);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "Email không hợp lệ");
    if (password.length < 8) throw new HttpError(400, "Mật khẩu phải có ít nhất 8 ký tự");
    if (fullName.length < 2) throw new HttpError(400, "Họ tên là bắt buộc");
    const existing = await query("SELECT id FROM store_customers WHERE lower(email) = lower($1)", [email]);
    if (existing.rows.length) throw new HttpError(409, "Email này đã được đăng ký");
    const hash = await bcrypt.hash(password, config.bcryptRounds);
    const result = await query(
      `INSERT INTO store_customers (email, password_hash, full_name, phone, address, city, country, country_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [email, hash, fullName, sanitizeText(req.body?.phone, 40) || null, sanitizeText(req.body?.address, 300) || null, sanitizeText(req.body?.city, 120) || null, sanitizeText(req.body?.country, 80) || "Việt Nam", String(req.body?.countryCode || "VN").toUpperCase().slice(0, 2)],
    );
    res.status(201).json({ token: signCustomerToken(result.rows[0]), customer: publicCustomer(result.rows[0]) });
  }),
);

router.post(
  "/auth/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const result = await query("SELECT * FROM store_customers WHERE lower(email) = lower($1) LIMIT 1", [email]);
    const customer = result.rows[0];
    if (!customer || !(await bcrypt.compare(password, customer.password_hash))) {
      throw new HttpError(401, "Email hoặc mật khẩu không đúng");
    }
    if (customer.status !== "active") throw new HttpError(403, "Tài khoản đã bị khóa");
    await query("UPDATE store_customers SET last_login_at = now() WHERE id = $1", [customer.id]);
    res.json({ token: signCustomerToken(customer), customer: publicCustomer(customer) });
  }),
);

router.get(
  "/auth/me",
  customerAuth,
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM store_customers WHERE id = $1", [req.customer.id]);
    if (!result.rows[0]) throw new HttpError(404, "Không tìm thấy khách hàng");
    res.json({ customer: publicCustomer(result.rows[0]) });
  }),
);

router.post(
  "/cart",
  optionalCustomer,
  asyncHandler(async (req, res) => {
    const token = String(req.body?.token || req.headers["x-cart-token"] || cartToken()).slice(0, 80);
    if (!/^[a-f0-9]{16,80}$/i.test(token)) throw new HttpError(400, "Mã giỏ hàng không hợp lệ");
    const cart = await loadCart(null, token, { create: true });
    if (req.customer && !cart.customer_id) {
      await query("UPDATE store_carts SET customer_id = $2 WHERE id = $1", [cart.id, req.customer.id]);
    }
    res.json({ data: await cartPayload(null, cart.id) });
  }),
);

router.get(
  "/cart/:token",
  asyncHandler(async (req, res) => {
    const cart = await loadCart(null, req.params.token);
    res.json({ data: await cartPayload(null, cart.id) });
  }),
);

router.post(
  "/cart/:token/items",
  asyncHandler(async (req, res) => {
    const quantity = Number(req.body?.quantity || 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new HttpError(400, "Số lượng phải từ 1 đến 99");
    const productId = String(req.body?.productId || "");
    const payload = await withTransaction(async (client) => {
      const cart = await loadCart(client, req.params.token, { create: true });
      if (cart.status !== "open") throw new HttpError(409, "Giỏ hàng đã được thanh toán");
      const product = await client.query("SELECT * FROM store_products WHERE (id::text = $1 OR slug = $1) AND status = 'active' FOR UPDATE", [productId]);
      if (!product.rows[0]) throw new HttpError(404, "Không tìm thấy sản phẩm");
      if (product.rows[0].stock < quantity) throw new HttpError(409, "Sản phẩm không đủ tồn kho");
      const unit = money(product.rows[0].sale_price ?? product.rows[0].price);
      await client.query(
        `INSERT INTO store_cart_items (cart_id, product_id, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = LEAST(store_cart_items.quantity + EXCLUDED.quantity, 99), updated_at = now()`,
        [cart.id, product.rows[0].id, quantity, unit, money(unit * quantity)],
      );
      await recalcCart(client, cart.id, cart.coupon_code);
      return cartPayload(client, cart.id);
    });
    res.status(201).json({ data: payload });
  }),
);

router.patch(
  "/cart/:token/items/:itemId",
  asyncHandler(async (req, res) => {
    const quantity = Number(req.body?.quantity);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) throw new HttpError(400, "Số lượng phải từ 0 đến 99");
    const payload = await withTransaction(async (client) => {
      const cart = await loadCart(client, req.params.token);
      const item = await client.query(
        `SELECT ci.*, p.stock FROM store_cart_items ci JOIN store_products p ON p.id = ci.product_id
         WHERE ci.id = $1 AND ci.cart_id = $2 FOR UPDATE`,
        [req.params.itemId, cart.id],
      );
      if (!item.rows[0]) throw new HttpError(404, "Không tìm thấy sản phẩm trong giỏ");
      if (quantity === 0) {
        await client.query("DELETE FROM store_cart_items WHERE id = $1", [req.params.itemId]);
      } else {
        if (item.rows[0].stock < quantity) throw new HttpError(409, "Sản phẩm không đủ tồn kho");
        await client.query("UPDATE store_cart_items SET quantity = $2, line_total = $3, updated_at = now() WHERE id = $1", [
          req.params.itemId,
          quantity,
          money(numeric(item.rows[0].unit_price) * quantity),
        ]);
      }
      await recalcCart(client, cart.id, cart.coupon_code);
      return cartPayload(client, cart.id);
    });
    res.json({ data: payload });
  }),
);

router.delete(
  "/cart/:token/items/:itemId",
  asyncHandler(async (req, res) => {
    const payload = await withTransaction(async (client) => {
      const cart = await loadCart(client, req.params.token);
      await client.query("DELETE FROM store_cart_items WHERE id = $1 AND cart_id = $2", [req.params.itemId, cart.id]);
      await recalcCart(client, cart.id, cart.coupon_code);
      return cartPayload(client, cart.id);
    });
    res.json({ data: payload });
  }),
);

router.post(
  "/cart/:token/coupon",
  asyncHandler(async (req, res) => {
    const code = sanitizeText(req.body?.code, 40).toUpperCase();
    const payload = await withTransaction(async (client) => {
      const cart = await loadCart(client, req.params.token);
      if (code) {
        await calculateCoupon(client, code, numeric(cart.subtotal));
      }
      await recalcCart(client, cart.id, code || null);
      return cartPayload(client, cart.id);
    });
    res.json({ data: payload });
  }),
);

router.post(
  "/checkout",
  optionalCustomer,
  asyncHandler(async (req, res) => {
    const context = clientContext(req);
    const cartTokenValue = String(req.body?.cartToken || req.headers["x-cart-token"] || "");
    if (!cartTokenValue) throw new HttpError(400, "Thiếu mã giỏ hàng");
    const shipping = req.body?.shipping || {};
    const paymentMethod = String(req.body?.paymentMethod || "cod").toLowerCase();
    if (!PAYMENT_METHODS.has(paymentMethod)) throw new HttpError(400, "Phương thức thanh toán không hợp lệ");
    const required = ["name", "email", "phone", "address", "city"];
    for (const field of required) {
      if (!sanitizeText(shipping[field], 300)) throw new HttpError(400, `Thiếu thông tin giao hàng: ${field}`);
    }
    const shippingEmail = String(shipping.email).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(shippingEmail)) throw new HttpError(400, "Email giao hàng không hợp lệ");
    const shippingName = sanitizeText(shipping.name, 160);
    const shippingPhone = sanitizeText(shipping.phone, 40);
    const shippingAddress = sanitizeText(shipping.address, 300);
    const shippingCity = sanitizeText(shipping.city, 120);
    const shippingCountryCode = String(shipping.countryCode || "VN").toUpperCase().slice(0, 2);
    const shippingCountry = sanitizeText(shipping.country, 80) || COUNTRY_NAMES[shippingCountryCode] || "Việt Nam";

    const result = await withTransaction(async (client) => {
      const cart = await loadCart(client, cartTokenValue);
      if (cart.status !== "open") throw new HttpError(409, "Giỏ hàng đã được sử dụng");
      const calculated = await recalcCart(client, cart.id, cart.coupon_code);
      if (!calculated.items.length) throw new HttpError(400, "Giỏ hàng đang trống");
      const items = calculated.items;
      const shippingFee = calculated.subtotal >= 500_000 ? 0 : 30_000;
      const tax = money(calculated.total * 0.08);
      const total = money(calculated.total + shippingFee + tax);
      const recentOrders = await client.query(
        `SELECT count(*)::int AS count FROM store_orders
         WHERE created_at > now() - interval '${ORDER_VELOCITY_WINDOW}'
           AND (customer_id = $1 OR lower(shipping_email) = lower($2) OR shipping_phone = $3)`,
        [req.customer?.id || null, shippingEmail, shippingPhone],
      );
      let customerCreatedAt = null;
      if (req.customer?.id) {
        const customer = await client.query("SELECT created_at FROM store_customers WHERE id = $1", [req.customer.id]);
        customerCreatedAt = customer.rows[0]?.created_at || null;
      }
      const risk = evaluateRisk({
        total,
        paymentMethod,
        context,
        shippingCountryCode,
        items,
        customer: req.customer,
        phone: shippingPhone,
        address: shippingAddress,
        recentOrderCount: Number(recentOrders.rows[0]?.count || 0),
        customerCreatedAt,
      });

      for (const item of items) {
        const stock = await client.query(
          "UPDATE store_products SET stock = stock - $2, updated_at = now() WHERE id = $1 AND stock >= $2 RETURNING id",
          [item.product_id, item.quantity],
        );
        if (!stock.rows.length) throw new HttpError(409, `Sản phẩm ${item.name} không đủ tồn kho`);
      }

      const orderNumber = `MG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomInt(1000, 9999)}`;
      const order = await client.query(
        `INSERT INTO store_orders
          (order_number, customer_id, cart_id, status, payment_status, payment_method, subtotal, discount, shipping_fee, tax, total, currency,
           shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, shipping_country, shipping_country_code,
           notes, risk_score, fraud_flags, ip_address, ip_country, ip_country_code, ip_source, user_agent, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'VND',$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
         RETURNING *`,
        [
          orderNumber,
          req.customer?.id || null,
          cart.id,
          risk.riskScore >= FRAUD_RISK_THRESHOLD ? "on_hold" : "pending",
          paymentMethod === "card" && risk.riskScore < FRAUD_RISK_THRESHOLD ? "paid" : "unpaid",
          paymentMethod,
          calculated.subtotal,
          calculated.discount,
          shippingFee,
          tax,
          total,
          shippingName,
          shippingEmail,
          shippingPhone,
          shippingAddress,
          shippingCity,
          shippingCountry,
          shippingCountryCode,
          sanitizeText(req.body?.notes, 500) || null,
          risk.riskScore,
          risk.flags,
          context.ip,
          context.country,
          context.countryCode,
          context.ipSource,
          context.userAgent,
          JSON.stringify({ cartToken: cart.token, paymentMethod, ip: context }),
        ],
      );

      for (const item of items) {
        await client.query(
          `INSERT INTO store_order_items (order_id, product_id, sku, name, quantity, unit_price, line_total, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [order.rows[0].id, item.product_id, item.sku, item.name, item.quantity, money(item.sale_price ?? item.price), money(numeric(item.sale_price ?? item.price) * item.quantity), item.image_url],
        );
      }

      await client.query(
        `INSERT INTO store_payments (order_id, provider, status, amount, transaction_ref, metadata)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          order.rows[0].id,
          paymentMethod,
          order.rows[0].payment_status === "paid" ? "captured" : "pending",
          total,
          paymentMethod === "card" ? `SIM-${crypto.randomUUID().slice(0, 12).toUpperCase()}` : paymentMethod === "sepay" ? orderNumber : null,
          JSON.stringify({ simulated: true, riskScore: risk.riskScore }),
        ],
      );

      if (cart.coupon_code) {
        await client.query("UPDATE store_coupons SET used_count = used_count + 1 WHERE upper(code) = upper($1)", [cart.coupon_code]);
      }
      await client.query("UPDATE store_carts SET status = 'converted', customer_id = COALESCE($2, customer_id), updated_at = now() WHERE id = $1", [cart.id, req.customer?.id || null]);
      return { order: order.rows[0], items, risk, cart };
    });

    let fraud = null;
    if (result.risk.riskScore >= FRAUD_RISK_THRESHOLD) {
      fraud = await raiseFraudAlert({ order: result.order, context, riskScore: result.risk.riskScore, flags: result.risk.flags, items: result.items });
    }

    await recordActivity({
      eventType: "ecommerce",
      req,
      resource: "store_orders",
      resourceId: result.order.id,
      action: "checkout",
      message: `Đơn ${result.order.order_number} được tạo với rủi ro ${result.risk.riskScore}/100 từ IP ${context.ip}`,
      metadata: { orderNumber: result.order.order_number, riskScore: result.risk.riskScore, flags: result.risk.flags, ipSource: context.ipSource },
    });

    res.status(201).json({
      data: {
        order: await orderPayload(result.order.id),
        risk: result.risk,
        fraud: fraud ? { alertId: fraud.alert.id, dispatch: fraud.dispatch } : null,
        client: context,
        message: result.risk.riskScore >= FRAUD_RISK_THRESHOLD
          ? "Đơn hàng đã được giữ để kiểm tra gian lận. SOC đã nhận cảnh báo và n8n đang xử lý."
          : "Đặt hàng thành công. Cảm ơn bạn đã mua sắm tại Medicare Store.",
      },
    });
  }),
);

router.get(
  "/orders",
  customerAuth,
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, order_number, status, payment_status, payment_method, total, currency, shipping_city, shipping_country, risk_score, created_at
       FROM store_orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.customer.id],
    );
    res.json({ data: result.rows.map((order) => ({ ...order, total: money(order.total) })) });
  }),
);

router.get(
  "/orders/:id",
  optionalCustomer,
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM store_orders WHERE id::text = $1 OR order_number = $1 LIMIT 1", [req.params.id]);
    const order = result.rows[0];
    if (!order) throw new HttpError(404, "Không tìm thấy đơn hàng");
    const email = String(req.query.email || "").toLowerCase();
    const authorized = req.customer && order.customer_id === req.customer.id;
    const guestAuthorized = email && email === order.shipping_email.toLowerCase();
    if (!authorized && !guestAuthorized) throw new HttpError(403, "Bạn không có quyền xem đơn hàng này");
    res.json({ data: await orderPayload(order.id) });
  }),
);

router.post(
  "/orders/:id/cancel",
  customerAuth,
  asyncHandler(async (req, res) => {
    const result = await query("SELECT * FROM store_orders WHERE id::text = $1 AND customer_id = $2 LIMIT 1", [req.params.id, req.customer.id]);
    if (!result.rows[0]) throw new HttpError(404, "Không tìm thấy đơn hàng");
    if (!["pending", "confirmed", "on_hold"].includes(result.rows[0].status)) throw new HttpError(409, "Đơn hàng không thể hủy ở trạng thái hiện tại");
    if (result.rows[0].payment_status === "paid") throw new HttpError(409, "Đơn đã thanh toán, vui lòng liên hệ hỗ trợ hoàn tiền");
    const updated = await query("UPDATE store_orders SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING *", [result.rows[0].id]);
    const items = await query("SELECT product_id, quantity FROM store_order_items WHERE order_id = $1", [result.rows[0].id]);
    for (const item of items.rows) {
      if (item.product_id) await query("UPDATE store_products SET stock = stock + $2 WHERE id = $1", [item.product_id, item.quantity]);
    }
    res.json({ data: await orderPayload(updated.rows[0].id) });
  }),
);

router.get(
  "/admin/stats",
  authenticate,
  requirePermission("write"),
  asyncHandler(async (_req, res) => {
    const [totals, revenue, topProducts, recentOrders, fraudEvents] = await Promise.all([
      query(`SELECT
        (SELECT count(*)::int FROM store_products WHERE status = 'active') AS products,
        (SELECT count(*)::int FROM store_orders) AS orders,
        (SELECT count(*)::int FROM store_orders WHERE status IN ('pending','confirmed','processing','on_hold')) AS open_orders,
        (SELECT count(*)::int FROM store_customers) AS customers`),
      query(`SELECT COALESCE(sum(total),0)::numeric AS revenue, count(*)::int AS paid_orders FROM store_orders WHERE payment_status = 'paid'`),
      query(`SELECT oi.sku, oi.name, sum(oi.quantity)::int AS quantity, sum(oi.line_total)::numeric AS revenue
             FROM store_order_items oi JOIN store_orders o ON o.id = oi.order_id
             GROUP BY oi.sku, oi.name ORDER BY revenue DESC LIMIT 5`),
      query(`SELECT id, order_number, shipping_name, total, status, payment_status, risk_score, ip_address, created_at
             FROM store_orders ORDER BY created_at DESC LIMIT 10`),
      query(`SELECT id, event_type, severity, ip_address, country, risk_score, created_at
             FROM store_security_events ORDER BY created_at DESC LIMIT 10`),
    ]);
    res.json({
      data: {
        ...totals.rows[0],
        openOrders: totals.rows[0].open_orders,
        revenue: money(revenue.rows[0].revenue),
        paidOrders: revenue.rows[0].paid_orders,
        topProducts: topProducts.rows.map((row) => ({ ...row, revenue: money(row.revenue) })),
        recentOrders: recentOrders.rows.map((row) => ({ ...row, total: money(row.total) })),
        fraudEvents: fraudEvents.rows,
      },
    });
  }),
);

router.get(
  "/admin/orders",
  authenticate,
  requirePermission("read"),
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = parsePagination(req.query);
    const values = [];
    const conditions = [];
    if (req.query.status) {
      values.push(String(req.query.status));
      conditions.push(`status = $${values.length}`);
    }
    if (req.query.q) {
      values.push(`%${sanitizeText(req.query.q, 120)}%`);
      conditions.push(`(order_number ILIKE $${values.length} OR shipping_email ILIKE $${values.length} OR shipping_name ILIKE $${values.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const count = await query(`SELECT count(*)::int AS total FROM store_orders ${where}`, values);
    const dataValues = [...values, limit, offset];
    const orders = await query(
      `SELECT id, order_number, shipping_name, shipping_email, total, status, payment_status, risk_score, ip_address, ip_country, created_at
       FROM store_orders ${where} ORDER BY created_at DESC LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`,
      dataValues,
    );
    res.json({
      data: orders.rows.map((order) => ({ ...order, total: money(order.total) })),
      pagination: { page, limit, total: count.rows[0].total, pages: Math.ceil(count.rows[0].total / limit) || 1 },
    });
  }),
);

router.patch(
  "/admin/orders/:id",
  authenticate,
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const status = req.body?.status ? String(req.body.status) : null;
    const paymentStatus = req.body?.paymentStatus ? String(req.body.paymentStatus) : null;
    if (status && !ORDER_STATUSES.has(status)) throw new HttpError(400, "Trạng thái đơn hàng không hợp lệ");
    if (paymentStatus && !PAYMENT_STATUSES.has(paymentStatus)) throw new HttpError(400, "Trạng thái thanh toán không hợp lệ");
    if (!status && !paymentStatus) throw new HttpError(400, "Không có thay đổi nào");
    const result = await query(
      `UPDATE store_orders SET status = COALESCE($2, status), payment_status = COALESCE($3, payment_status), updated_at = now()
       WHERE id::text = $1 RETURNING *`,
      [req.params.id, status, paymentStatus],
    );
    if (!result.rows[0]) throw new HttpError(404, "Không tìm thấy đơn hàng");
    if (paymentStatus) {
      await query("UPDATE store_payments SET status = $2, updated_at = now() WHERE order_id = $1", [result.rows[0].id, paymentStatus === "paid" ? "captured" : paymentStatus]);
    }
    await recordAudit({ req, action: "update", resource: "store_orders", resourceId: result.rows[0].id, details: { status, paymentStatus } });
    res.json({ data: await orderPayload(result.rows[0].id) });
  }),
);

router.get(
  "/admin/security-events",
  authenticate,
  requirePermission("read"),
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT e.*, o.order_number FROM store_security_events e LEFT JOIN store_orders o ON o.id = e.order_id ORDER BY e.created_at DESC LIMIT 100`,
    );
    res.json({ data: result.rows });
  }),
);

router.post(
  "/admin/products",
  authenticate,
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const name = sanitizeText(req.body?.name, 200);
    const slug = sanitizeText(req.body?.slug || name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), 180);
    if (!name || !slug) throw new HttpError(400, "Tên và slug sản phẩm là bắt buộc");
    const result = await query(
      `INSERT INTO store_products (sku, slug, name, category, brand, description, price, sale_price, stock, image_url, tags, status, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        sanitizeText(req.body?.sku, 64) || `SKU-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
        slug,
        name,
        sanitizeText(req.body?.category, 80) || "Thiết bị y tế",
        sanitizeText(req.body?.brand, 120) || null,
        sanitizeText(req.body?.description, 3000) || null,
        money(req.body?.price),
        req.body?.salePrice === undefined || req.body?.salePrice === null || req.body?.salePrice === "" ? null : money(req.body.salePrice),
        Math.max(0, Number.parseInt(req.body?.stock, 10) || 0),
        sanitizeText(req.body?.imageUrl, 500) || null,
        Array.isArray(req.body?.tags) ? req.body.tags.map((tag) => sanitizeText(tag, 40)).slice(0, 10) : [],
        ["active", "draft", "archived"].includes(req.body?.status) ? req.body.status : "active",
        JSON.stringify({ createdBy: req.user.email }),
      ],
    );
    res.status(201).json({ data: result.rows[0] });
  }),
);

router.patch(
  "/admin/products/:id",
  authenticate,
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const allowed = {
      name: "name", category: "category", brand: "brand", description: "description", price: "price",
      salePrice: "sale_price", stock: "stock", imageUrl: "image_url", status: "status",
    };
    const fields = [];
    const values = [];
    for (const [input, column] of Object.entries(allowed)) {
      if (req.body?.[input] !== undefined) {
        values.push(["price", "sale_price"].includes(column) ? money(req.body[input]) : sanitizeText(req.body[input], 3000));
        fields.push(`${column} = $${values.length}`);
      }
    }
    if (!fields.length) throw new HttpError(400, "Không có trường hợp lệ nào được cung cấp");
    values.push(req.params.id);
    const result = await query(`UPDATE store_products SET ${fields.join(", ")}, updated_at = now() WHERE id::text = $${values.length} RETURNING *`, values);
    if (!result.rows[0]) throw new HttpError(404, "Không tìm thấy sản phẩm");
    res.json({ data: result.rows[0] });
  }),
);

router.delete(
  "/admin/products/:id",
  authenticate,
  requirePermission("write"),
  asyncHandler(async (req, res) => {
    const result = await query("UPDATE store_products SET status = 'archived', updated_at = now() WHERE id::text = $1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) throw new HttpError(404, "Không tìm thấy sản phẩm");
    res.json({ deleted: true, id: result.rows[0].id });
  }),
);

router.post(
  "/payments/sepay/webhook",
  asyncHandler(async (req, res) => {
    const cfg = sepayConfig();
    const auth = String(req.headers.authorization || "");
    if (cfg.webhookSecret && !auth.includes(cfg.webhookSecret)) {
      throw new HttpError(401, "Webhook SePay không hợp lệ");
    }
    const body = req.body || {};
    const content = String(body.content || body.description || body.transferContent || "");
    const amount = Number(body.transferAmount || body.amount || 0);
    const match = content.match(/MG-\d{8}-\d{4}/);
    if (!match) {
      res.json({ ok: true, matched: false, reason: "order_number_not_found" });
      return;
    }
    const orderNumber = match[0];
    const orderResult = await query("SELECT * FROM store_orders WHERE order_number = $1", [orderNumber]);
    const order = orderResult.rows[0];
    if (!order) {
      res.json({ ok: true, matched: false, reason: "order_not_found" });
      return;
    }
    if (amount && Math.abs(amount - Number(order.total)) > 1) {
      await query(
        "INSERT INTO store_security_events (event_type, severity, ip_address, country, country_code, order_id, risk_score, metadata) VALUES ('payment_mismatch','high',$1,$2,$3,$4,$5,$6)",
        [req.ip || "unknown", "Việt Nam", "VN", order.id, 70, JSON.stringify({ amount, expected: order.total, content })],
      );
      res.status(400).json({ ok: false, reason: "amount_mismatch" });
      return;
    }
    await query(
      "UPDATE store_orders SET payment_status = 'paid', status = CASE WHEN status = 'on_hold' THEN status ELSE 'processing' END, updated_at = now() WHERE id = $1",
      [order.id],
    );
    await query(
      "UPDATE store_payments SET status = 'captured', transaction_ref = COALESCE(transaction_ref, $2), metadata = metadata || $3::jsonb, updated_at = now() WHERE order_id = $1",
      [order.id, String(body.referenceCode || body.id || ""), JSON.stringify({ sepay: body })],
    );
    res.json({ ok: true, matched: true, orderId: order.id, orderNumber });
  }),
);

module.exports = router;

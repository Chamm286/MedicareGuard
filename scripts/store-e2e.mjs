import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.resolve("docs/screenshots");
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error" && !/favicon|React DevTools/.test(message.text())) errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

try {
  await page.goto(`${BASE}/store`, { waitUntil: "networkidle" });
  await page.waitForSelector('a[href^="/store/product/"]', { timeout: 15000 });
  const productCount = await page.locator('a[href^="/store/product/"]').count();
  if (productCount < 6) throw new Error(`Only ${productCount} products rendered`);
  await page.screenshot({ path: path.join(OUT, "store-home.png"), fullPage: true });

  await page.locator('button[aria-label^="Thêm"]').first().click();
  await sleep(1200);
  const cartBadge = await page.locator('a[href="/store/cart"] span').first().textContent();
  if (!cartBadge || Number(cartBadge) < 1) throw new Error("Cart badge did not update");

  await page.goto(`${BASE}/store/cart`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Tóm tắt đơn hàng", { timeout: 10000 });
  await page.fill('input[placeholder="MEDICARE10"]', "MEDICARE10");
  await page.click("text=Áp dụng");
  await sleep(1000);
  const cartText = await page.locator("body").innerText();
  if (!cartText.includes("Đang áp dụng: MEDICARE10")) throw new Error("Coupon was not applied in UI");
  await page.screenshot({ path: path.join(OUT, "store-cart.png"), fullPage: true });

  await page.goto(`${BASE}/store/account`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="ban@example.com"]', "an.nguyen@example.com");
  await page.fill('input[placeholder="Tối thiểu 8 ký tự"]', "Customer@123");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Tài khoản Medicare Store", { timeout: 15000 });

  await page.goto(`${BASE}/store/checkout`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="Nguyễn Văn An"]', "Nguyễn Văn An");
  await page.fill('input[placeholder="ban@example.com"]', `store-e2e-${Date.now()}@example.com`);
  await page.fill('input[placeholder="0901 234 567"]', "0901234567");
  await page.fill('input[placeholder="TP. Hồ Chí Minh"]', "TP. Hồ Chí Minh");
  await page.fill('input[placeholder="Số nhà, đường, phường, quận"]', "12 Nguyễn Huệ, Quận 1");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Đặt hàng thành công", { timeout: 15000 });
  const successText = await page.locator("body").innerText();
  if (!/MÃ ĐƠN HÀNG/i.test(successText)) throw new Error("Checkout success screen missing order number");
  const clearedBadge = await page.locator('a[href="/store/cart"] span').count();
  if (clearedBadge > 0) throw new Error("Cart badge was not cleared after checkout");
  await page.screenshot({ path: path.join(OUT, "store-checkout-success.png"), fullPage: true });

  await page.goto(`${BASE}/store/account`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Tài khoản Medicare Store", { timeout: 15000 });
  await page.screenshot({ path: path.join(OUT, "store-account.png"), fullPage: true });

  const admin = await context.newPage();
  await admin.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await admin.fill("#email", "admin@medicareguard.io");
  await admin.fill("#password", "Admin@123");
  await admin.click("button[type=submit]");
  await admin.waitForURL("**/dashboard", { timeout: 15000 });
  await admin.goto(`${BASE}/store/admin`, { waitUntil: "networkidle" });
  await admin.waitForSelector("text=Điều hành Medicare Store", { timeout: 15000 });
  const adminText = await admin.locator("body").innerText();
  if (!adminText.includes("Sự kiện gian lận")) throw new Error("Store admin dashboard did not render fraud events");
  await admin.screenshot({ path: path.join(OUT, "store-admin.png"), fullPage: true });

  console.log(`Store E2E passed: ${productCount} products, cart badge ${cartBadge}, checkout success, customer login, admin dashboard.`);
} finally {
  await browser.close();
}
if (errors.length) {
  console.error("Console errors:", errors);
  process.exit(1);
}

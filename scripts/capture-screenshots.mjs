import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const API = process.env.API_URL || "http://localhost:4000/api";
const OUT = path.resolve(process.env.SCREENSHOT_DIR || "docs/screenshots");
const EMAIL = process.env.MG_ADMIN_EMAIL || "admin@medicareguard.io";
const PASSWORD = process.env.MG_ADMIN_PASSWORD || "Admin@123";
const VIEWPORT = { width: 1440, height: 900 };

fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error" && !/favicon|Download the React DevTools/.test(message.text())) {
    errors.push(message.text());
  }
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

try {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, "login.png") });

  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await sleep(2200);

  const token = await page.evaluate(() => localStorage.getItem("mg_token"));
  const get = async (endpoint) => {
    const response = await fetch(`${API}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
    return response.json();
  };

  const alertId = (await get("/alerts?limit=1")).data[0].id;
  const threatId = (await get("/threats?limit=1")).data[0].id;
  const assetId = (await get("/assets?limit=1")).data[0].id;
  const incidentId = (await get("/incidents?limit=1")).data[0].id;
  const vulnId = (await get("/vulnerabilities?limit=1")).data[0].id;

  const pages = [
    ["/dashboard", "dashboard"],
    ["/alerts", "alerts"],
    [`/alerts/${alertId}`, "alert-detail"],
    ["/incidents", "incidents"],
    [`/incidents/${incidentId}`, "incident-detail"],
    ["/threats", "threats"],
    [`/threats/${threatId}`, "threat-detail"],
    ["/threat-intel", "threat-intel"],
    ["/vulnerabilities", "vulnerabilities"],
    [`/vulnerabilities/${vulnId}`, "vulnerability-detail"],
    ["/assets", "assets"],
    [`/assets/${assetId}`, "asset-detail"],
    ["/firewall", "firewall"],
    ["/playbooks", "playbooks"],
    ["/automation", "automation"],
    ["/reports", "reports"],
    ["/logs", "logs"],
    ["/users", "users"],
    ["/settings", "settings"],
  ];

  for (const [route, name] of pages) {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await sleep(1900);
    const text = await page.locator("body").innerText();
    if (/Unable to load data|Application error|This page could not be found/.test(text)) {
      errors.push(`${route}: error state visible`);
    }
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log(`captured ${name}`);
  }

  await page.goto(`${BASE}/ai`, { waitUntil: "domcontentloaded" });
  await sleep(2200);
  const conversation = page.locator('div[role="button"]').first();
  if (await conversation.count()) {
    await conversation.click();
    await sleep(1500);
  }
  await page.screenshot({ path: path.join(OUT, "ai.png") });
  console.log("captured ai");

  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await sleep(2200);
  await page.screenshot({ path: path.join(OUT, "dashboard-full.png"), fullPage: true });
  console.log("captured dashboard-full");

  if (errors.length) {
    console.log("\nIssues:");
    [...new Set(errors)].forEach((error) => console.log(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log(`\nNo console or page errors. Screenshots written to ${OUT}`);
  }
} finally {
  await browser.close();
}

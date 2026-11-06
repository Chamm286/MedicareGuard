#!/usr/bin/env python3
"""Simulate a Vietnamese customer with fraud-like behaviour.

The script registers a brand-new account, places one high-value order and
four rapid follow-up orders from a Vietnamese IP. It requires the API on
http://localhost:4000/api by default (override with MG_API_URL).
"""
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request

API = (os.environ.get("MG_API_URL") or "http://localhost:4000/api").rstrip("/")
STORE = API + "/store"
VN_IP = os.environ.get("FRAUD_TEST_IP", "113.161.1.10")
HEADERS = {
    "Content-Type": "application/json",
    "CF-Connecting-IP": VN_IP,
    "CF-IPCountry": "VN",
    "User-Agent": "MedicareGuard-Fraud-Test/1.0",
}
EMAIL = f"fraud-demo-{int(time.time())}@example.com"
PHONE = "0123456789"  # 10 digits but an invalid Vietnamese prefix
ADDRESS = "HN"        # too short
CUSTOMER_TOKEN = None


def call(path, method="GET", body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = dict(HEADERS)
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status, json.loads(response.read().decode() or "{}")
    except urllib.error.HTTPError as error:
        text = error.read().decode(errors="replace")
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            payload = {"error": text}
        return error.code, payload


def register():
    global CUSTOMER_TOKEN
    status, payload = call("/store/auth/register", "POST", {
        "email": EMAIL,
        "password": "Fraud@12345",
        "fullName": "Nguyễn Văn Gian",
        "phone": PHONE,
        "address": ADDRESS,
        "city": "Hà Nội",
        "country": "Việt Nam",
        "countryCode": "VN",
    })
    if status not in (200, 201):
        raise RuntimeError(f"Register failed: HTTP {status} {payload}")
    CUSTOMER_TOKEN = payload.get("token")
    print(f"  new account: {EMAIL}")


def create_cart():
    status, payload = call("/store/cart", "POST", {}, CUSTOMER_TOKEN)
    if status not in (200, 201):
        raise RuntimeError(f"Create cart failed: HTTP {status} {payload}")
    return payload["data"]["token"]


def products():
    status, payload = call("/store/products?limit=100")
    if status != 200:
        raise RuntimeError(f"Product list failed: HTTP {status} {payload}")
    return [p for p in payload.get("data", []) if p.get("status") == "active" and int(p.get("stock") or 0) > 0]


def add_item(cart, product_id, quantity):
    status, payload = call(f"/store/cart/{cart}/items", "POST", {
        "productId": product_id,
        "quantity": quantity,
    })
    if status not in (200, 201):
        raise RuntimeError(f"Add item failed: HTTP {status} {payload}")
    return payload["data"]


def build_high_value_cart(target=20_000_000):
    cart = create_cart()
    remaining = target
    for product in sorted(products(), key=lambda p: (int(p.get("stock") or 0), float(p.get("effective_price") or 0)), reverse=True):
        if remaining <= 0:
            break
        price = float(product.get("effective_price") or 0)
        stock = int(product.get("stock") or 0)
        if price <= 0 or stock <= 0:
            continue
        quantity = min(stock, 99, math.ceil(remaining / price))
        if quantity <= 0:
            continue
        before = remaining
        data = add_item(cart, product["id"], quantity)
        remaining = target - float(data.get("total") or 0)
        if remaining < before:
            print(f"  +{quantity} x {product['name']} ({price:,.0f} đ)")
    total = float(call(f"/store/cart/{cart}")[1]["data"]["total"])
    if total < target:
        raise RuntimeError(f"Cart total {total:,.0f} đ is below target {target:,.0f} đ; reset stock and retry")
    return cart, total


def checkout(cart):
    status, payload = call("/store/checkout", "POST", {
        "cartToken": cart,
        "paymentMethod": "cod",
        "shipping": {
            "name": "Nguyễn Văn Gian",
            "email": EMAIL,
            "phone": PHONE,
            "address": ADDRESS,
            "city": "Hà Nội",
            "country": "Việt Nam",
            "countryCode": "VN",
        },
    }, CUSTOMER_TOKEN)
    if status != 201:
        raise RuntimeError(f"Checkout failed: HTTP {status} {payload}")
    return payload["data"]


def main():
    print("MedicareGuard · Vietnamese fraud simulation")
    print(f"API {API} · IP {VN_IP} (VN)")
    register()

    high_cart, high_total = build_high_value_cart()
    print(f"  high-value cart: {high_total:,.0f} đ")
    first = checkout(high_cart)
    results = [first]
    print_order(1, first)

    cheapest = min(products(), key=lambda p: float(p.get("effective_price") or 0))
    for index in range(2, 6):
        cart = create_cart()
        add_item(cart, cheapest["id"], 1)
        result = checkout(cart)
        results.append(result)
        print_order(index, result)

    risky = [r for r in results if r["risk"]["riskScore"] >= 50]
    dispatched = [r for r in risky if (r.get("fraud") or {}).get("dispatch", {}).get("dispatched")]
    print()
    print(f"Orders with risk >= 50: {len(risky)}")
    print(f"Fraud dispatches accepted by n8n: {len(dispatched)}")
    if not risky or not dispatched:
        print("FAIL: expected at least one risky order and one n8n dispatch")
        return 1
    print("PASS: Vietnamese fraud scenario reached the >= 50 threshold and dispatched to n8n")
    return 0


def print_order(index, data):
    order = data["order"]
    risk = data["risk"]
    fraud = data.get("fraud") or {}
    dispatch = (fraud.get("dispatch") or {}).get("status", "not-dispatched")
    print(
        f"  order {index}: {order['order_number']} · {order['status']} · "
        f"risk {risk['riskScore']}/100 · flags {', '.join(risk['flags']) or '-'} · n8n {dispatch}"
    )


if __name__ == "__main__":
    sys.exit(main())

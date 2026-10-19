require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-session-secret";

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "orders.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    business_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    budget TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const sessions = new Map();

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").map(s => s.trim()).filter(Boolean).map(s => {
    const i = s.indexOf("="); return [s.slice(0, i), decodeURIComponent(s.slice(i + 1))];
  }));
}
function adminOnly(req, res, next) {
  const token = parseCookies(req).wsh_admin;
  const record = token && sessions.get(token);
  if (!record || record.expires < Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: "Please log in again." });
  }
  next();
}
app.get("/api/health", (req, res) => res.json({ ok: true, app: "Webskill India House" }));

app.post("/api/orders", orderLimiter, (req, res) => {
  const { customerName, businessName, email, phone, service, budget, details, website } = req.body || {};
  // Honeypot field for basic bot filtering
  if (website) return res.status(201).json({ ok: true, message: "Order request received." });
  const clean = v => typeof v === "string" ? v.trim() : "";
  const fields = {
    customerName: clean(customerName), businessName: clean(businessName), email: clean(email),
    phone: clean(phone), service: clean(service), budget: clean(budget), details: clean(details)
  };
  if (Object.values(fields).some(v => !v)) return res.status(400).json({ error: "Please complete all required fields." });
  if (fields.customerName.length > 100 || fields.businessName.length > 120 || fields.email.length > 180 ||
      fields.phone.length > 30 || fields.details.length > 2000) {
    return res.status(400).json({ error: "One or more fields are too long." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return res.status(400).json({ error: "Please enter a valid email address." });
  const allowedServices = ["Business Website", "E-commerce Website", "Landing Page", "Portfolio Website", "Website Redesign", "Not Sure Yet"];
  const allowedBudgets = ["Under ₹3,000", "₹3,000–₹5,000", "₹5,000–₹10,000", "₹10,000+", "Need guidance"];
  if (!allowedServices.includes(fields.service) || !allowedBudgets.includes(fields.budget)) {
    return res.status(400).json({ error: "Please select a valid service and budget." });
  }
  const result = db.prepare(`INSERT INTO orders
    (customer_name, business_name, email, phone, service, budget, details)
    VALUES (@customerName, @businessName, @email, @phone, @service, @budget, @details)`).run(fields);
  res.status(201).json({ ok: true, orderId: result.lastInsertRowid, message: "Thanks! Your request has been received." });
});

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const password = (req.body || {}).password || "";
  if (!safeEqual(password, ADMIN_PASSWORD)) return res.status(401).json({ error: "Incorrect password." });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { expires: Date.now() + 8 * 60 * 60 * 1000 });
  res.setHeader("Set-Cookie", `wsh_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  res.json({ ok: true });
});
app.post("/api/admin/logout", adminOnly, (req, res) => {
  const token = parseCookies(req).wsh_admin;
  sessions.delete(token);
  res.setHeader("Set-Cookie", "wsh_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
  res.json({ ok: true });
});
app.get("/api/admin/orders", adminOnly, (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 500").all();
  res.json(rows);
});
app.patch("/api/admin/orders/:id", adminOnly, (req, res) => {
  const id = Number(req.params.id);
  const status = (req.body || {}).status;
  if (!Number.isInteger(id) || !["New", "Contacted", "In Progress", "Completed", "Cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid order or status." });
  }
  const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
  if (!result.changes) return res.status(404).json({ error: "Order not found." });
  res.json({ ok: true });
});

app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Webskill India House running at http://localhost:${PORT}`));

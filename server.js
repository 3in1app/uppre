require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.KICK_GOLD_API_KEY;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const API_URL = "https://locket.jayteam.click/api/v1/kick-gold";
const API_REVOKE_URL = "https://locket.jayteam.click/api/v1/users/status";
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "kick-customers.json");
const ACCESS_KEYS_FILE = path.join(DATA_DIR, "kick-access-keys.json");
const CUSTOMER_USERS_FILE = path.join(DATA_DIR, "customer-accounts.json");
const CUSTOMER_SESSIONS_FILE = path.join(DATA_DIR, "customer-sessions.json");
const WIDGET_FRAME_FILE = path.join(DATA_DIR, "widget-frame.json");
const MUSIC_CONFIG_FILE = path.join(DATA_DIR, "music-config.json");
const CUSTOM_WIDGET_FRAMES_FILE = path.join(DATA_DIR, "custom-widget-frames.json");
const CUSTOM_WIDGET_FRAMES_DIR = path.join(__dirname, "public", "uploads", "widget-frames");
const MAX_CUSTOM_FRAME_BYTES = 2 * 1024 * 1024;
const WIDGET_FRAME_PRESETS = Object.freeze({
  gold: { id: "gold", name: "Gold Luxe", description: "Khung vàng cao cấp", accent: "#f6d783" },
  rose: { id: "rose", name: "Rose Dream", description: "Khung hồng pastel", accent: "#fb8bb8" },
  ocean: { id: "ocean", name: "Ocean Blue", description: "Khung xanh đại dương", accent: "#67e8f9" },
  violet: { id: "violet", name: "Violet Glow", description: "Khung tím phát sáng", accent: "#c4b5fd" },
  neon: { id: "neon", name: "Neon Pop", description: "Khung neon nổi bật", accent: "#86efac" }
});
const CUSTOMER_SESSION_COOKIE = "kick_customer_session";
const CUSTOMER_SESSION_DAYS = 7;
const ADMIN_SESSION_MINUTES = 120;
const adminSessions = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(CUSTOM_WIDGET_FRAMES_DIR, { recursive: true });
// Keep private data files unreadable by other OS users on Unix-like hosts.
if (process.platform !== "win32") {
  try { fs.chmodSync(DATA_DIR, 0o700); } catch {}
  for (const file of [DB_FILE, ACCESS_KEYS_FILE, CUSTOMER_USERS_FILE, CUSTOMER_SESSIONS_FILE, WIDGET_FRAME_FILE, CUSTOM_WIDGET_FRAMES_FILE, path.join(DATA_DIR, "admin-audit.log")]) {
    try { if (fs.existsSync(file)) fs.chmodSync(file, 0o600); } catch {}
  }
}
if (!fs.existsSync(CUSTOM_WIDGET_FRAMES_FILE)) fs.writeFileSync(CUSTOM_WIDGET_FRAMES_FILE, JSON.stringify({ frames: [] }, null, 2), { mode: 0o600 });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ customers: [] }, null, 2));
if (!fs.existsSync(ACCESS_KEYS_FILE)) fs.writeFileSync(ACCESS_KEYS_FILE, JSON.stringify({ keys: [] }, null, 2), { mode: 0o600 });
if (!fs.existsSync(CUSTOMER_USERS_FILE)) fs.writeFileSync(CUSTOMER_USERS_FILE, JSON.stringify({ users: [] }, null, 2), { mode: 0o600 });
if (!fs.existsSync(CUSTOMER_SESSIONS_FILE)) fs.writeFileSync(CUSTOMER_SESSIONS_FILE, JSON.stringify({ sessions: [] }, null, 2), { mode: 0o600 });
if (!fs.existsSync(WIDGET_FRAME_FILE)) fs.writeFileSync(WIDGET_FRAME_FILE, JSON.stringify({ selectedFrame: "gold", updated_at: new Date().toISOString() }, null, 2), { mode: 0o600 });
if (!fs.existsSync(MUSIC_CONFIG_FILE)) fs.writeFileSync(MUSIC_CONFIG_FILE, JSON.stringify({ videoId: "AwsLOWxaZfk", updated_at: new Date().toISOString() }, null, 2), { mode: 0o600 });
// Apply restrictive permissions after initialization too, so first-run files are private.
if (process.platform !== "win32") {
  for (const file of [DB_FILE, ACCESS_KEYS_FILE, CUSTOMER_USERS_FILE, CUSTOMER_SESSIONS_FILE, WIDGET_FRAME_FILE, CUSTOM_WIDGET_FRAMES_FILE]) {
    try { fs.chmodSync(file, 0o600); } catch {}
  }
}

function readCustomWidgetFrames() {
  try {
    const db = JSON.parse(fs.readFileSync(CUSTOM_WIDGET_FRAMES_FILE, "utf8"));
    if (!Array.isArray(db.frames)) return { frames: [] };
    return { frames: db.frames.filter(frame => frame && /^custom-[a-f0-9]{20}$/.test(frame.id) && typeof frame.name === "string" && typeof frame.imageUrl === "string") };
  } catch {
    throw new Error("Không đọc được danh sách khung tuỳ chỉnh. Hãy kiểm tra data/custom-widget-frames.json.");
  }
}
function writeCustomWidgetFrames(db) {
  const temp = CUSTOM_WIDGET_FRAMES_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify({ frames: db.frames }, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, CUSTOM_WIDGET_FRAMES_FILE);
}
function getWidgetFrameById(id) {
  if (Object.prototype.hasOwnProperty.call(WIDGET_FRAME_PRESETS, id)) return WIDGET_FRAME_PRESETS[id];
  return readCustomWidgetFrames().frames.find(frame => frame.id === id) || null;
}
function readWidgetFrameConfig() {
  try {
    const config = JSON.parse(fs.readFileSync(WIDGET_FRAME_FILE, "utf8"));
    const selectedFrame = getWidgetFrameById(config.selectedFrame) ? config.selectedFrame : "gold";
    return { selectedFrame, updated_at: config.updated_at || "" };
  } catch {
    throw new Error("Không đọc được lựa chọn khung tiện ích. Hãy kiểm tra data/widget-frame.json.");
  }
}
function writeWidgetFrameConfig(selectedFrame) {
  if (!getWidgetFrameById(selectedFrame)) throw new Error("Khung tiện ích không hợp lệ.");
  const config = { selectedFrame, updated_at: new Date().toISOString() };
  const temp = WIDGET_FRAME_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(config, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, WIDGET_FRAME_FILE);
  return config;
}
function publicWidgetFrame(config) {
  const frame = getWidgetFrameById(config.selectedFrame) || WIDGET_FRAME_PRESETS.gold;
  const safeFrame = frame.custom === true
    ? { id: frame.id, name: frame.name, description: frame.description, accent: frame.accent, imageUrl: frame.imageUrl, created_at: frame.created_at, custom: true }
    : frame;
  return { selectedFrame: safeFrame.id, frame: safeFrame, updated_at: config.updated_at || "" };
}
function customWidgetFramePublicList() {
  return readCustomWidgetFrames().frames.map(({ id, name, description, accent, imageUrl, created_at }) => ({ id, name, description, accent, imageUrl, created_at, custom: true }));
}

function readDb() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    if (!Array.isArray(db.customers)) return { customers: [] };
    return db;
  } catch {
    throw new Error("Không đọc được cơ sở dữ liệu. Hãy kiểm tra data/kick-customers.json.");
  }
}
function writeDb(db) {
  const temp = DB_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, DB_FILE);
}
function readAccessKeysDb() {
  try {
    const db = JSON.parse(fs.readFileSync(ACCESS_KEYS_FILE, "utf8"));
    if (!Array.isArray(db.keys)) return { keys: [] };
    return db;
  } catch {
    throw new Error("Không đọc được danh sách key. Hãy kiểm tra data/kick-access-keys.json.");
  }
}
function writeAccessKeysDb(db) {
  const temp = ACCESS_KEYS_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, ACCESS_KEYS_FILE);
}

function readCustomerUsersDb() {
  const db = JSON.parse(fs.readFileSync(CUSTOMER_USERS_FILE, "utf8"));
  if (!Array.isArray(db.users)) return { users: [] };
  return db;
}
function writeCustomerUsersDb(db) {
  const temp = CUSTOMER_USERS_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, CUSTOMER_USERS_FILE);
}
function readCustomerSessionsDb() {
  const db = JSON.parse(fs.readFileSync(CUSTOMER_SESSIONS_FILE, "utf8"));
  if (!Array.isArray(db.sessions)) return { sessions: [] };
  return db;
}
function writeCustomerSessionsDb(db) {
  const temp = CUSTOMER_SESSIONS_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, CUSTOMER_SESSIONS_FILE);
}
function normalizeCustomerUsername(value) {
  return String(value || "").trim().toLowerCase();
}
function hashCustomerPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function hashSessionToken(token) {
  return crypto.createHash("sha256").update(String(token), "utf8").digest("hex");
}
function parseCookie(req, name) {
  const cookies = String(req.headers.cookie || "").split(";");
  for (const item of cookies) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() === name) {
      try { return decodeURIComponent(item.slice(separator + 1).trim()); }
      catch { return ""; }
    }
  }
  return "";
}
function customerPublicProfile(user) {
  return { id: user.id, username: user.username, created_at: user.created_at };
}
function findCurrentCustomer(req) {
  const token = parseCookie(req, CUSTOMER_SESSION_COOKIE);
  if (!token || token.length > 200) return null;
  const tokenHash = hashSessionToken(token);
  const sessionDb = readCustomerSessionsDb();
  const now = Date.now();
  const session = sessionDb.sessions.find(item => item.token_hash === tokenHash && Date.parse(item.expires_at) > now);
  if (!session) return null;
  const userDb = readCustomerUsersDb();
  const user = userDb.users.find(item => item.id === session.user_id && item.status !== "disabled");
  return user || null;
}
function setCustomerSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = new Date(now + CUSTOMER_SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const sessionDb = readCustomerSessionsDb();
  sessionDb.sessions = sessionDb.sessions.filter(item => Date.parse(item.expires_at) > now);
  sessionDb.sessions.push({
    id: crypto.randomUUID(),
    token_hash: hashSessionToken(token),
    user_id: userId,
    created_at: new Date(now).toISOString(),
    expires_at: expiresAt
  });
  writeCustomerSessionsDb(sessionDb);
  const secure = (process.env.NODE_ENV === "production" || req.secure) ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${CUSTOMER_SESSION_DAYS * 24 * 60 * 60}${secure}`);
}
function clearCustomerSession(req, res) {
  const token = parseCookie(req, CUSTOMER_SESSION_COOKIE);
  if (token) {
    const sessionDb = readCustomerSessionsDb();
    const tokenHash = hashSessionToken(token);
    sessionDb.sessions = sessionDb.sessions.filter(item => item.token_hash !== tokenHash);
    writeCustomerSessionsDb(sessionDb);
  }
  const secure = (process.env.NODE_ENV === "production" || req.secure) ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${CUSTOMER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}
function requireCustomer(req, res, next) {
  try {
    const user = findCurrentCustomer(req);
    if (!user) return res.status(401).json({ success: false, code: "CUSTOMER_LOGIN_REQUIRED", message: "Vui lòng đăng ký hoặc đăng nhập tài khoản khách hàng trước khi sử dụng dịch vụ." });
    req.customerUser = user;
    next();
  } catch (e) {
    console.error("Customer session check failed:", e.message);
    res.status(500).json({ success: false, message: "Không thể kiểm tra phiên đăng nhập. Hãy kiểm tra thư mục data." });
  }
}
function normalizeAccessKey(value) {
  return String(value || "").trim().toUpperCase();
}
function hashAccessKey(value) {
  return crypto.createHash("sha256").update(normalizeAccessKey(value), "utf8").digest("hex");
}
function accessKeyStatus(key, now = Date.now()) {
  if (key.status === "revoked") return "revoked";
  if (key.expires_at && Date.parse(key.expires_at) <= now) return "expired";
  const maxUses = Number(key.max_uses || 0);
  if (maxUses > 0 && Number(key.use_count || 0) >= maxUses) return "exhausted";
  return "active";
}
function findActiveAccessKey(value, db = readAccessKeysDb()) {
  const normalized = normalizeAccessKey(value);
  if (!normalized || normalized.length > 160) return null;
  const hashed = hashAccessKey(normalized);
  return db.keys.find(k => accessKeyStatus(k) === "active" && safeEqual(k.hash || "", hashed)) || null;
}
function publicAccessKeyRecord(key) {
  return {
    id: key.id, label: key.label || "", status: accessKeyStatus(key), created_at: key.created_at,
    expires_at: key.expires_at || "", max_uses: Number(key.max_uses || 0),
    last_used_at: key.last_used_at || "", use_count: Number(key.use_count || 0), revoked_at: key.revoked_at || ""
  };
}
function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}
function upsertCustomer(data) {
  const db = readDb();
  const username = String(data.username || "").trim();
  const key = normalizeUsername(username);
  let customer = db.customers.find(c => normalizeUsername(c.username) === key);
  const now = new Date().toISOString();
  if (customer) {
    customer.username = username;
    customer.package = data.package || customer.package || "";
    customer.expires_at = data.expires_at || customer.expires_at || "";
    customer.status = "active";
    customer.gold_status = "active";
    customer.gold_revoked_at = "";
    customer.gold_revoke_last_result = "";
    customer.gold_revoke_last_message = "";
    customer.last_kicked_at = now;
    customer.updated_at = now;
    customer.kick_count = (customer.kick_count || 0) + 1;
  } else {
    customer = {
      id: crypto.randomUUID(),
      username,
      package: data.package || "",
      expires_at: data.expires_at || "",
      status: "active",
      gold_status: "active",
      gold_revoked_at: "",
      gold_revoke_last_result: "",
      gold_revoke_last_message: "",
      created_at: now,
      updated_at: now,
      last_kicked_at: now,
      kick_count: 1
    };
    db.customers.unshift(customer);
  }
  writeDb(db);
  return customer;
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function adminCookieName() { return "kick_admin_session"; }
function adminCookieSecure(req) { return process.env.NODE_ENV === "production" || req.secure; }
function parseAdminSession(req) {
  const token = parseCookie(req, adminCookieName());
  if (!token || token.length > 200) return null;
  const tokenHash = hashSessionToken(token);
  const record = adminSessions.get(tokenHash);
  if (!record || record.expiresAt <= Date.now()) {
    if (record) adminSessions.delete(tokenHash);
    return null;
  }
  return { tokenHash, record };
}
function setAdminSession(req, res) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const now = Date.now();
  for (const [hash, item] of adminSessions) if (item.expiresAt <= now) adminSessions.delete(hash);
  adminSessions.set(tokenHash, { username: ADMIN_USER, createdAt: now, expiresAt: now + ADMIN_SESSION_MINUTES * 60 * 1000 });
  const secure = adminCookieSecure(req) ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${adminCookieName()}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_MINUTES * 60}${secure}`);
}
function clearAdminSession(req, res) {
  const session = parseAdminSession(req);
  if (session) adminSessions.delete(session.tokenHash);
  const secure = adminCookieSecure(req) ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${adminCookieName()}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}
function isSameOriginMutation(req) {
  const origin = req.get("origin");
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.host === req.get("host") && ["http:", "https:"].includes(parsed.protocol);
  } catch { return false; }
}
function requireAdmin(req, res, next) {
  const session = parseAdminSession(req);
  if (!session) return res.status(401).json({ success: false, code: "ADMIN_LOGIN_REQUIRED", message: "Phiên quản trị hết hạn hoặc chưa đăng nhập." });
  if (!isSameOriginMutation(req)) return res.status(403).json({ success: false, message: "Yêu cầu quản trị không hợp lệ." });
  req.adminUser = session.record.username;
  res.set("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      fs.appendFileSync(path.join(DATA_DIR, "admin-audit.log"), JSON.stringify({
        at: new Date().toISOString(), user: req.adminUser, method: req.method,
        route: req.path, outcome: "requested"
      }) + "\n", { encoding: "utf8", mode: 0o600 });
    } catch (error) { console.error("Admin audit log write failed:", error.code || "ERROR"); }
  }
  next();
}

if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
if (process.env.NODE_ENV === "production") {
  const problems = [];
  if (!API_KEY || API_KEY.length < 16 || /replace|placeholder|paste_your/i.test(API_KEY)) problems.push("KICK_GOLD_API_KEY chưa được cấu hình an toàn");
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 20 || /replace|change_this|placeholder/i.test(ADMIN_PASSWORD)) problems.push("ADMIN_PASSWORD phải có ít nhất 20 ký tự ngẫu nhiên");
  if (!process.env.ADMIN_USER || process.env.ADMIN_USER.length < 3 || /replace|placeholder/i.test(process.env.ADMIN_USER)) problems.push("ADMIN_USER cần được cấu hình");
  if (process.env.TRUST_PROXY !== "1") problems.push("TRUST_PROXY=1 cần bật khi chạy sau reverse proxy HTTPS");
  if (problems.length) {
    console.error("Khởi động bị chặn vì cấu hình bảo mật production chưa đạt:", problems.join("; "));
    process.exit(1);
  }
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      frameSrc: ["'self'", "https://locket.jayteam.click", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.path === "/admin.html" || req.path.startsWith("/api/")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  }
  if (req.path.startsWith("/api/") && req.method !== "GET" && !isSameOriginMutation(req)) {
    return res.status(403).json({ success: false, message: "Yêu cầu không cùng nguồn gốc." });
  }
  next();
});
app.use(express.json({ limit: "1mb" }));

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Bạn đăng ký quá nhiều lần. Vui lòng thử lại sau 15 phút." }
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Bạn đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút." }
});

// Đăng ký khách hàng: tên tài khoản + mật khẩu, không gắn tài khoản với IP.
app.post("/api/auth/register", registerLimiter, (req, res) => {
  const username = String(req.body?.username || "").trim();
  const normalized = normalizeCustomerUsername(username);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
    return res.status(400).json({ success: false, message: "Tên tài khoản phải dài 3–24 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang." });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, message: "Mật khẩu cần dài từ 8 đến 128 ký tự." });
  }
  try {
    const db = readCustomerUsersDb();
    if (db.users.some(user => normalizeCustomerUsername(user.username) === normalized)) {
      return res.status(409).json({ success: false, message: "Tên tài khoản đã tồn tại. Hãy đăng nhập hoặc chọn tên khác." });
    }
    const salt = crypto.randomBytes(16).toString("hex");
    const user = {
      id: crypto.randomUUID(),
      username,
      password_salt: salt,
      password_hash: hashCustomerPassword(password, salt),
      status: "active",
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    };
    db.users.unshift(user);
    writeCustomerUsersDb(db);
    setCustomerSession(req, res, user.id);
    return res.status(201).json({ success: true, message: "Đăng ký thành công. Bạn đã đăng nhập.", user: customerPublicProfile(user) });
  } catch (e) {
    console.error("Customer registration failed:", e.message);
    return res.status(500).json({ success: false, message: "Không tạo được tài khoản. Hãy kiểm tra thư mục data." });
  }
});

app.post("/api/auth/login", loginLimiter, (req, res) => {
  const normalized = normalizeCustomerUsername(req.body?.username);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!normalized || normalized.length > 24 || !password || password.length > 128) {
    return res.status(400).json({ success: false, message: "Vui lòng nhập tên tài khoản và mật khẩu hợp lệ." });
  }
  try {
    const db = readCustomerUsersDb();
    const user = db.users.find(item => normalizeCustomerUsername(item.username) === normalized && item.status !== "disabled");
    // Tính hash giả nếu tài khoản không tồn tại để giảm khác biệt thời gian phản hồi.
    const salt = user?.password_salt || "invalid-account-salt";
    const suppliedHash = hashCustomerPassword(password, salt);
    if (!user || !safeEqual(user.password_hash || "", suppliedHash)) {
      return res.status(401).json({ success: false, message: "Tên tài khoản hoặc mật khẩu không đúng." });
    }
    user.last_login_at = new Date().toISOString();
    writeCustomerUsersDb(db);
    setCustomerSession(req, res, user.id);
    return res.json({ success: true, message: "Đăng nhập thành công.", user: customerPublicProfile(user) });
  } catch (e) {
    console.error("Customer login failed:", e.message);
    return res.status(500).json({ success: false, message: "Không thể đăng nhập. Hãy thử lại sau." });
  }
});

app.get("/api/auth/me", (req, res) => {
  try {
    const user = findCurrentCustomer(req);
    if (!user) return res.status(401).json({ success: false, message: "Bạn chưa đăng nhập." });
    return res.json({ success: true, user: customerPublicProfile(user) });
  } catch (e) {
    console.error("Customer session lookup failed:", e.message);
    return res.status(500).json({ success: false, message: "Không thể kiểm tra phiên đăng nhập." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  try {
    clearCustomerSession(req, res);
    return res.json({ success: true, message: "Bạn đã đăng xuất." });
  } catch (e) {
    console.error("Customer logout failed:", e.message);
    return res.status(500).json({ success: false, message: "Không thể đăng xuất hoàn toàn." });
  }
});

// Customer self-service: overview, active sessions and password changes.
app.get("/api/customer/overview", requireCustomer, (req, res) => {
  try {
    const db = readDb();
    const records = db.customers
      .filter(item => normalizeCustomerUsername(item.username) === normalizeCustomerUsername(req.customerUser.username))
      .map(item => ({
        username: item.username,
        package: String(item.package || ""),
        expires_at: String(item.expires_at || ""),
        status: String(item.status || "unknown"),
        kick_count: Number(item.kick_count || 0),
        last_kicked_at: String(item.last_kicked_at || ""),
        updated_at: String(item.updated_at || "")
      }));
    const now = Date.now();
    const active = records.filter(item => item.status === "active" && (!item.expires_at || !Number.isFinite(Date.parse(item.expires_at)) || Date.parse(item.expires_at) > now));
    res.json({ success: true, account: customerPublicProfile(req.customerUser), services: records, summary: { total: records.length, active: active.length, successfulActivations: records.reduce((sum, item) => sum + item.kick_count, 0) } });
  } catch (e) {
    console.error("Customer overview failed:", e.message);
    res.status(500).json({ success: false, message: "Không tải được tổng quan tài khoản." });
  }
});

app.get("/api/auth/sessions", requireCustomer, (req, res) => {
  try {
    const token = parseCookie(req, CUSTOMER_SESSION_COOKIE);
    const currentHash = hashSessionToken(token);
    const now = Date.now();
    const db = readCustomerSessionsDb();
    const sessions = db.sessions.filter(item => item.user_id === req.customerUser.id && Date.parse(item.expires_at) > now)
      .map(item => ({ id: item.id, created_at: item.created_at, expires_at: item.expires_at, current: item.token_hash === currentHash }));
    res.json({ success: true, sessions });
  } catch (e) {
    console.error("Customer sessions read failed:", e.message);
    res.status(500).json({ success: false, message: "Không tải được danh sách phiên đăng nhập." });
  }
});

app.post("/api/auth/sessions/revoke-others", requireCustomer, (req, res) => {
  try {
    const token = parseCookie(req, CUSTOMER_SESSION_COOKIE);
    const currentHash = hashSessionToken(token);
    const db = readCustomerSessionsDb();
    const before = db.sessions.length;
    db.sessions = db.sessions.filter(item => item.user_id !== req.customerUser.id || item.token_hash === currentHash);
    writeCustomerSessionsDb(db);
    res.json({ success: true, revoked: before - db.sessions.length, message: "Đã đăng xuất các phiên khác." });
  } catch (e) {
    console.error("Customer sessions revoke failed:", e.message);
    res.status(500).json({ success: false, message: "Không thể thu hồi các phiên khác." });
  }
});

app.post("/api/auth/password", requireCustomer, loginLimiter, (req, res) => {
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  if (newPassword.length < 8 || newPassword.length > 128) return res.status(400).json({ success: false, message: "Mật khẩu mới cần dài từ 8 đến 128 ký tự." });
  try {
    const users = readCustomerUsersDb();
    const user = users.users.find(item => item.id === req.customerUser.id);
    if (!user || !safeEqual(user.password_hash || "", hashCustomerPassword(currentPassword, user.password_salt || ""))) {
      return res.status(401).json({ success: false, message: "Mật khẩu hiện tại không đúng." });
    }
    const salt = crypto.randomBytes(16).toString("hex");
    user.password_salt = salt;
    user.password_hash = hashCustomerPassword(newPassword, salt);
    user.password_changed_at = new Date().toISOString();
    writeCustomerUsersDb(users);
    const token = parseCookie(req, CUSTOMER_SESSION_COOKIE);
    const currentHash = hashSessionToken(token);
    const sessions = readCustomerSessionsDb();
    sessions.sessions = sessions.sessions.filter(item => item.user_id !== user.id || item.token_hash === currentHash);
    writeCustomerSessionsDb(sessions);
    res.json({ success: true, message: "Đổi mật khẩu thành công. Các phiên đăng nhập khác đã bị đăng xuất." });
  } catch (e) {
    console.error("Customer password update failed:", e.message);
    res.status(500).json({ success: false, message: "Không thể đổi mật khẩu lúc này." });
  }
});

// Tải hồ sơ cấu hình được bảo vệ: chỉ tài khoản khách đang đăng nhập mới tải được.
app.get("/download/locket-gold.mobileconfig", requireCustomer, (req, res) => {
  const profilePath = path.join(__dirname, "profiles", "locket-gold.mobileconfig");
  if (!fs.existsSync(profilePath)) {
    return res.status(404).send("Không tìm thấy hồ sơ cấu hình.");
  }
  res.set({
    "Content-Type": "application/x-apple-aspen-config",
    "Content-Disposition": 'attachment; filename="locket-gold.mobileconfig"',
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  });
  return res.sendFile(profilePath);
});

app.get("/admin.html", (req, res) => {
  res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet" });
  return res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.use(express.static(path.join(__dirname, "public"), {
  dotfiles: "ignore",
  index: "index.html",
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
  }
}));

const accessVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Bạn nhập key quá nhiều lần. Vui lòng thử lại sau 15 phút." }
});
const activationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút." }
});

// Key truy cập Kick Gold không gắn với IP. Máy chủ kiểm tra key mỗi lần gọi API.
app.post("/api/access/verify", requireCustomer, accessVerifyLimiter, (req, res) => {
  const accessKey = typeof req.body?.accessKey === "string" ? req.body.accessKey : "";
  try {
    if (!findActiveAccessKey(accessKey)) {
      return res.status(403).json({ success: false, code: "ACCESS_KEY_INVALID", message: "Key không đúng hoặc đã bị admin thu hồi. Vui lòng kiểm tra lại." });
    }
    return res.json({ success: true, message: "Key hợp lệ." });
  } catch (e) {
    console.error("Access key verification failed:", e.code || e.name || "ERROR");
    return res.status(500).json({ success: false, message: "Không đọc được dữ liệu key. Vui lòng liên hệ admin." });
  }
});

app.post("/api/activate", requireCustomer, activationLimiter, async (req, res) => {
  const accessKeyValue = typeof req.body?.accessKey === "string" ? req.body.accessKey : "";
  let accessKeyRecord;
  try {
    const accessDb = readAccessKeysDb();
    accessKeyRecord = findActiveAccessKey(accessKeyValue, accessDb);
    if (!accessKeyRecord) {
      return res.status(403).json({ success: false, code: "ACCESS_KEY_INVALID", message: "Key không đúng hoặc đã bị admin thu hồi. Hãy nhập key hợp lệ để tiếp tục." });
    }
  } catch (e) {
    console.error("Access key check failed:", e.code || e.name || "ERROR");
    return res.status(500).json({ success: false, message: "Không đọc được dữ liệu key. Vui lòng liên hệ admin." });
  }
  if (!API_KEY || API_KEY === "PASTE_YOUR_API_KEY_HERE") {
    return res.status(503).json({ success: false, message: "Website chưa được cấu hình API key trên máy chủ." });
  }
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  if (!username || username.length > 300) {
    return res.status(400).json({ success: false, message: "Vui lòng nhập username hoặc link Locket hợp lệ." });
  }
  try {
    // Count only after local validation and server API configuration checks.
    const accessDb = readAccessKeysDb();
    accessKeyRecord = findActiveAccessKey(accessKeyValue, accessDb);
    if (!accessKeyRecord) return res.status(403).json({ success: false, code: "ACCESS_KEY_INVALID", message: "Key không còn hiệu lực hoặc đã hết lượt sử dụng." });
    accessKeyRecord.use_count = Number(accessKeyRecord.use_count || 0) + 1;
    accessKeyRecord.last_used_at = new Date().toISOString();
    writeAccessKeysDb(accessDb);
    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
      body: JSON.stringify({ username }),
      signal: AbortSignal.timeout(25000)
    });
    let data;
    try { data = await upstream.json(); }
    catch { return res.status(502).json({ success: false, message: "Máy chủ API trả về dữ liệu không hợp lệ." }); }

    if (!upstream.ok || !data.success) {
      const status = [400, 401, 403, 429].includes(upstream.status) ? upstream.status : 502;
      const rawCode = String(data.code || data.error_code || "");
      const safeCode = /^[A-Z0-9_-]{1,40}$/i.test(rawCode) ? rawCode : null;
      return res.status(status).json({
        success: false,
        message: status === 401 || status === 403
          ? "Nhà cung cấp từ chối yêu cầu. Hãy liên hệ quản trị viên."
          : status === 429
            ? "Máy chủ đang giới hạn yêu cầu. Vui lòng thử lại sau."
            : "Kích hoạt chưa thành công. Hãy kiểm tra username hoặc liên hệ quản trị viên.",
        code: safeCode
      });
    }

    const customerData = {
      username: data.data?.username || username,
      package: data.data?.package || "",
      expires_at: data.data?.expires_at || ""
    };
    // Chỉ ghi dữ liệu khi API upstream xác nhận kích hoạt thành công.
    try { upsertCustomer(customerData); }
    catch (dbErr) {
      console.error("Database write failed:", dbErr.code || dbErr.name || "ERROR");
      return res.status(500).json({ success: false, message: "Kích hoạt có phản hồi thành công nhưng không lưu được lịch sử. Hãy sao lưu và kiểm tra thư mục data." });
    }

    return res.json({
      success: true,
      message: "Yêu cầu đã được nhà cung cấp xác nhận thành công.",
      data: {
        username: customerData.username,
        package: customerData.package,
        expires_at: customerData.expires_at,
        download_url: (() => {
          try { const u = new URL(String(data.data?.download_url || "")); return u.protocol === "https:" && u.hostname === "locket.jayteam.click" ? u.href : ""; }
          catch { return ""; }
        })(),
        customer_message: typeof data.data?.customer_message === "string"
          ? data.data.customer_message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, 1000)
          : ""
      }
    });
  } catch (err) {
    console.error("Activation API error:", err.name || "Error");
    return res.status(502).json({ success: false, message: "Không kết nối được máy chủ kích hoạt. Vui lòng thử lại sau." });
  }
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Quá nhiều lần đăng nhập admin. Hãy thử lại sau 15 phút." }
});
app.post("/api/admin/login", adminLoginLimiter, (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!ADMIN_PASSWORD || !safeEqual(username, ADMIN_USER) || !safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ success: false, message: "Tài khoản hoặc mật khẩu quản trị không đúng." });
  }
  setAdminSession(req, res);
  return res.json({ success: true, message: "Đăng nhập quản trị thành công.", expires_in_minutes: ADMIN_SESSION_MINUTES });
});
app.get("/api/admin/me", requireAdmin, (req, res) => res.json({ success: true, username: req.adminUser, expires_in_minutes: ADMIN_SESSION_MINUTES }));
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  clearAdminSession(req, res);
  return res.json({ success: true, message: "Đã đăng xuất quản trị." });
});

// Nhật ký hoạt động quản trị: chỉ trả metadata, không trả dữ liệu bí mật.
app.get("/api/admin/audit", requireAdmin, (req, res) => {
  try {
    const requestedLimit = Number.parseInt(String(req.query.limit || "100"), 10);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, requestedLimit)) : 100;
    const auditPath = path.join(DATA_DIR, "admin-audit.log");
    if (!fs.existsSync(auditPath)) return res.json({ success: true, events: [], totalReturned: 0 });
    const content = fs.readFileSync(auditPath, "utf8");
    const events = content.split(/\r?\n/).filter(Boolean).slice(-limit).reverse().flatMap(line => {
      try {
        const item = JSON.parse(line);
        return [{
          at: typeof item.at === "string" ? item.at : "",
          user: typeof item.user === "string" ? item.user.slice(0, 80) : "admin",
          method: typeof item.method === "string" ? item.method.slice(0, 10) : "",
          route: typeof item.route === "string" ? item.route.slice(0, 180) : "",
          outcome: typeof item.outcome === "string" ? item.outcome.slice(0, 40) : "requested"
        }];
      } catch { return []; }
    });
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, events, totalReturned: events.length });
  } catch (e) {
    console.error("Admin audit read failed:", e.code || "ERROR");
    return res.status(500).json({ success: false, message: "Không đọc được nhật ký quản trị." });
  }
});

// Tổng quan bảng điều khiển Admin.
app.get("/api/admin/dashboard", requireAdmin, (req, res) => {
  try {
    const accountsDb = readCustomerUsersDb();
    const sessionsDb = readCustomerSessionsDb();
    const keysDb = readAccessKeysDb();
    const customersDb = readDb();
    const now = Date.now();
    const activeUserIds = new Set(accountsDb.users.filter(u => u.status !== "disabled").map(u => u.id));
    const activeSessions = sessionsDb.sessions.filter(s => activeUserIds.has(s.user_id) && Date.parse(s.expires_at) > now).length;
    const keysActive = keysDb.keys.filter(k => accessKeyStatus(k) === "active").length;
    const keysRevoked = keysDb.keys.filter(k => accessKeyStatus(k) === "revoked").length;
    const keysExpired = keysDb.keys.filter(k => accessKeyStatus(k) === "expired").length;
    const keysExhausted = keysDb.keys.filter(k => accessKeyStatus(k) === "exhausted").length;
    const serviceRecordsActive = customersDb.customers.filter(c => c.status === "active").length;
    const successfulKickCount = customersDb.customers.reduce((sum, c) => sum + Number(c.kick_count || 0), 0);
    return res.json({
      success: true,
      stats: {
        accountsTotal: accountsDb.users.length,
        accountsActive: accountsDb.users.filter(u => u.status !== "disabled").length,
        accountsDisabled: accountsDb.users.filter(u => u.status === "disabled").length,
        sessionsActive: activeSessions,
        keysTotal: keysDb.keys.length,
        keysActive,
        keysRevoked,
        keysExpired,
        keysExhausted,
        serviceRecordsTotal: customersDb.customers.length,
        serviceRecordsActive,
        serviceRecordsInactive: customersDb.customers.length - serviceRecordsActive,
        successfulKickCount
      },
      generatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Admin dashboard load failed:", e.message);
    return res.status(500).json({ success: false, message: "Không tải được số liệu tổng quan. Hãy kiểm tra thư mục data." });
  }
});

// Quản lý tài khoản khách đã đăng ký. Không bao giờ trả về trường băm mật khẩu hoặc salt.
app.get("/api/admin/accounts", requireAdmin, (req, res) => {
  try {
    const db = readCustomerUsersDb();
    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "all");
    let users = db.users;
    if (q) users = users.filter(u => String(u.username || "").toLowerCase().includes(q));
    if (status === "active" || status === "disabled") users = users.filter(u => (u.status === "disabled" ? "disabled" : "active") === status);
    users = users.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    return res.json({
      success: true,
      total: db.users.length,
      accounts: users.map(u => ({
        id: u.id,
        username: u.username,
        status: u.status === "disabled" ? "disabled" : "active",
        created_at: u.created_at || "",
        last_login_at: u.last_login_at || ""
      }))
    });
  } catch (e) {
    console.error("Admin account list failed:", e.message);
    return res.status(500).json({ success: false, message: "Không tải được danh sách tài khoản khách." });
  }
});

app.post("/api/admin/accounts/:id/status", requireAdmin, (req, res) => {
  try {
    const status = String(req.body?.status || "");
    if (!["active", "disabled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }
    const db = readCustomerUsersDb();
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản khách." });
    user.status = status;
    user.updated_at = new Date().toISOString();
    writeCustomerUsersDb(db);
    if (status === "disabled") {
      const sessionsDb = readCustomerSessionsDb();
      sessionsDb.sessions = sessionsDb.sessions.filter(session => session.user_id !== user.id);
      writeCustomerSessionsDb(sessionsDb);
    }
    return res.json({ success: true, message: status === "disabled" ? "Đã khóa tài khoản và đăng xuất các phiên hiện tại." : "Đã mở khóa tài khoản khách." });
  } catch (e) {
    console.error("Admin account status change failed:", e.message);
    return res.status(500).json({ success: false, message: "Không thể cập nhật tài khoản khách." });
  }
});

app.delete("/api/admin/accounts/:id", requireAdmin, (req, res) => {
  try {
    const db = readCustomerUsersDb();
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản khách." });
    db.users = db.users.filter(u => u.id !== req.params.id);
    writeCustomerUsersDb(db);
    const sessionsDb = readCustomerSessionsDb();
    sessionsDb.sessions = sessionsDb.sessions.filter(session => session.user_id !== req.params.id);
    writeCustomerSessionsDb(sessionsDb);
    return res.json({ success: true, message: "Đã xóa tài khoản khách và các phiên đăng nhập của tài khoản đó." });
  } catch (e) {
    console.error("Admin account delete failed:", e.message);
    return res.status(500).json({ success: false, message: "Không thể xóa tài khoản khách." });
  }
});

// Quản lý key truy cập Kick Gold. Chỉ trả key thô đúng một lần lúc tạo; hệ thống chỉ lưu SHA-256.
app.get("/api/admin/access-keys", requireAdmin, (req, res) => {
  try {
    const db = readAccessKeysDb();
    const keys = db.keys.map(publicAccessKeyRecord).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    res.json({ success: true, keys, total: keys.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
app.post("/api/admin/access-keys", requireAdmin, (req, res) => {
  try {
    const label = typeof req.body?.label === "string" ? req.body.label.trim().slice(0, 100) : "";
    const maxUses = Number(req.body?.maxUses ?? 0);
    const expiresAtRaw = typeof req.body?.expiresAt === "string" ? req.body.expiresAt.trim() : "";
    // Compatibility with older clients: expiresInDays is accepted only when expiresAt was not sent.
    const expiresInDays = Number(req.body?.expiresInDays ?? 0);
    if (!Number.isInteger(maxUses) || maxUses < 0 || maxUses > 1000000)
      return res.status(400).json({ success: false, message: "Giới hạn lượt dùng phải từ 0 đến 1.000.000 (0 = không giới hạn)." });
    let expiresAt = "";
    if (expiresAtRaw) {
      const parsed = Date.parse(expiresAtRaw);
      if (!Number.isFinite(parsed)) return res.status(400).json({ success: false, message: "Thời điểm hết hạn không hợp lệ." });
      expiresAt = new Date(parsed).toISOString();
    } else if (!Object.prototype.hasOwnProperty.call(req.body || {}, "expiresAt") && Number.isInteger(expiresInDays) && expiresInDays > 0 && expiresInDays <= 3650) {
      expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();
    } else if (!Object.prototype.hasOwnProperty.call(req.body || {}, "expiresAt") && (!Number.isInteger(expiresInDays) || expiresInDays < 0 || expiresInDays > 3650)) {
      return res.status(400).json({ success: false, message: "Số ngày hết hạn không hợp lệ." });
    }
    const raw = crypto.randomBytes(18).toString("hex").toUpperCase();
    const accessKey = "KG-" + raw.match(/.{1,6}/g).join("-");
    const db = readAccessKeysDb();
    const now = new Date();
    const record = {
      id: crypto.randomUUID(), hash: hashAccessKey(accessKey), label, status: "active", created_at: now.toISOString(),
      expires_at: expiresAt,
      max_uses: maxUses, last_used_at: "", use_count: 0, revoked_at: ""
    };
    db.keys.unshift(record); writeAccessKeysDb(db);
    return res.status(201).json({ success: true, message: "Đã tạo key. Hãy sao chép và gửi cho khách; key thô chỉ hiển thị một lần.", accessKey, key: publicAccessKeyRecord(record) });
  } catch (e) {
    console.error("Create access key failed:", e.message);
    res.status(500).json({ success: false, message: "Không thể tạo key. Hãy kiểm tra thư mục data." });
  }
});
app.put("/api/admin/access-keys/:id", requireAdmin, (req, res) => {
  try {
    const db = readAccessKeysDb();
    const record = db.keys.find(k => k.id === req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Không tìm thấy key." });
    if (record.status === "revoked") return res.status(409).json({ success: false, message: "Key đã thu hồi không thể chỉnh sửa; hãy tạo key mới." });
    const label = typeof req.body?.label === "string" ? req.body.label.trim().slice(0, 100) : String(record.label || "");
    const maxUses = Number(req.body?.maxUses ?? record.max_uses ?? 0);
    if (!Number.isInteger(maxUses) || maxUses < 0 || maxUses > 1000000)
      return res.status(400).json({ success: false, message: "Giới hạn lượt dùng phải từ 0 đến 1.000.000 (0 = không giới hạn)." });
    const expiresAtRaw = typeof req.body?.expiresAt === "string" ? req.body.expiresAt.trim() : "";
    let expiresAt = "";
    if (expiresAtRaw) {
      const parsed = Date.parse(expiresAtRaw);
      if (!Number.isFinite(parsed)) return res.status(400).json({ success: false, message: "Thời điểm hết hạn không hợp lệ." });
      expiresAt = new Date(parsed).toISOString();
    }
    record.label = label;
    record.expires_at = expiresAt;
    record.max_uses = maxUses;
    writeAccessKeysDb(db);
    return res.json({ success: true, message: "Đã lưu cài đặt key.", key: publicAccessKeyRecord(record) });
  } catch (e) {
    console.error("Update access key failed:", e.message);
    return res.status(500).json({ success: false, message: "Không thể cập nhật key. Hãy kiểm tra thư mục data." });
  }
});

app.post("/api/admin/access-keys/:id/revoke", requireAdmin, (req, res) => {
  try {
    const db = readAccessKeysDb();
    const record = db.keys.find(k => k.id === req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Không tìm thấy key." });
    if (record.status !== "revoked") {
      record.status = "revoked";
      record.revoked_at = new Date().toISOString();
      writeAccessKeysDb(db);
    }
    res.json({ success: true, message: "Đã thu hồi key. Key này bị chặn ở mọi địa chỉ IP." });
  } catch (e) {
    res.status(500).json({ success: false, message: "Không thể thu hồi key. Hãy kiểm tra thư mục data." });
  }
});

// Thu hồi Gold thật: yêu cầu được gửi đến API nhà cung cấp, không phải chỉ cập nhật dữ liệu cục bộ.
app.post("/api/admin/customers/:id/revoke-gold", requireAdmin, async (req, res) => {
  let db;
  let customer;
  let providerConfirmed = false;
  try {
    db = readDb();
    customer = db.customers.find(x => x.id === req.params.id);
    if (!customer) return res.status(404).json({ success: false, code: "CUSTOMER_NOT_FOUND", message: "Không tìm thấy khách trong sổ dịch vụ." });
    if (!API_KEY || API_KEY === "PASTE_YOUR_API_KEY_HERE" || API_KEY.length < 16) {
      return res.status(503).json({ success: false, code: "PROVIDER_KEY_NOT_CONFIGURED", message: "Chưa cấu hình API key nhà cung cấp trên máy chủ. Gold chưa bị thu hồi." });
    }
    if (customer.gold_status === "disabled" && customer.gold_revoked_at) {
      return res.json({ success: true, alreadyRevoked: true, message: "Bản ghi đã được xác nhận thu hồi Gold trước đó." });
    }
    const upstream = await fetch(API_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY },
      body: JSON.stringify({ username: customer.username, status: "DISABLED" }),
      signal: AbortSignal.timeout(20000)
    });
    let payload;
    try { payload = await upstream.json(); }
    catch {
      customer.gold_revoke_last_attempt_at = new Date().toISOString();
      customer.gold_revoke_last_result = "failed";
      customer.gold_revoke_last_message = "API nhà cung cấp trả về dữ liệu không hợp lệ.";
      customer.updated_at = new Date().toISOString();
      writeDb(db);
      return res.status(502).json({ success: false, code: "INVALID_PROVIDER_RESPONSE", message: "API nhà cung cấp trả về dữ liệu không hợp lệ. Chưa xác nhận thu hồi Gold." });
    }
    const succeeded = upstream.ok && payload && payload.success === true;
    providerConfirmed = succeeded;
    customer.gold_revoke_last_attempt_at = new Date().toISOString();
    customer.gold_revoke_last_result = succeeded ? "success" : "failed";
    customer.gold_revoke_last_message = succeeded
      ? "Nhà cung cấp xác nhận đã tắt Gold."
      : "Nhà cung cấp chưa xác nhận thu hồi Gold (HTTP " + upstream.status + (String(payload?.error || payload?.code || payload?.error_code || "").match(/^[A-Z0-9_-]{1,40}$/i) ? ", mã " + String(payload.error || payload.code || payload.error_code) : "") + ").";
    if (succeeded) {
      customer.gold_status = "disabled";
      customer.gold_revoked_at = customer.gold_revoke_last_attempt_at;
      customer.admin_note = "Gold được nhà cung cấp xác nhận tắt qua API partner.";
    }
    customer.updated_at = new Date().toISOString();
    writeDb(db);
    if (!succeeded) {
      const status = [400, 401, 403, 404, 429].includes(upstream.status) ? upstream.status : 502;
      return res.status(status).json({ success: false, code: String(payload?.error || payload?.code || payload?.error_code || "PROVIDER_REJECTED").match(/^[A-Z0-9_-]{1,40}$/i) ? String(payload.error || payload.code || payload.error_code || "PROVIDER_REJECTED") : "PROVIDER_REJECTED", message: customer.gold_revoke_last_message + " Gold chưa được đánh dấu đã thu hồi." });
    }
    return res.json({ success: true, message: "API nhà cung cấp đã xác nhận tắt Gold cho @" + customer.username + "." , customer: { id: customer.id, username: customer.username, gold_status: customer.gold_status, gold_revoked_at: customer.gold_revoked_at, gold_revoke_last_attempt_at: customer.gold_revoke_last_attempt_at } });
  } catch (error) {
    console.error("Gold revoke request failed:", error.name || "Error");
    if (db && customer) {
      try {
        customer.gold_revoke_last_attempt_at = new Date().toISOString();
        customer.gold_revoke_last_result = "failed";
        customer.gold_revoke_last_message = "Không kết nối được API nhà cung cấp. Gold chưa được xác nhận thu hồi.";
        customer.updated_at = new Date().toISOString();
        writeDb(db);
      } catch (writeError) { console.error("Gold revoke status save failed:", writeError.code || "ERROR"); }
    }
    return res.status(502).json({ success: false, code: providerConfirmed ? "LOCAL_STATUS_SAVE_FAILED" : "PROVIDER_UNREACHABLE", message: providerConfirmed ? "Nhà cung cấp đã xác nhận thu hồi Gold nhưng website không lưu được trạng thái. Hãy kiểm tra thư mục data trước khi thử lại." : "Không kết nối được API nhà cung cấp. Gold chưa được xác nhận thu hồi; hãy kiểm tra API key, IP được cấp phép và trạng thái endpoint." });
  }
});

// Các thao tác dưới đây quản lý sổ theo dõi cục bộ; chỉ endpoint revoke-gold ở trên yêu cầu nhà cung cấp tắt Gold thật.
app.get("/api/admin/customers", requireAdmin, (req, res) => {
  try {
    const db = readDb();
    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "all");
    let rows = db.customers;
    if (q) rows = rows.filter(c => c.username.toLowerCase().includes(q));
    if (status === "active" || status === "inactive") rows = rows.filter(c => c.status === status);
    rows.sort((a, b) => String(b.last_kicked_at).localeCompare(String(a.last_kicked_at)));
    res.json({ success: true, customers: rows, total: db.customers.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
app.post("/api/admin/customers/:id/deactivate", requireAdmin, (req, res) => {
  try {
    const db = readDb();
    const c = db.customers.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
    c.status = "inactive";
    c.updated_at = new Date().toISOString();
    c.admin_note = "Đã đánh dấu ngừng theo dõi trong cơ sở dữ liệu cục bộ; chưa hủy Gold ở nhà cung cấp.";
    writeDb(db);
    res.json({ success: true, message: "Đã đánh dấu ngừng theo dõi cục bộ. Trạng thái Gold thực tế không thay đổi." });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
app.delete("/api/admin/customers/:id", requireAdmin, (req, res) => {
  try {
    const db = readDb();
    const before = db.customers.length;
    db.customers = db.customers.filter(x => x.id !== req.params.id);
    if (db.customers.length === before) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
    writeDb(db);
    res.json({ success: true, message: "Đã xóa bản ghi khỏi cơ sở dữ liệu cục bộ. Không ảnh hưởng Gold ở nhà cung cấp." });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Nhạc nền toàn hệ thống. Chỉ Admin được quyền đổi video YouTube.
function readMusicConfig() {
  try {
    const c = JSON.parse(fs.readFileSync(MUSIC_CONFIG_FILE, "utf8"));
    return { videoId: /^[A-Za-z0-9_-]{11}$/.test(c.videoId || "") ? c.videoId : "AwsLOWxaZfk", updated_at: c.updated_at || "" };
  } catch { return { videoId: "AwsLOWxaZfk", updated_at: "" }; }
}
function saveMusicConfig(videoId) {
  const config = { videoId, updated_at: new Date().toISOString() };
  const tmp = MUSIC_CONFIG_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, MUSIC_CONFIG_FILE);
  return config;
}
app.get("/api/music-config", (req, res) => {
  res.set("Cache-Control", "no-store");
  return res.json({ success: true, ...readMusicConfig() });
});
app.get("/api/admin/music-config", requireAdmin, (req, res) => res.json({ success: true, ...readMusicConfig() }));
app.post("/api/admin/music-config", requireAdmin, (req, res) => {
  const raw = typeof req.body?.youtubeUrl === "string" ? req.body.youtubeUrl.trim() : "";
  let videoId = "";
  try {
    const u = new URL(raw);
    if (u.hostname === "youtu.be") videoId = u.pathname.slice(1).split("/")[0];
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(u.hostname)) {
      if (u.pathname === "/watch") videoId = u.searchParams.get("v") || "";
      else { const m = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/); if (m) videoId = m[1]; }
    }
  } catch {}
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return res.status(400).json({ success: false, message: "Hãy nhập link YouTube hợp lệ (watch?v=..., youtu.be/... hoặc /embed/...)." });
  try { const config = saveMusicConfig(videoId); return res.json({ success: true, message: "Đã đổi nhạc nền cho toàn bộ khách truy cập.", ...config }); }
  catch { return res.status(500).json({ success: false, message: "Không lưu được cấu hình nhạc trong thư mục data." }); }
});

// Khung toàn hệ thống: mọi khách hàng lấy cùng một lựa chọn được lưu trên máy chủ.
app.get("/api/widget-frame", (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, ...publicWidgetFrame(readWidgetFrameConfig()) });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Không tải được khung tiện ích hiện tại." });
  }
});
app.get("/api/admin/widget-frame", requireAdmin, (req, res) => {
  try {
    return res.json({ success: true, ...publicWidgetFrame(readWidgetFrameConfig()), availableFrames: Object.values(WIDGET_FRAME_PRESETS), customFrames: customWidgetFramePublicList() });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});
app.post("/api/admin/widget-frame", requireAdmin, (req, res) => {
  const selectedFrame = typeof req.body?.selectedFrame === "string" ? req.body.selectedFrame : "";
  try {
    if (!getWidgetFrameById(selectedFrame)) return res.status(400).json({ success: false, message: "Khung không hợp lệ hoặc đã bị xoá." });
    const config = writeWidgetFrameConfig(selectedFrame);
    return res.json({ success: true, message: "Đã áp dụng khung cho toàn bộ website. Khách đang mở trang sẽ cập nhật trong tối đa khoảng 30 giây.", ...publicWidgetFrame(config) });
  } catch (e) {
    console.error("Widget frame update failed:", e.message);
    return res.status(500).json({ success: false, message: "Không lưu được khung tiện ích. Hãy kiểm tra thư mục data." });
  }
});
app.post("/api/admin/widget-frames/custom", requireAdmin, (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim().replace(/[<>]/g, "").slice(0, 40) : "";
  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  if (name.length < 2) return res.status(400).json({ success: false, message: "Tên khung cần có ít nhất 2 ký tự." });
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) return res.status(400).json({ success: false, message: "Chỉ hỗ trợ ảnh PNG, JPG hoặc WebP hợp lệ." });
  let imageBuffer;
  try { imageBuffer = Buffer.from(match[2], "base64"); } catch { return res.status(400).json({ success: false, message: "Không đọc được ảnh tải lên." }); }
  if (!imageBuffer.length || imageBuffer.length > MAX_CUSTOM_FRAME_BYTES) return res.status(413).json({ success: false, message: "Ảnh khung phải nhỏ hơn hoặc bằng 2 MB." });
  const mime = match[1];
  const validPng = mime === "image/png" && imageBuffer.length >= 8 && imageBuffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const validJpeg = mime === "image/jpeg" && imageBuffer.length >= 3 && imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 && imageBuffer[2] === 0xff;
  const validWebp = mime === "image/webp" && imageBuffer.length >= 12 && imageBuffer.toString("ascii", 0, 4) === "RIFF" && imageBuffer.toString("ascii", 8, 12) === "WEBP";
  if (!(validPng || validJpeg || validWebp)) return res.status(400).json({ success: false, message: "Nội dung ảnh không khớp định dạng đã chọn." });
  const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
  const id = "custom-" + crypto.randomBytes(10).toString("hex");
  const filename = id + "." + ext;
  const imageUrl = "/uploads/widget-frames/" + filename;
  try {
    fs.writeFileSync(path.join(CUSTOM_WIDGET_FRAMES_DIR, filename), imageBuffer, { flag: "wx", mode: 0o644 });
    const db = readCustomWidgetFrames();
    const frame = { id, name, description: "Khung do Admin tải lên", accent: "#f6d783", imageUrl, filename, created_at: new Date().toISOString(), custom: true };
    db.frames.push(frame);
    writeCustomWidgetFrames(db);
    return res.status(201).json({ success: true, message: "Đã thêm khung tuỳ chỉnh. Nhấn vào khung mới để áp dụng cho toàn bộ khách.", frame: { id: frame.id, name: frame.name, description: frame.description, accent: frame.accent, imageUrl: frame.imageUrl, created_at: frame.created_at, custom: true }, customFrames: customWidgetFramePublicList() });
  } catch (e) {
    try { fs.unlinkSync(path.join(CUSTOM_WIDGET_FRAMES_DIR, filename)); } catch {}
    console.error("Custom widget frame upload failed:", e.code || e.name || "ERROR");
    return res.status(500).json({ success: false, message: "Không lưu được khung tuỳ chỉnh. Hãy kiểm tra quyền ghi thư mục data và public/uploads." });
  }
});
app.delete("/api/admin/widget-frames/:id", requireAdmin, (req, res) => {
  const id = String(req.params.id || "");
  if (!/^custom-[a-f0-9]{20}$/.test(id)) return res.status(400).json({ success: false, message: "ID khung tuỳ chỉnh không hợp lệ." });
  try {
    const currentBeforeDelete = readWidgetFrameConfig();
    const wasSelected = currentBeforeDelete.selectedFrame === id;
    const db = readCustomWidgetFrames();
    const frame = db.frames.find(item => item.id === id);
    if (!frame) return res.status(404).json({ success: false, message: "Không tìm thấy khung tuỳ chỉnh." });
    db.frames = db.frames.filter(item => item.id !== id);
    writeCustomWidgetFrames(db);
    if (frame.filename && /^[a-z0-9-]+\.(?:png|jpg|webp)$/.test(frame.filename)) {
      try { fs.unlinkSync(path.join(CUSTOM_WIDGET_FRAMES_DIR, frame.filename)); } catch (e) { if (e.code !== "ENOENT") throw e; }
    }
    if (wasSelected) writeWidgetFrameConfig("gold");
    return res.json({ success: true, message: wasSelected ? "Đã xoá khung và chuyển website về Gold Luxe." : "Đã xoá khung tuỳ chỉnh.", ...publicWidgetFrame(readWidgetFrameConfig()), customFrames: customWidgetFramePublicList() });
  } catch (e) {
    console.error("Custom widget frame delete failed:", e.code || e.name || "ERROR");
    return res.status(500).json({ success: false, message: "Không xoá được khung tuỳ chỉnh." });
  }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
const server = app.listen(PORT, () => console.log(`Kick Gold server listening on port ${PORT}`));
server.requestTimeout = 30000;
server.headersTimeout = 35000;
server.keepAliveTimeout = 5000;

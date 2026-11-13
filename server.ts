import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH?.trim() || "swiftride.db";
const dbDir = path.dirname(dbPath);
if (dbDir && dbDir !== ".") {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    role TEXT CHECK(role IN ('user', 'driver', 'admin')),
    balance REAL DEFAULT 1500,
    lat REAL,
    lng REAL,
    is_online INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rides (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    driver_id TEXT,
    pickup_lat REAL,
    pickup_lng REAL,
    dropoff_lat REAL,
    dropoff_lng REAL,
    pickup_address TEXT,
    dropoff_address TEXT,
    fare REAL,
    payment_method TEXT DEFAULT 'upi',
    payment_status TEXT DEFAULT 'pending',
    status TEXT CHECK(status IN ('pending', 'accepted', 'ongoing', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(driver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS driver_documents (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    doc_type TEXT NOT NULL CHECK(doc_type IN ('aadhaar', 'pan', 'license', 'rc')),
    doc_number TEXT NOT NULL,
    holder_name TEXT NOT NULL,
    expiry_date TEXT,
    vehicle_model TEXT,
    vehicle_type TEXT,
    file_name TEXT,
    file_data TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'rejected')),
    rejection_reason TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(driver_id, doc_type),
    FOREIGN KEY(driver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    ride_id TEXT,
    user_id TEXT NOT NULL,
    driver_id TEXT,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('ride_payment', 'wallet_topup', 'driver_payout')),
    method TEXT NOT NULL CHECK(method IN ('upi', 'wallet', 'card', 'cash')),
    upi_id TEXT,
    transaction_ref TEXT NOT NULL,
    status TEXT DEFAULT 'success' CHECK(status IN ('pending', 'success', 'failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('base_fare', '30.00');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('per_km', '12.00');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('per_minute', '2.00');
`);

// Safe migrations for pre-existing swiftride.db databases
try {
  db.exec(`ALTER TABLE rides ADD COLUMN payment_method TEXT DEFAULT 'upi'`);
} catch {
  // Column already exists
}
try {
  db.exec(`ALTER TABLE rides ADD COLUMN payment_status TEXT DEFAULT 'pending'`);
} catch {
  // Column already exists
}

function generateTxRef(prefix = "SPX") {
  return `${prefix}${Date.now().toString().slice(-6)}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";
  return { keyId, keySecret };
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  app.use(express.json({ limit: "10mb" }));

  // Healthcheck
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // India Geocoding Search & Reverse Geocode (Nominatim)
  app.get("/api/geocode/search", async (req, res) => {
    const q = String(req.query.q || "").trim();
    const viewbox = String(req.query.viewbox || "").trim();
    const bounded = req.query.bounded === "1" ? "&bounded=1" : "";
    if (!q) return res.json([]);
    try {
      const boxParam = viewbox ? `&viewbox=${encodeURIComponent(viewbox)}${bounded}` : "";
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&addressdetails=1&limit=6${boxParam}&q=${encodeURIComponent(
        q
      )}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "SpeedxIndiaApp/1.0 (https://speedx.in)",
          "Accept-Language": "en-IN,en;q=0.9",
        },
      });
      if (!response.ok) return res.json([]);
      const data = await response.json();
      res.json(Array.isArray(data) ? data : []);
    } catch {
      res.json([]);
    }
  });

  app.get("/api/geocode/reverse", async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "SpeedxIndiaApp/1.0 (https://speedx.in)",
          "Accept-Language": "en-IN,en;q=0.9",
        },
      });
      if (!response.ok) return res.json({ label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
      const data = (await response.json()) as any;
      const addr = data?.address || {};
      const parts = [
        addr.road || addr.neighbourhood || addr.suburb || addr.village || addr.town,
        addr.city_district || addr.city || addr.county || addr.state_district,
        addr.state,
      ].filter(Boolean);
      const label =
        parts.length > 0
          ? parts.slice(0, 3).join(", ")
          : data?.display_name?.split(",").slice(0, 3).join(",") || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      res.json({ label });
    } catch {
      res.json({ label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    }
  });

  // Settings API
  app.get("/api/settings", (_req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    res.json(settings);
  });

  app.post("/api/settings", (req, res) => {
    const { base_fare, per_km, per_minute } = req.body;
    db.prepare("REPLACE INTO settings (key, value) VALUES (?, ?)").run("base_fare", String(base_fare));
    db.prepare("REPLACE INTO settings (key, value) VALUES (?, ?)").run("per_km", String(per_km));
    db.prepare("REPLACE INTO settings (key, value) VALUES (?, ?)").run("per_minute", String(per_minute));
    res.json({ success: true });
  });

  // Rides API
  app.get("/api/rides", (req, res) => {
    const { userId, role } = req.query;
    if (userId && role === "user") {
      const rides = db.prepare("SELECT * FROM rides WHERE user_id = ? ORDER BY created_at DESC").all(userId);
      return res.json(rides);
    }
    if (userId && role === "driver") {
      const rides = db.prepare("SELECT * FROM rides WHERE driver_id = ? ORDER BY created_at DESC").all(userId);
      return res.json(rides);
    }
    const rides = db.prepare("SELECT * FROM rides ORDER BY created_at DESC").all();
    res.json(rides);
  });

  app.post("/api/rides/:id/cancel", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE rides SET status = 'cancelled' WHERE id = ? AND status = 'pending'").run(id);
    const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(id);
    if (ride) {
      io.emit("ride_status_updated", ride);
    }
    res.json({ success: true, ride });
  });

  // Payments & Wallet API
  app.get("/api/payments", (req, res) => {
    const { userId, driverId } = req.query;
    if (userId) {
      const rows = db
        .prepare(
          `SELECT p.*, u.name as user_name, u.email as user_email
           FROM payments p LEFT JOIN users u ON p.user_id = u.id
           WHERE p.user_id = ? ORDER BY p.created_at DESC`
        )
        .all(userId);
      return res.json(rows);
    }
    if (driverId) {
      const rows = db
        .prepare(
          `SELECT p.*, u.name as user_name, u.email as user_email
           FROM payments p LEFT JOIN users u ON p.user_id = u.id
           WHERE p.driver_id = ? OR (p.user_id = ? AND p.type = 'driver_payout')
           ORDER BY p.created_at DESC`
        )
        .all(driverId, driverId);
      return res.json(rows);
    }
    const rows = db
      .prepare(
        `SELECT p.*, u.name as user_name, u.email as user_email
         FROM payments p LEFT JOIN users u ON p.user_id = u.id
         ORDER BY p.created_at DESC`
      )
      .all();
    res.json(rows);
  });

  app.get("/api/payments/razorpay/status", (_req, res) => {
    const { keyId, keySecret } = getRazorpayCredentials();
    res.json({
      configured: Boolean(keyId && keySecret),
      mode: keyId.startsWith("rzp_live_") ? "live" : "test",
    });
  });

  app.post("/api/payments/razorpay/order", async (req, res) => {
    const { keyId, keySecret } = getRazorpayCredentials();
    if (!keyId || !keySecret) {
      return res.status(503).json({ error: "Razorpay gateway is not configured on the server." });
    }

    const { amount, purpose, rideId, userId } = req.body;
    if (!["wallet_topup", "ride_payment"].includes(purpose)) {
      return res.status(400).json({ error: "Invalid payment purpose." });
    }

    let finalAmount = Number(amount);
    if (purpose === "ride_payment") {
      if (!rideId) return res.status(400).json({ error: "rideId is required." });
      const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId) as any;
      if (!ride) return res.status(404).json({ error: "Ride not found." });
      if (ride.payment_status === "paid") {
        return res.status(400).json({ error: "This ride is already paid." });
      }
      finalAmount = Number(ride.fare);
    }

    if (Number.isNaN(finalAmount) || finalAmount < 1 || finalAmount > 50000) {
      return res.status(400).json({ error: "Amount must be between ₹1 and ₹50,000." });
    }

    const receipt = `${purpose === "ride_payment" ? "ride" : "wlt"}_${Date.now().toString().slice(-10)}`;
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    try {
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          amount: Math.round(finalAmount * 100),
          currency: "INR",
          receipt,
          notes: {
            purpose,
            rideId: rideId || "",
            userId: userId || "",
          },
        }),
      });

      const orderData = (await rzpRes.json()) as any;
      if (!rzpRes.ok) {
        return res.status(rzpRes.status).json({
          error: orderData?.error?.description || "Unable to create Razorpay order.",
        });
      }

      res.json({
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        keyId,
        purpose,
        rideId: rideId || null,
      });
    } catch {
      res.status(502).json({ error: "Could not reach Razorpay API." });
    }
  });

  app.post("/api/payments/razorpay/verify", async (req, res) => {
    const { keyId, keySecret } = getRazorpayCredentials();
    if (!keyId || !keySecret) {
      return res.status(503).json({ error: "Razorpay gateway is not configured." });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      purpose,
      rideId,
      userId,
      amount,
      method,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Incomplete Razorpay verification payload." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const sigBuf = Buffer.from(String(razorpay_signature), "utf8");
    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return res.status(400).json({ error: "Razorpay payment signature verification failed." });
    }

    let resolvedMethod: "upi" | "card" = method === "card" ? "card" : "upi";
    let resolvedDetails: string | null = null;
    let verifiedAmountINR = Number(amount);

    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpPayRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: { Authorization: `Basic ${authHeader}` },
      });
      if (rzpPayRes.ok) {
        const payInfo = (await rzpPayRes.json()) as any;
        if (typeof payInfo.amount === "number" && payInfo.amount > 0) {
          verifiedAmountINR = Math.round((payInfo.amount / 100) * 100) / 100;
        }
        if (payInfo.method === "card") resolvedMethod = "card";
        if (payInfo.method === "upi") resolvedMethod = "upi";
        if (payInfo.vpa) {
          resolvedDetails = payInfo.vpa;
        } else if (payInfo.card?.last4) {
          resolvedDetails = `${payInfo.card.network || "CARD"}-${payInfo.card.last4}`;
        }
      }
    } catch {
      // Proceed with verified HMAC payload if payment detail lookup fails
    }

    const existingTx = db
      .prepare("SELECT * FROM payments WHERE transaction_ref = ?")
      .get(razorpay_payment_id) as any;
    if (existingTx) {
      const user = userId ? db.prepare("SELECT * FROM users WHERE id = ?").get(userId) : null;
      const ride = rideId ? db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId) : null;
      return res.json({ success: true, alreadyVerified: true, payment: existingTx, user, ride });
    }

    if (purpose === "wallet_topup") {
      if (!userId || Number.isNaN(verifiedAmountINR) || verifiedAmountINR <= 0) {
        return res.status(400).json({ error: "Invalid user or top-up amount." });
      }
      const txId = `pay_${Math.random().toString(36).slice(2, 10)}`;
      const runTopup = db.transaction(() => {
        db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(verifiedAmountINR, userId);
        db.prepare(
          `INSERT INTO payments (id, user_id, amount, type, method, upi_id, transaction_ref, status)
           VALUES (?, ?, ?, 'wallet_topup', ?, ?, ?, 'success')`
        ).run(
          txId,
          userId,
          verifiedAmountINR,
          resolvedMethod,
          resolvedDetails || `RZP:${razorpay_order_id.slice(-8)}`,
          razorpay_payment_id
        );
        return {
          user: db.prepare("SELECT * FROM users WHERE id = ?").get(userId),
          payment: db.prepare("SELECT * FROM payments WHERE id = ?").get(txId),
        };
      });

      const result = runTopup();
      io.emit("payment_recorded", result.payment);
      return res.json({ success: true, ...result });
    }

    if (purpose === "ride_payment") {
      if (!rideId) return res.status(400).json({ error: "rideId is required." });
      const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId) as any;
      if (!ride) return res.status(404).json({ error: "Ride not found." });

      const txId = `pay_${Math.random().toString(36).slice(2, 10)}`;
      const runRidePay = db.transaction(() => {
        db.prepare("UPDATE rides SET payment_method = ?, payment_status = 'paid' WHERE id = ?").run(
          resolvedMethod,
          rideId
        );
        db.prepare(
          `INSERT INTO payments (id, ride_id, user_id, driver_id, amount, type, method, upi_id, transaction_ref, status)
           VALUES (?, ?, ?, ?, ?, 'ride_payment', ?, ?, ?, 'success')`
        ).run(
          txId,
          ride.id,
          ride.user_id,
          ride.driver_id || null,
          ride.fare,
          resolvedMethod,
          resolvedDetails || `RZP:${razorpay_order_id.slice(-8)}`,
          razorpay_payment_id
        );
        return {
          ride: db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId),
          user: db.prepare("SELECT * FROM users WHERE id = ?").get(ride.user_id),
          payment: db.prepare("SELECT * FROM payments WHERE id = ?").get(txId),
        };
      });

      const result = runRidePay();
      io.emit("ride_status_updated", result.ride);
      io.emit("payment_recorded", result.payment);
      return res.json({ success: true, ...result });
    }

    return res.status(400).json({ error: "Unsupported payment purpose." });
  });

  app.post("/api/payments/topup", (req, res) => {
    const { userId, amount, method, upiId } = req.body;
    const numAmount = Number(amount);
    if (!userId || Number.isNaN(numAmount) || numAmount <= 0 || numAmount > 50000) {
      return res.status(400).json({ error: "Enter a valid amount between ₹1 and ₹50,000." });
    }
    if (!["upi", "card"].includes(method)) {
      return res.status(400).json({ error: "Top-up supports UPI or Card." });
    }

    const txId = `pay_${Math.random().toString(36).slice(2, 10)}`;
    const txRef = generateTxRef(method === "upi" ? "UPI" : "CRD");

    const runTopup = db.transaction(() => {
      db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(numAmount, userId);
      db.prepare(
        `INSERT INTO payments (id, user_id, amount, type, method, upi_id, transaction_ref, status)
         VALUES (?, ?, ?, 'wallet_topup', ?, ?, ?, 'success')`
      ).run(txId, userId, numAmount, method, upiId || null, txRef);
      return {
        user: db.prepare("SELECT * FROM users WHERE id = ?").get(userId),
        payment: db.prepare("SELECT * FROM payments WHERE id = ?").get(txId),
      };
    });

    const result = runTopup();
    io.emit("payment_recorded", result.payment);
    res.json({ success: true, ...result });
  });

  app.post("/api/rides/:id/pay", (req, res) => {
    const { id } = req.params;
    const { method, upiId } = req.body;
    if (!["upi", "wallet", "card", "cash"].includes(method)) {
      return res.status(400).json({ error: "Invalid payment method." });
    }

    const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(id) as any;
    if (!ride) {
      return res.status(404).json({ error: "Ride not found." });
    }
    if (ride.payment_status === "paid") {
      return res.json({ success: true, ride, alreadyPaid: true });
    }

    const rider = db.prepare("SELECT * FROM users WHERE id = ?").get(ride.user_id) as any;
    if (method === "wallet") {
      if (!rider || rider.balance < ride.fare) {
        return res.status(400).json({
          error: "Insufficient Speedx Wallet balance. Please top up or pay via UPI/Card.",
        });
      }
    }

    const txId = `pay_${Math.random().toString(36).slice(2, 10)}`;
    const txRef = generateTxRef(
      method === "upi" ? "UPI" : method === "card" ? "CRD" : method === "wallet" ? "WLT" : "CSH"
    );

    const runPay = db.transaction(() => {
      if (method === "wallet") {
        db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(ride.fare, ride.user_id);
      }
      db.prepare("UPDATE rides SET payment_method = ?, payment_status = 'paid' WHERE id = ?").run(
        method,
        id
      );
      db.prepare(
        `INSERT INTO payments (id, ride_id, user_id, driver_id, amount, type, method, upi_id, transaction_ref, status)
         VALUES (?, ?, ?, ?, ?, 'ride_payment', ?, ?, ?, 'success')`
      ).run(
        txId,
        ride.id,
        ride.user_id,
        ride.driver_id || null,
        ride.fare,
        method,
        upiId || null,
        txRef
      );

      return {
        ride: db.prepare("SELECT * FROM rides WHERE id = ?").get(id),
        user: db.prepare("SELECT * FROM users WHERE id = ?").get(ride.user_id),
        payment: db.prepare("SELECT * FROM payments WHERE id = ?").get(txId),
      };
    });

    const result = runPay();
    io.emit("ride_status_updated", result.ride);
    io.emit("payment_recorded", result.payment);
    res.json({ success: true, ...result });
  });

  app.post("/api/drivers/:driverId/withdraw", (req, res) => {
    const { driverId } = req.params;
    const { amount, upiId } = req.body;
    const numAmount = Number(amount);

    const driver = db.prepare("SELECT * FROM users WHERE id = ?").get(driverId) as any;
    if (!driver) return res.status(404).json({ error: "Driver not found." });
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: "Enter a valid withdrawal amount." });
    }
    if (driver.balance < numAmount) {
      return res.status(400).json({ error: "Insufficient driver balance for withdrawal." });
    }
    if (!upiId || !String(upiId).includes("@")) {
      return res.status(400).json({ error: "Enter a valid UPI ID (e.g. name@okicici)." });
    }

    const txId = `pay_${Math.random().toString(36).slice(2, 10)}`;
    const txRef = generateTxRef("PAYOUT");

    const runWithdraw = db.transaction(() => {
      db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(numAmount, driverId);
      db.prepare(
        `INSERT INTO payments (id, user_id, driver_id, amount, type, method, upi_id, transaction_ref, status)
         VALUES (?, ?, ?, ?, 'driver_payout', 'upi', ?, ?, 'success')`
      ).run(txId, driverId, driverId, numAmount, String(upiId).trim(), txRef);

      return {
        user: db.prepare("SELECT * FROM users WHERE id = ?").get(driverId),
        payment: db.prepare("SELECT * FROM payments WHERE id = ?").get(txId),
      };
    });

    const result = runWithdraw();
    io.emit("payment_recorded", result.payment);
    res.json({ success: true, ...result });
  });

  // Users API
  app.post("/api/users/register", (req, res) => {
    const { id, name, email, role } = req.body;
    try {
      const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (existing) {
        db.prepare("UPDATE users SET role = ?, name = ? WHERE id = ?").run(role, name || existing.name, existing.id);
        const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(existing.id);
        return res.json({ success: true, user: updated });
      }
      db.prepare("INSERT INTO users (id, name, email, role, balance) VALUES (?, ?, ?, ?, 1500)").run(
        id,
        name,
        email,
        role
      );
      const created = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      res.json({ success: true, user: created });
    } catch (e) {
      res.status(400).json({ error: "Unable to register user" });
    }
  });

  app.get("/api/users/:id", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    res.json(user);
  });

  app.post("/api/drivers/:driverId/status", (req, res) => {
    const { driverId } = req.params;
    const { is_online } = req.body;
    db.prepare("UPDATE users SET is_online = ? WHERE id = ?").run(is_online ? 1 : 0, driverId);
    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(driverId);
    io.emit("driver_status_updated", { driverId, is_online: Boolean(is_online) });
    res.json({ success: true, user: updated });
  });

  app.get("/api/admin/stats", (_req, res) => {
    const totalRides = (db.prepare("SELECT COUNT(*) as count FROM rides").get() as any).count;
    const activeRides = (
      db.prepare("SELECT COUNT(*) as count FROM rides WHERE status IN ('pending', 'accepted', 'ongoing')").get() as any
    ).count;
    const completedRides = (
      db.prepare("SELECT COUNT(*) as count FROM rides WHERE status = 'completed'").get() as any
    ).count;
    const totalRevenue = (
      db.prepare("SELECT COALESCE(SUM(fare), 0) as total FROM rides WHERE status = 'completed'").get() as any
    ).total;
    const pendingDocs = (
      db.prepare("SELECT COUNT(*) as count FROM driver_documents WHERE status = 'pending'").get() as any
    ).count;
    const verifiedDrivers = (
      db.prepare(
        "SELECT COUNT(DISTINCT driver_id) as count FROM driver_documents WHERE status = 'verified'"
      ).get() as any
    ).count;
    const paidVolume = (
      db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'success'").get() as any
    ).total;
    res.json({
      totalRides,
      activeRides,
      completedRides,
      totalRevenue,
      pendingDocs,
      verifiedDrivers,
      paidVolume,
    });
  });

  // Driver Documents API (Aadhaar, PAN, Driving License, Vehicle RC)
  app.get("/api/drivers/:driverId/documents", (req, res) => {
    const docs = db
      .prepare("SELECT * FROM driver_documents WHERE driver_id = ? ORDER BY updated_at DESC")
      .all(req.params.driverId);
    res.json(docs);
  });

  app.post("/api/drivers/:driverId/documents", (req, res) => {
    const { driverId } = req.params;
    const {
      doc_type,
      doc_number,
      holder_name,
      expiry_date,
      vehicle_model,
      vehicle_type,
      file_name,
      file_data,
    } = req.body;

    if (!["aadhaar", "pan", "license", "rc"].includes(doc_type)) {
      return res.status(400).json({ error: "Invalid document type" });
    }
    if (!doc_number || !holder_name) {
      return res.status(400).json({ error: "Document number and holder name are required" });
    }

    const existing = db
      .prepare("SELECT * FROM driver_documents WHERE driver_id = ? AND doc_type = ?")
      .get(driverId, doc_type) as any;

    const docId = existing ? existing.id : `doc_${Math.random().toString(36).slice(2, 11)}`;

    db.prepare(`
      INSERT INTO driver_documents (
        id, driver_id, doc_type, doc_number, holder_name,
        expiry_date, vehicle_model, vehicle_type, file_name, file_data,
        status, rejection_reason, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, CURRENT_TIMESTAMP)
      ON CONFLICT(driver_id, doc_type) DO UPDATE SET
        doc_number = excluded.doc_number,
        holder_name = excluded.holder_name,
        expiry_date = excluded.expiry_date,
        vehicle_model = excluded.vehicle_model,
        vehicle_type = excluded.vehicle_type,
        file_name = COALESCE(excluded.file_name, driver_documents.file_name),
        file_data = COALESCE(excluded.file_data, driver_documents.file_data),
        status = 'pending',
        rejection_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      docId,
      driverId,
      doc_type,
      doc_number.trim(),
      holder_name.trim(),
      expiry_date || null,
      vehicle_model || null,
      vehicle_type || null,
      file_name || null,
      file_data || null
    );

    const saved = db
      .prepare("SELECT * FROM driver_documents WHERE driver_id = ? AND doc_type = ?")
      .get(driverId, doc_type);

    io.emit("driver_document_updated", saved);
    res.json({ success: true, document: saved });
  });

  app.delete("/api/drivers/:driverId/documents/:docType", (req, res) => {
    const { driverId, docType } = req.params;
    db.prepare("DELETE FROM driver_documents WHERE driver_id = ? AND doc_type = ?").run(driverId, docType);
    res.json({ success: true });
  });

  // Admin Document Verification API
  app.get("/api/admin/documents", (_req, res) => {
    const docs = db
      .prepare(`
        SELECT d.*, u.name as driver_name, u.email as driver_email
        FROM driver_documents d
        LEFT JOIN users u ON d.driver_id = u.id
        ORDER BY d.updated_at DESC
      `)
      .all();
    res.json(docs);
  });

  app.patch("/api/admin/documents/:id/verify", (req, res) => {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    if (!["verified", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid verification status" });
    }

    db.prepare(`
      UPDATE driver_documents
      SET status = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, status === "rejected" ? rejection_reason || "Document details unclear" : null, id);

    const updated = db.prepare("SELECT * FROM driver_documents WHERE id = ?").get(id);
    if (updated) {
      io.emit("driver_document_updated", updated);
    }
    res.json({ success: true, document: updated });
  });

  // Socket.io Logic
  io.on("connection", (socket) => {
    socket.on("update_location", (data) => {
      const { userId, lat, lng } = data;
      db.prepare("UPDATE users SET lat = ?, lng = ?, is_online = 1 WHERE id = ?").run(lat, lng, userId);
      const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as any;
      if (user?.role === "driver") {
        io.emit("driver_location_updated", { userId, lat, lng });
      }
    });

    socket.on("request_ride", (rideData) => {
      const { id, userId, pickup, dropoff, fare, pickupAddress, dropoffAddress, paymentMethod } =
        rideData;
      const method = ["upi", "wallet", "card", "cash"].includes(paymentMethod)
        ? paymentMethod
        : "upi";
      db.prepare(`
        INSERT INTO rides (id, user_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_address, dropoff_address, fare, payment_method, payment_status, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
      `).run(
        id,
        userId,
        pickup.lat,
        pickup.lng,
        dropoff.lat,
        dropoff.lng,
        pickupAddress,
        dropoffAddress,
        fare,
        method
      );

      io.emit("new_ride_request", {
        id,
        userId,
        pickup,
        dropoff,
        fare,
        pickupAddress,
        dropoffAddress,
        paymentMethod: method,
      });
    });

    socket.on("accept_ride", (data) => {
      const { rideId, driverId } = data;
      db.prepare("UPDATE rides SET driver_id = ?, status = 'accepted' WHERE id = ?").run(driverId, rideId);
      const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId);
      io.emit("ride_status_updated", ride);
    });

    socket.on("start_ride", (rideId) => {
      db.prepare("UPDATE rides SET status = 'ongoing' WHERE id = ?").run(rideId);
      const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId);
      io.emit("ride_status_updated", ride);
    });

    socket.on("complete_ride", (rideId) => {
      const runComplete = db.transaction(() => {
        const existing = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId) as any;
        if (!existing) return null;

        db.prepare("UPDATE rides SET status = 'completed' WHERE id = ?").run(rideId);

        if (existing.driver_id) {
          db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(
            existing.fare,
            existing.driver_id
          );
        }

        // Auto-settle Wallet or Cash upon ride completion if still pending
        if (existing.payment_status !== "paid") {
          if (existing.payment_method === "wallet") {
            const rider = db.prepare("SELECT * FROM users WHERE id = ?").get(existing.user_id) as any;
            if (rider && rider.balance >= existing.fare) {
              db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(
                existing.fare,
                existing.user_id
              );
              db.prepare("UPDATE rides SET payment_status = 'paid' WHERE id = ?").run(rideId);
              const txId = `pay_${Math.random().toString(36).slice(2, 10)}`;
              db.prepare(
                `INSERT INTO payments (id, ride_id, user_id, driver_id, amount, type, method, transaction_ref, status)
                 VALUES (?, ?, ?, ?, ?, 'ride_payment', 'wallet', ?, 'success')`
              ).run(
                txId,
                existing.id,
                existing.user_id,
                existing.driver_id || null,
                existing.fare,
                generateTxRef("WLT")
              );
            }
          } else if (existing.payment_method === "cash") {
            db.prepare("UPDATE rides SET payment_status = 'paid' WHERE id = ?").run(rideId);
            const txId = `pay_${Math.random().toString(36).slice(2, 10)}`;
            db.prepare(
              `INSERT INTO payments (id, ride_id, user_id, driver_id, amount, type, method, transaction_ref, status)
               VALUES (?, ?, ?, ?, ?, 'ride_payment', 'cash', ?, 'success')`
            ).run(
              txId,
              existing.id,
              existing.user_id,
              existing.driver_id || null,
              existing.fare,
              generateTxRef("CSH")
            );
          }
        }

        return db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId);
      });

      const ride = runComplete();
      if (ride) {
        io.emit("ride_status_updated", ride);
      }
    });

    socket.on("cancel_ride", (rideId) => {
      db.prepare("UPDATE rides SET status = 'cancelled' WHERE id = ? AND status = 'pending'").run(rideId);
      const ride = db.prepare("SELECT * FROM rides WHERE id = ?").get(rideId);
      io.emit("ride_status_updated", ride);
    });
  });

  // Vite middleware for development (non-blocking port bind so port 3000 opens immediately)
  if (process.env.NODE_ENV !== "production") {
    const vitePromise = import("vite").then(({ createServer: createViteServer }) =>
      createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      })
    );
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    httpServer.close(() => {
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer();

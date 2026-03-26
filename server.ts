import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = "erfolgs-secret-key";

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://hmqcjaqttukjpnckjhtz.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcWNqYXF0dHVranBuY2tqaHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNTYyMzQsImV4cCI6MjA4OTYzMjIzNH0.CpVrpuvNKHxdIzD6VHv06VZHxeQbz3J4qLZQ1FBhlm8";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key if available to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Debug Route for Orders
app.get("/api/debug/orders", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .limit(1);
  
  if (error) {
    return res.status(500).json({ error });
  }
  res.json({ 
    count: data?.length,
    sample: data?.[0] || "No records found",
    columns: data?.[0] ? Object.keys(data[0]) : "Unknown"
  });
});

// Setup Route
app.get("/api/setup", async (req, res) => {
  try {
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    const { data, error } = await supabase
      .from("users")
      .upsert([{ 
        username: "admin", 
        password: hashedPassword, 
        role: "admin", 
        name: "Administrator" 
      }], { onConflict: 'username' });
    
    if (error) {
      console.error("Setup Error:", error);
      if (error.code === '42P01') {
        return res.status(500).json({ 
          error: "Table 'users' does not exist. Please run the SQL query in Supabase SQL Editor first." 
        });
      }
      return res.status(500).json({ error: error.message });
    }
    res.json({ message: "Admin user created/updated successfully. Use 'admin' and 'admin123' to login." });
  } catch (err: any) {
    console.error("Setup Exception:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Auth Routes
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const normalizedUsername = username.trim().toLowerCase();
    console.log(`Login attempt for username: "${normalizedUsername}"`);
    
    const { data: user, error, status } = await supabase
      .from("users")
      .select("*")
      .ilike("username", normalizedUsername)
      .single();

    if (error) {
      console.error("Supabase Login Error Details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        status: status,
        isDefaultUrl: SUPABASE_URL === "https://hmqcjaqttukjpnckjhtz.supabase.co"
      });
      
      if (error.code === '42P01') {
        return res.status(500).json({ 
          message: "Database table 'users' not found. Please run the SQL setup query in Supabase." 
        });
      }
      
      if (error.code === 'PGRST116') {
        let extraHint = "";
        if (SUPABASE_URL === "https://hmqcjaqttukjpnckjhtz.supabase.co") {
          extraHint = " WARNING: You are using the DEFAULT Supabase URL. If you created your own project, you MUST set SUPABASE_URL and SUPABASE_ANON_KEY in AI Studio Secrets.";
        }
        return res.status(400).json({ 
          message: `User not found.${extraHint} If you are sure the user exists, check if Row Level Security (RLS) is enabled. Try running: ALTER TABLE users DISABLE ROW LEVEL SECURITY;` 
        });
      }

      return res.status(400).json({ 
        message: "Database error: " + error.message 
      });
    }

    if (!user) return res.status(400).json({ message: "User not found" });
    
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      console.warn(`Invalid password for user: ${username}`);
      return res.status(400).json({ message: "Invalid password" });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
  } catch (err: any) {
    console.error("Login Exception:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
});

// Orders Routes
app.get("/api/orders", authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("id", { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/orders/import", authenticateToken, async (req, res) => {
  const orders = req.body;
  
  // 1. Get existing order_ids to skip duplicates
  const { data: existing, error: fetchError } = await supabase
    .from("orders")
    .select("order_id");
  
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  
  const existingIds = new Set(existing?.map(o => o.order_id) || []);
  const newOrders = orders.filter((o: any) => !existingIds.has(o.order_id));
  const skippedCount = orders.length - newOrders.length;
  
  if (newOrders.length === 0) {
    return res.json({ 
      message: "No new orders to import", 
      success: 0, 
      skipped: skippedCount,
      failed: 0
    });
  }

  // 2. Insert only new orders
  const { error } = await supabase
    .from("orders")
    .insert(newOrders);
  
  if (error) {
    console.error("Import Error Message:", error.message);
    console.error("Import Error Code:", error.code);
    
    if (error.code === '42703' && error.message.includes('items')) {
      return res.status(500).json({ 
        error: "Database perlu diperbarui untuk mendukung multi-produk. Silakan jalankan SQL ini di Supabase SQL Editor: ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB; ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_quantity INTEGER; ALTER TABLE orders DROP COLUMN IF EXISTS sku; ALTER TABLE orders DROP COLUMN IF EXISTS product_name; ALTER TABLE orders DROP COLUMN IF EXISTS size; ALTER TABLE orders DROP COLUMN IF EXISTS quantity;" 
      });
    }

    return res.status(500).json({ error: error.message });
  }
  
  res.json({ 
    message: "Import successful", 
    success: newOrders.length, 
    skipped: skippedCount,
    failed: 0
  });
});

app.post("/api/orders", authenticateToken, async (req, res) => {
  const o = req.body;
  console.log("Attempting to insert order:", o);
  const { data, error } = await supabase
    .from("orders")
    .insert([o])
    .select();
  
  if (error) {
    console.error("Supabase Insert Error:", JSON.stringify(error, null, 2));
    return res.status(400).json({ 
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
  }
  res.json(data[0]);
});

app.delete("/api/orders/:id", authenticateToken, async (req, res) => {
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", req.params.id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Deleted" });
});

// Scan Routes
app.post("/api/scan/session/start", authenticateToken, async (req: any, res) => {
  const { session_name } = req.body;
  const { data, error } = await supabase
    .from("scan_sessions")
    .insert([{ session_name, user_id: req.user.id }])
    .select();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.post("/api/scan/check", authenticateToken, async (req, res) => {
  const { tracking_number } = req.body;
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("tracking_number", tracking_number)
    .single();

  if (error || !order) return res.status(404).json({ message: "Order not found" });
  if (order.status === 'scanned') {
    return res.status(400).json({ 
      message: "Already scanned", 
      scanned_at: order.scanned_at,
      tracking_number: order.tracking_number
    });
  }
  res.json(order);
});

app.post("/api/scan/confirm", authenticateToken, async (req, res) => {
  const { session_id, tracking_numbers } = req.body;
  const now = new Date().toISOString();
  
  // Update orders status
  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: 'scanned', scanned_at: now })
    .in("tracking_number", tracking_numbers);
  
  if (orderError) return res.status(500).json({ error: orderError.message });

  // Insert session details
  const sessionDetails = tracking_numbers.map((tn: string) => ({
    session_id,
    tracking_number: tn,
    scanned_at: now
  }));
  const { error: detailError } = await supabase
    .from("session_details")
    .insert(sessionDetails);
  
  if (detailError) return res.status(500).json({ error: detailError.message });

  // Calculate totals and update session
  const { data: orders, error: fetchError } = await supabase
    .from("orders")
    .select("total_quantity")
    .in("tracking_number", tracking_numbers);
  
  if (fetchError) return res.status(500).json({ error: fetchError.message });

  const totalPackages = orders.length;
  const totalPcs = orders.reduce((sum, o) => sum + (o.total_quantity || 0), 0);

  const { error: sessionError } = await supabase
    .from("scan_sessions")
    .update({ 
      ended_at: now, 
      total_packages: totalPackages, 
      total_pcs: totalPcs 
    })
    .eq("id", session_id);
  
  if (sessionError) return res.status(500).json({ error: sessionError.message });
  res.json({ message: "Session ended and saved" });
});


// Reports
app.get("/api/reports/summary", authenticateToken, async (req, res) => {
  const { data: allOrders, error } = await supabase
    .from("orders")
    .select("status, total_quantity, store_name");
  
  if (error) return res.status(500).json({ error: error.message });
  
  const total = allOrders.length;
  const scanned = allOrders.filter(o => o.status === 'scanned').length;
  const totalPcs = allOrders.reduce((sum, o) => sum + (o.total_quantity || 0), 0);
  const scannedPcs = allOrders.filter(o => o.status === 'scanned').reduce((sum, o) => sum + (o.total_quantity || 0), 0);
  
  // Per store summary
  const storeSummary: { [key: string]: { total: number, scanned: number, totalPcs: number, scannedPcs: number } } = {};
  allOrders.forEach(o => {
    const store = o.store_name || "Unknown";
    if (!storeSummary[store]) {
      storeSummary[store] = { total: 0, scanned: 0, totalPcs: 0, scannedPcs: 0 };
    }
    storeSummary[store].total += 1;
    storeSummary[store].totalPcs += (o.total_quantity || 0);
    if (o.status === 'scanned') {
      storeSummary[store].scanned += 1;
      storeSummary[store].scannedPcs += (o.total_quantity || 0);
    }
  });

  res.json({ total, scanned, totalPcs, scannedPcs, storeSummary });
});

app.get("/api/reports/sessions", authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from("scan_sessions")
    .select(`
      *,
      users:user_id (name)
    `)
    .order("id", { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Map users.name to user_name for frontend compatibility
  const mappedData = data.map((s: any) => ({
    ...s,
    user_name: s.users?.name || "Unknown"
  }));
  
  res.json(mappedData);
});

app.delete("/api/scan/session/:id", authenticateToken, async (req, res) => {
  try {
    const sessionId = req.params.id;

    // 1. Get tracking numbers in this session to revert their status
    const { data: details, error: fetchError } = await supabase
      .from("session_details")
      .select("tracking_number")
      .eq("session_id", sessionId);

    if (fetchError) return res.status(500).json({ error: fetchError.message });

    if (details && details.length > 0) {
      const trackingNumbers = details.map((d: any) => d.tracking_number);
      
      // 2. Revert orders status to 'pending' and clear scanned_at
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: 'pending', scanned_at: null })
        .in("tracking_number", trackingNumbers);
      
      if (updateError) return res.status(500).json({ error: updateError.message });
    }

    // 3. Delete session details
    const { error: detailError } = await supabase
      .from("session_details")
      .delete()
      .eq("session_id", sessionId);
    
    if (detailError) return res.status(500).json({ error: detailError.message });

    // 4. Delete session
    const { error: sessionError } = await supabase
      .from("scan_sessions")
      .delete()
      .eq("id", sessionId);
    
    if (sessionError) return res.status(500).json({ error: sessionError.message });

    res.json({ message: "Session deleted and orders reverted to pending" });
  } catch (err: any) {
    console.error("Delete Session Error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

app.get("/api/scan/session/:id/details", authenticateToken, async (req, res) => {
  const { data: details, error: detailError } = await supabase
    .from("session_details")
    .select("tracking_number")
    .eq("session_id", req.params.id);
  
  if (detailError) return res.status(500).json({ error: detailError.message });

  const trackingNumbers = details.map((d: any) => d.tracking_number);
  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .in("tracking_number", trackingNumbers);
  
  if (orderError) return res.status(500).json({ error: orderError.message });
  res.json(orders);
});

// User Management
app.get("/api/users", authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, name");
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/users", authenticateToken, async (req, res) => {
  const { username, password, role, name } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const { data, error } = await supabase
    .from("users")
    .insert([{ username, password: hashedPassword, role, name }])
    .select();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;

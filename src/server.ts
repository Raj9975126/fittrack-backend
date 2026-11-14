import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import exerciseRoutes from "./routes/exerciseRoutes.js";
import routineRoutes from "./routes/routineRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import prRoutes from "./routes/prRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRateLimiter } from "./middleware/security.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security Middleware (Raj - Day 9 Lockdown)
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows interactive dashboard scripts on GET /
  })
);
app.use(cors({
  origin: "*", // allow mobile and local dev apps
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10kb" })); // Body limit prevents payload bloat attacks
app.use(apiRateLimiter); // Protect API endpoints against DDoS / scraping

// Interactive Browser Dashboard on GET / (For instant browser verification)
app.get("/", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>FitTrack Backend API - Active</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; }
        .container { max-width: 750px; width: 100%; background: #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .badge { background: #10b981; color: #022c22; font-weight: 700; padding: 4px 12px; border-radius: 20px; font-size: 14px; display: inline-block; }
        h1 { margin-top: 12px; font-size: 28px; }
        p { color: #94a3b8; line-height: 1.6; }
        .card { background: #0f172a; border-radius: 10px; padding: 16px; margin-top: 16px; border: 1px solid #334155; }
        button { background: #3b82f6; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-right: 8px; margin-top: 8px; transition: 0.2s; }
        button:hover { background: #2563eb; }
        pre { background: #020617; padding: 12px; border-radius: 8px; color: #38bdf8; overflow-x: auto; font-size: 13px; max-height: 250px; white-space: pre-wrap; }
        .endpoints { list-style: none; padding: 0; }
        .endpoints li { padding: 8px 0; border-bottom: 1px solid #334155; font-family: monospace; }
        .method { font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
        .get { background: #065f46; color: #34d399; }
        .post { background: #1e3a8a; color: #60a5fa; }
      </style>
    </head>
    <body>
      <div class="container">
        <span class="badge">● ONLINE & HEALTHY</span>
        <h1>🏋️ FitTrack Backend API (Raj Lead)</h1>
        <p>This is the REST API server powering the FitTrack mobile app. Because it is a backend server, browser address bar requests show raw JSON.</p>
        
        <div class="card">
          <h3>⚡ Quick Live Test from Browser:</h3>
          <button id="btnHealth" onclick="testHealth()">1. Test /health</button>
          <button id="btnLogin" onclick="testLogin()">2. Test Demo Login</button>
          <button id="btnExercises" onclick="testExercises()">3. Fetch Exercises</button>
          <button id="btnAnalytics" onclick="testAnalytics()">4. Fetch Demo Analytics</button>
          <pre id="output">Click any button above to test endpoints in real time...</pre>
        </div>

        <div class="card">
          <h3>🔑 Demo Account Credentials:</h3>
          <p><strong>Email:</strong> <code>demo@fittrack.com</code><br><strong>Password:</strong> <code>Password123!</code></p>
        </div>

        <div class="card">
          <h3>📡 Core Endpoints:</h3>
          <ul class="endpoints">
            <li><span class="method get">GET</span> <a href="/health" target="_blank" style="color:#38bdf8;">/health</a> — Service uptime status</li>
            <li><span class="method get">GET</span> <a href="/exercises" target="_blank" style="color:#38bdf8;">/exercises</a> — 55+ Standard gym catalog</li>
            <li><span class="method post">POST</span> /auth/login — User authentication</li>
            <li><span class="method get">GET</span> /analytics/summary — Dashboard volume & streak KPIs</li>
            <li><span class="method get">GET</span> /prs — User Personal Records</li>
          </ul>
        </div>
      </div>

      <script>
        let authToken = "";
        const output = document.getElementById('output');

        async function testHealth() {
          output.textContent = "⏳ Fetching /health...";
          try {
            const res = await fetch('/health');
            const data = await res.json();
            output.textContent = JSON.stringify(data, null, 2);
          } catch (e) {
            output.textContent = "❌ Error: " + e.message;
          }
        }

        async function testLogin() {
          output.textContent = "⏳ Logging in demo user (POST /auth/login)...";
          try {
            const res = await fetch('/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: 'demo@fittrack.com', password: 'Password123!' })
            });
            const data = await res.json();
            if (data.data && data.data.token) authToken = data.data.token;
            output.textContent = "✅ LOGIN SUCCESSFUL! Token generated:\\n" + JSON.stringify(data, null, 2);
          } catch (e) {
            output.textContent = "❌ Error: " + e.message;
          }
        }

        async function testExercises() {
          output.textContent = "⏳ Fetching exercises catalog...";
          try {
            const res = await fetch('/exercises');
            const data = await res.json();
            output.textContent = "✅ EXERCISES CATALOG (" + (data.count || 0) + " found):\\n" + JSON.stringify(data, null, 2);
          } catch (e) {
            output.textContent = "❌ Error: " + e.message;
          }
        }

        async function testAnalytics() {
          output.textContent = "⏳ Fetching analytics summary...";
          try {
            if (!authToken) {
              await testLogin();
            }
            const res = await fetch('/analytics/summary', {
              headers: { 'Authorization': 'Bearer ' + authToken }
            });
            const data = await res.json();
            output.textContent = "📊 REAL-TIME ANALYTICS SUMMARY:\\n" + JSON.stringify(data, null, 2);
          } catch (e) {
            output.textContent = "❌ Error: " + e.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Health check endpoints (supports both /health and /api/health)
const handleHealth = (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: "ok",
    message: "FitTrack API is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "FitTrack API",
  });
};

app.get("/health", handleHealth);
app.get("/api/health", handleHealth);

// Routes mounted with /api and /api/v1 prefixes for React Native frontend
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/users", userRoutes);
app.use("/users", userRoutes);

app.use("/api/exercises", exerciseRoutes);
app.use("/exercises", exerciseRoutes);

app.use("/api/v1/routines", routineRoutes);
app.use("/api/routines", routineRoutes);
app.use("/routines", routineRoutes);

app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/sessions", sessionRoutes);

app.use("/api/v1/prs", prRoutes);
app.use("/api/prs", prRoutes);
app.use("/prs", prRoutes);

app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/analytics", analyticsRoutes);

// 404 Fallback
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: "Endpoint does not exist on FitTrack API",
  });
});

// Centralized Error Handler (Raj - Day 2 & Day 9 QA)
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 FitTrack API Server running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/health`);
    console.log(`📊 Analytics APIs: http://localhost:${PORT}/analytics/summary`);
    console.log(`🏆 PR Engine APIs: http://localhost:${PORT}/prs`);
  });
}

export default app;

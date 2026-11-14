process.env.NODE_ENV = "test";

import http from "http";
import app from "../server.js";
import { prisma } from "../db/prisma.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fittrack_super_secure_jwt_secret_key_2026";

async function runLoadTest() {
  console.log("⚡ Starting Day 9 High-Concurrency API Load Test (Raj QA)...\n");

  const server = http.createServer(app);
  const PORT = 5055;
  const HOST = "127.0.0.1";

  await new Promise<void>((resolve) => server.listen(PORT, HOST, () => resolve()));
  console.log(`📡 Load test server listening on http://${HOST}:${PORT}`);

  const demoUser = await prisma.user.findUnique({ where: { email: "demo@fittrack.com" } });
  if (!demoUser) throw new Error("Demo user not found");

  const token = jwt.sign({ id: demoUser.id, email: demoUser.email }, JWT_SECRET, { expiresIn: "1h" });
  const bench = await prisma.exercise.findFirst({ where: { name: "Barbell Bench Press" } });

  interface RequestMetric {
    duration: number;
    statusCode: number;
  }

  async function makeRequest(options: http.RequestOptions, body?: string): Promise<RequestMetric> {
    const start = performance.now();
    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        res.on("data", () => {});
        res.on("end", () => {
          const duration = performance.now() - start;
          resolve({ duration, statusCode: res.statusCode || 500 });
        });
      });

      req.on("error", (err) => {
        const duration = performance.now() - start;
        console.error("HTTP request error:", err.message);
        resolve({ duration, statusCode: 500 });
      });

      if (body) req.write(body);
      req.end();
    });
  }

  async function runBatch(
    title: string,
    requestFn: () => Promise<RequestMetric>,
    totalRequests: number,
    concurrency: number
  ) {
    console.log(`\n🔹 Benchmarking: ${title} (${totalRequests} total, concurrency ${concurrency})`);
    const metrics: RequestMetric[] = [];
    const startTime = performance.now();

    let completed = 0;
    while (completed < totalRequests) {
      const batchSize = Math.min(concurrency, totalRequests - completed);
      const batchPromises = Array.from({ length: batchSize }, () => requestFn());
      const results = await Promise.all(batchPromises);
      metrics.push(...results);
      completed += batchSize;
    }

    const totalTimeMs = performance.now() - startTime;
    const rps = (totalRequests / (totalTimeMs / 1000)).toFixed(1);
    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const p50 = durations[Math.floor(durations.length * 0.5)].toFixed(2);
    const p95 = durations[Math.floor(durations.length * 0.95)].toFixed(2);
    const p99 = durations[Math.floor(durations.length * 0.99)].toFixed(2);
    const errors = metrics.filter((m) => m.statusCode >= 500).length;

    console.log(`   - Throughput: ${rps} req/sec`);
    console.log(`   - Latency (p50): ${p50} ms | (p95): ${p95} ms | (p99): ${p99} ms`);
    console.log(`   - Server 5xx Errors: ${errors} (${((errors / totalRequests) * 100).toFixed(1)}%)`);

    if (errors > 0) {
      throw new Error(`Load test failed with ${errors} server errors`);
    }
  }

  try {
    // 1. Health check baseline
    await runBatch(
      "GET /health",
      () =>
        makeRequest({
          hostname: HOST,
          port: PORT,
          path: "/health",
          method: "GET",
        }),
      100,
      25
    );

    // 2. PR Real-Time Evaluation Endpoint
    await runBatch(
      "POST /prs/evaluate (DB Read + Calculation)",
      () =>
        makeRequest(
          {
            hostname: HOST,
            port: PORT,
            path: "/prs/evaluate",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
          JSON.stringify({ exerciseId: bench?.id, weight: 80, reps: 8 })
        ),
      80,
      20
    );

    // 3. Analytics Summary Aggregation Endpoint
    await runBatch(
      "GET /analytics/summary (Multi-Table Aggregation)",
      () =>
        makeRequest({
          hostname: HOST,
          port: PORT,
          path: "/analytics/summary",
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      60,
      15
    );

    console.log("\n🏆 Load Testing Passed! Server maintained low latency with 0% error rate under load.\n");
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runLoadTest().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});

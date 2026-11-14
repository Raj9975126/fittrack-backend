import { prisma } from "../db/prisma.js";
import { evaluateAndRecordPR } from "../services/prService.js";
import { getAnalyticsSummary, getAnalyticsCharts } from "../services/analyticsService.js";
import { authRateLimiter } from "../middleware/security.js";
import { Request, Response } from "express";

async function runDay9QA() {
  console.log("🛡️ Starting Day 9 Comprehensive QA, Edge-Case & Security Suite (Raj Lead)...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // ==========================================
  // SECTION 1: EDGE CASES & ZERO-CRASH SAFETY
  // ==========================================
  console.log("🔹 [1/4] Testing Edge Cases & Zero-Division Safety (New User with 0 Data)");

  const newUserId = `zero_user_${Date.now()}`;
  const zeroUser = await prisma.user.create({
    data: {
      id: newUserId,
      email: `${newUserId}@fittrack.test`,
      password: "hashed_dummy_password",
      name: "Brand New Athlete",
    },
  });

  const zeroSummary = await getAnalyticsSummary(zeroUser.id);
  assert(zeroSummary.totalWorkouts === 0, "totalWorkouts is 0");
  assert(zeroSummary.totalVolumeAllTime === 0, "totalVolumeAllTime is 0");
  assert(zeroSummary.thisWeekVolume === 0, "thisWeekVolume is 0");
  assert(zeroSummary.lastWeekVolume === 0, "lastWeekVolume is 0");
  assert(!isNaN(zeroSummary.volumeGrowthPercentage), "volumeGrowthPercentage is not NaN");
  assert(zeroSummary.volumeGrowthPercentage === 0, "volumeGrowthPercentage is safely 0% (No divide-by-zero)");
  assert(zeroSummary.avgDurationMinutes === 0, "avgDurationMinutes is 0 without divide-by-zero crash");
  assert(zeroSummary.currentStreakDays === 0, "currentStreakDays is 0");
  assert(zeroSummary.longestStreakDays === 0, "longestStreakDays is 0");

  const zeroCharts = await getAnalyticsCharts(zeroUser.id);
  assert(zeroCharts.weeklyActivity.length === 8, "Generates 8 valid weekly buckets for empty user");
  assert(zeroCharts.strengthProgression.dataPoints.length === 0, "Strength progression handles 0 workouts gracefully");

  // ==========================================
  // SECTION 2: DEFENSIVE PR INPUT HANDLING
  // ==========================================
  console.log("\n🔹 [2/4] Testing Defensive PR Engine Input Validation");
  const bench = await prisma.exercise.findFirst({ where: { name: "Barbell Bench Press" } });
  if (!bench) throw new Error("Bench press not found");

  const negativeResult = await evaluateAndRecordPR({
    userId: zeroUser.id,
    exerciseId: bench.id,
    weight: -50,
    reps: 10,
  });
  assert(negativeResult.isPR === false, "Negative weight is rejected and does not trigger PR");

  const zeroRepsResult = await evaluateAndRecordPR({
    userId: zeroUser.id,
    exerciseId: bench.id,
    weight: 100,
    reps: 0,
  });
  assert(zeroRepsResult.isPR === false, "Zero reps is rejected and does not trigger PR");

  // ==========================================
  // SECTION 3: PR DETECTION LOGIC ACCURACY
  // ==========================================
  console.log("\n🔹 [3/4] Testing Auto-PR Detection Mechanics (Weight vs Volume)");

  // Lift 1: 60kg x 10 = 600kg
  const pr1 = await evaluateAndRecordPR({
    userId: zeroUser.id,
    exerciseId: bench.id,
    weight: 60,
    reps: 10,
  });
  assert(pr1.isPR === true, "First valid lift sets initial PR");
  assert(pr1.isMaxWeight === true, "First lift establishes Max Weight record (60kg)");
  assert(pr1.isMaxVolume === true, "First lift establishes Max Volume record (600kg)");

  // Lift 2: 50kg x 8 = 400kg (submaximal)
  const pr2 = await evaluateAndRecordPR({
    userId: zeroUser.id,
    exerciseId: bench.id,
    weight: 50,
    reps: 8,
  });
  assert(pr2.isPR === false, "Submaximal lift (50kg x 8) does NOT set PR");

  // Lift 3: 80kg x 3 = 240kg (Heavier weight, lower volume)
  const pr3 = await evaluateAndRecordPR({
    userId: zeroUser.id,
    exerciseId: bench.id,
    weight: 80,
    reps: 3,
  });
  assert(pr3.isPR === true, "80kg lift triggers PR");
  assert(pr3.isMaxWeight === true, "Recognizes new Max Weight (80kg > 60kg)");
  assert(pr3.isMaxVolume === false, "Volume correctly retained at 600kg (did not overwrite with 240kg)");

  // Lift 4: 55kg x 15 = 825kg (Lighter weight, higher volume)
  const pr4 = await evaluateAndRecordPR({
    userId: zeroUser.id,
    exerciseId: bench.id,
    weight: 55,
    reps: 15,
  });
  assert(pr4.isPR === true, "825kg volume lift triggers PR");
  assert(pr4.isMaxWeight === false, "55kg is not max weight");
  assert(pr4.isMaxVolume === true, "Recognizes new Max Volume (825kg > 600kg)");

  // ==========================================
  // SECTION 4: SECURITY LOCKDOWN & RATE LIMITING
  // ==========================================
  console.log("\n🔹 [4/4] Testing API Security Lockdown & Rate Limiting");

  // Test Rate Limiter Middleware
  let rateLimitHit: boolean = false;
  let statusSet: number = 0;
  const mockRes: any = {
    setHeader: () => {},
    status: (code: number) => {
      statusSet = code;
      return {
        json: (data: any) => {
          if (data.error === "Too Many Requests") rateLimitHit = true;
        },
      };
    },
  };

  const mockReq: any = {
    ip: "192.168.1.100",
    headers: {},
  };

  // Trigger auth rate limiter 16 times (limit is 15)
  for (let i = 0; i < 16; i++) {
    authRateLimiter(mockReq, mockRes, () => {});
  }
  assert(statusSet === 429 && rateLimitHit === true, "Rate limiter triggers HTTP 429 when threshold exceeded");

  // Clean up test user
  await prisma.user.delete({ where: { id: zeroUser.id } });

  console.log(`\n======================================================`);
  console.log(`🏁 Day 9 QA Suite Results: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runDay9QA()
  .catch((err) => {
    console.error("QA Suite encountered fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { evaluateAndRecordPR } from "../src/services/prService.js";

const prisma = new PrismaClient();

async function seedDemoUser() {
  console.log("🏋️ Starting Demo User Seeding (Raj - Day 7)...");

  const demoEmail = "demo@fittrack.com";
  const demoPassword = "Password123!";

  const existingUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (existingUser) {
    console.log("🧹 Removing existing demo user data...");
    await prisma.user.delete({ where: { email: demoEmail } });
  }

  const hashedPassword = await bcrypt.hash(demoPassword, 10);
  const user = await prisma.user.create({
    data: {
      email: demoEmail,
      password: hashedPassword,
      name: "Alex Demo (FitTrack Pro)",
      profile: {
        create: {
          weight: 76.5,
          height: 178.0,
          fitnessGoals: "Hypertrophy & Progressive Overload",
          unitSystem: "kg",
        },
      },
    },
  });

  console.log(`👤 Created user: ${user.email} (ID: ${user.id})`);

  const benchPress = await prisma.exercise.findFirst({ where: { name: "Barbell Bench Press" } });
  const squat = await prisma.exercise.findFirst({ where: { name: "Barbell Back Squat" } });
  const deadlift = await prisma.exercise.findFirst({ where: { name: "Barbell Deadlift" } });
  const overheadPress = await prisma.exercise.findFirst({ where: { name: "Overhead Barbell Press" } });
  const pullUp = await prisma.exercise.findFirst({ where: { name: "Pull-Up" } });
  const barbellRow = await prisma.exercise.findFirst({ where: { name: "Bent-Over Barbell Row" } });
  const bicepCurl = await prisma.exercise.findFirst({ where: { name: "Barbell Bicep Curl" } });
  const tricepPushdown = await prisma.exercise.findFirst({ where: { name: "Tricep Rope Pushdown" } });

  if (!benchPress || !squat || !deadlift) {
    console.error("❌ Standard exercises missing! Please run `npm run seed` first.");
    return;
  }

  const workouts = [
    {
      name: "Heavy Push Focus",
      exercises: [
        { exercise: benchPress, baseWeight: 70, weightStep: 2.5, sets: 4, reps: [10, 8, 6, 5] },
        { exercise: overheadPress, baseWeight: 40, weightStep: 1.5, sets: 3, reps: [10, 8, 8] },
        { exercise: tricepPushdown, baseWeight: 25, weightStep: 1.0, sets: 3, reps: [12, 12, 10] },
      ],
    },
    {
      name: "Pull & Back Strength",
      exercises: [
        { exercise: deadlift, baseWeight: 110, weightStep: 5.0, sets: 3, reps: [8, 6, 4] },
        { exercise: barbellRow, baseWeight: 60, weightStep: 2.5, sets: 4, reps: [10, 10, 8, 8] },
        { exercise: pullUp, baseWeight: 0, weightStep: 0, sets: 3, reps: [10, 8, 8] },
        { exercise: bicepCurl, baseWeight: 27.5, weightStep: 1.0, sets: 3, reps: [12, 10, 8] },
      ],
    },
    {
      name: "Leg Power & Squat",
      exercises: [
        { exercise: squat, baseWeight: 90, weightStep: 4.0, sets: 4, reps: [10, 8, 6, 5] },
      ],
    },
  ];

  const now = new Date();
  let sessionCount = 0;
  let totalSetsCount = 0;

  for (let dayOffset = 29; dayOffset >= 1; dayOffset -= 2) {
    const workoutIndex = sessionCount % workouts.length;
    const template = workouts[workoutIndex];
    const progressionMultiplier = Math.floor(sessionCount / 2);

    const sessionDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    sessionDate.setHours(17, 30, 0, 0);

    const durationMinutes = 50 + Math.floor(Math.random() * 20);
    const endDate = new Date(sessionDate.getTime() + durationMinutes * 60 * 1000);

    const session = await prisma.workoutSession.create({
      data: {
        userId: user.id,
        name: template.name,
        startTime: sessionDate,
        endTime: endDate,
        status: "COMPLETED",
        notes: `Felt strong! Consistent tempo on week ${Math.floor(sessionCount / 3) + 1}.`,
      },
    });

    sessionCount++;
    let sessionTotalVolume = 0;

    for (const exPlan of template.exercises) {
      if (!exPlan.exercise) continue;

      for (let s = 0; s < exPlan.sets; s++) {
        const reps = exPlan.reps[s] ?? 8;
        const setWeight = exPlan.baseWeight + (progressionMultiplier * exPlan.weightStep) + (s * 2.5);
        const setVolume = setWeight * reps;
        sessionTotalVolume += setVolume;

        const prResult = await evaluateAndRecordPR({
          userId: user.id,
          exerciseId: exPlan.exercise.id,
          weight: setWeight,
          reps,
        });

        await prisma.setLog.create({
          data: {
            sessionId: session.id,
            exerciseId: exPlan.exercise.id,
            setNumber: s + 1,
            weight: setWeight,
            reps,
            rpe: 8 + (s * 0.5),
            isCompleted: true,
            isPR: prResult.isPR,
            createdAt: new Date(sessionDate.getTime() + s * 3 * 60 * 1000),
          },
        });

        totalSetsCount++;
      }
    }

    await prisma.workoutSession.update({
      where: { id: session.id },
      data: { totalVolume: sessionTotalVolume },
    });
  }

  console.log(`✅ Demo User Seed Finished!`);
  console.log(`   - Credentials: ${demoEmail} / ${demoPassword}`);
  console.log(`   - Populated ${sessionCount} completed workouts spanning 30 days.`);
  console.log(`   - Logged ${totalSetsCount} completed sets with auto-calculated PRs.`);
}

seedDemoUser()
  .catch((e) => {
    console.error("❌ Demo seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

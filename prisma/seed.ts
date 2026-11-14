import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const STANDARD_EXERCISES = [
  // CHEST
  { name: "Barbell Bench Press", muscleGroup: "Chest", equipment: "Barbell", instructions: "Lie on flat bench, lower bar to mid-chest, press upward." },
  { name: "Incline Dumbbell Press", muscleGroup: "Chest", equipment: "Dumbbell", instructions: "Set bench to 30-45 degrees, press dumbbells overhead." },
  { name: "Decline Barbell Press", muscleGroup: "Chest", equipment: "Barbell", instructions: "Lie on decline bench, lower bar to lower chest, press." },
  { name: "Dumbbell Chest Fly", muscleGroup: "Chest", equipment: "Dumbbell", instructions: "Lie flat with slight bend in elbows, open arms wide and squeeze at top." },
  { name: "Cable Crossover", muscleGroup: "Chest", equipment: "Cable", instructions: "Bring high cables together in front of hips with controlled arc." },
  { name: "Push-Up", muscleGroup: "Chest", equipment: "Bodyweight", instructions: "Standard bodyweight push-up maintaining rigid plank posture." },
  { name: "Dips (Chest Focus)", muscleGroup: "Chest", equipment: "Bodyweight", instructions: "Lean torso forward on parallel bars, lower until 90-degree arm bend." },
  { name: "Machine Chest Press", muscleGroup: "Chest", equipment: "Machine", instructions: "Sit upright, push handles forward to full extension without locking elbows." },
  { name: "Incline Cable Fly", muscleGroup: "Chest", equipment: "Cable", instructions: "Set low pulleys, bring cables upward across upper chest." },

  // BACK
  { name: "Barbell Deadlift", muscleGroup: "Back", equipment: "Barbell", instructions: "Hinge at hips, pull barbell from floor locking out hips and glutes." },
  { name: "Bent-Over Barbell Row", muscleGroup: "Back", equipment: "Barbell", instructions: "Hinge at 45 degrees, pull barbell to lower chest/upper abdomen." },
  { name: "Pull-Up", muscleGroup: "Back", equipment: "Bodyweight", instructions: "Pronated grip, pull chest up towards bar, control the descent." },
  { name: "Chin-Up", muscleGroup: "Back", equipment: "Bodyweight", instructions: "Supinated grip, pull chin above bar, engages lats and biceps." },
  { name: "Lat Pulldown", muscleGroup: "Back", equipment: "Cable", instructions: "Pull wide bar down towards upper chest, squeeze shoulder blades." },
  { name: "Single-Arm Dumbbell Row", muscleGroup: "Back", equipment: "Dumbbell", instructions: "One knee on bench, pull dumbbell towards hip pocket." },
  { name: "Seated Cable Row", muscleGroup: "Back", equipment: "Cable", instructions: "Neutral spine, pull v-bar handle to navel with full lat squeeze." },
  { name: "T-Bar Row", muscleGroup: "Back", equipment: "Barbell", instructions: "Straddle bar with neutral grip, row weight towards chest." },
  { name: "Back Hyperextension", muscleGroup: "Back", equipment: "Bodyweight", instructions: "On 45-degree bench, extend spine to strengthen lower back and glutes." },
  { name: "Face Pull", muscleGroup: "Back", equipment: "Cable", instructions: "Pull rope attachment towards eyes, rotating shoulders back." },

  // LEGS
  { name: "Barbell Back Squat", muscleGroup: "Legs", equipment: "Barbell", instructions: "Bar across traps, squat to parallel or below, drive through heels." },
  { name: "Front Squat", muscleGroup: "Legs", equipment: "Barbell", instructions: "Bar resting across front deltoids, keep torso upright while squatting." },
  { name: "Romanian Deadlift", muscleGroup: "Legs", equipment: "Barbell", instructions: "Hinge at hips with soft knees, feel stretch in hamstrings, return upright." },
  { name: "Leg Press", muscleGroup: "Legs", equipment: "Machine", instructions: "Feet shoulder-width on platform, lower until knees at 90 degrees." },
  { name: "Bulgarian Split Squat", muscleGroup: "Legs", equipment: "Dumbbell", instructions: "Rear foot elevated on bench, lower until front thigh is parallel to ground." },
  { name: "Walking Dumbbell Lunge", muscleGroup: "Legs", equipment: "Dumbbell", instructions: "Step forward into a deep lunge alternating legs." },
  { name: "Leg Extension", muscleGroup: "Legs", equipment: "Machine", instructions: "Seated on machine, extend lower legs to contract quadriceps." },
  { name: "Lying Leg Curl", muscleGroup: "Legs", equipment: "Machine", instructions: "Prone position, curl weight towards glutes engaging hamstrings." },
  { name: "Standing Calf Raise", muscleGroup: "Legs", equipment: "Machine", instructions: "Balls of feet on block, raise heels to maximum contraction." },
  { name: "Seated Calf Raise", muscleGroup: "Legs", equipment: "Machine", instructions: "Knee pads resting on thighs, raise heels targeting soleus." },
  { name: "Goblet Squat", muscleGroup: "Legs", equipment: "Dumbbell", instructions: "Hold dumbbell vertically at chest, perform deep squat." },

  // SHOULDERS
  { name: "Overhead Barbell Press", muscleGroup: "Shoulders", equipment: "Barbell", instructions: "Stand tall, press barbell overhead from collarbone to lockout." },
  { name: "Seated Dumbbell Shoulder Press", muscleGroup: "Shoulders", equipment: "Dumbbell", instructions: "Press dumbbells vertically until arms extended overhead." },
  { name: "Dumbbell Lateral Raise", muscleGroup: "Shoulders", equipment: "Dumbbell", instructions: "Raise dumbbells laterally until parallel to floor, soft elbows." },
  { name: "Cable Lateral Raise", muscleGroup: "Shoulders", equipment: "Cable", instructions: "Constant tension side raise using low cable pulley." },
  { name: "Dumbbell Front Raise", muscleGroup: "Shoulders", equipment: "Dumbbell", instructions: "Raise weights straight in front to shoulder height." },
  { name: "Reverse Pec Deck Fly", muscleGroup: "Shoulders", equipment: "Machine", instructions: "Fly handles outward targeting posterior deltoids." },
  { name: "Arnold Press", muscleGroup: "Shoulders", equipment: "Dumbbell", instructions: "Rotate wrists outward as you press dumbbells upward overhead." },
  { name: "Barbell Upright Row", muscleGroup: "Shoulders", equipment: "Barbell", instructions: "Pull bar straight up along torso towards collarbones." },
  { name: "Dumbbell Shrug", muscleGroup: "Shoulders", equipment: "Dumbbell", instructions: "Elevate shoulders straight towards ears, hold peak contraction." },

  // ARMS
  { name: "Barbell Bicep Curl", muscleGroup: "Arms", equipment: "Barbell", instructions: "Standing curl with straight or EZ bar, pinning elbows at sides." },
  { name: "Dumbbell Hammer Curl", muscleGroup: "Arms", equipment: "Dumbbell", instructions: "Neutral grip curl targeting brachialis and forearms." },
  { name: "Incline Dumbbell Curl", muscleGroup: "Arms", equipment: "Dumbbell", instructions: "Bench at 45 degrees, full stretch on long head of bicep." },
  { name: "Preacher Curl", muscleGroup: "Arms", equipment: "Machine", instructions: "Arms flat on preacher pad, isolate biceps with zero momentum." },
  { name: "Cable Rope Bicep Curl", muscleGroup: "Arms", equipment: "Cable", instructions: "Low pulley rope curl with forearm flare at peak contraction." },
  { name: "Tricep Rope Pushdown", muscleGroup: "Arms", equipment: "Cable", instructions: "Push down through cable, spreading rope at bottom." },
  { name: "Skull Crusher (Lying Tricep Extension)", muscleGroup: "Arms", equipment: "Barbell", instructions: "Lie on bench, lower EZ bar towards forehead, extend elbows." },
  { name: "Overhead Dumbbell Tricep Extension", muscleGroup: "Arms", equipment: "Dumbbell", instructions: "Hold dumbbell overhead with both hands, lower behind head." },
  { name: "Close-Grip Barbell Bench Press", muscleGroup: "Arms", equipment: "Barbell", instructions: "Hands shoulder-width on bar, tuck elbows close to ribs." },
  { name: "Dips (Tricep Focus)", muscleGroup: "Arms", equipment: "Bodyweight", instructions: "Keep torso vertical on parallel bars to load triceps." },

  // CORE
  { name: "Hanging Leg Raise", muscleGroup: "Core", equipment: "Bodyweight", instructions: "Hang from pull-up bar, raise toes toward bar without swinging." },
  { name: "Cable Woodchopper", muscleGroup: "Core", equipment: "Cable", instructions: "Diagonal rotational pull across body for oblique strength." },
  { name: "Ab Wheel Rollout", muscleGroup: "Core", equipment: "Bodyweight", instructions: "Roll wheel forward maintaining posterior pelvic tilt, pull back." },
  { name: "Plank", muscleGroup: "Core", equipment: "Bodyweight", instructions: "Isometric forearm hold with engaged core and glutes." },
  { name: "Russian Twist", muscleGroup: "Core", equipment: "Bodyweight", instructions: "Seated V-position, twist torso side to side." },
  { name: "Cable Crunch", muscleGroup: "Core", equipment: "Cable", instructions: "Kneel under high pulley, crunch torso down curling spine." }
];

async function seed() {
  console.log("🌱 Starting Exercise Library Seed (Raj - Day 2)...");

  let createdCount = 0;
  for (const exercise of STANDARD_EXERCISES) {
    const existing = await prisma.exercise.findFirst({
      where: { name: exercise.name, isCustom: false },
    });

    if (!existing) {
      await prisma.exercise.create({
        data: {
          ...exercise,
          isCustom: false,
        },
      });
      createdCount++;
    }
  }

  console.log(`✅ Seed Complete! Populated ${createdCount} new standard exercises (Total catalog: ${STANDARD_EXERCISES.length}).`);
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

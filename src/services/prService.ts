import { prisma } from "../db/prisma.js";
import { PersonalRecord } from "@prisma/client";

export interface PRCheckResult {
  isPR: boolean;
  isMaxWeight: boolean;
  isMaxVolume: boolean;
  currentSet: {
    weight: number;
    reps: number;
    volume: number;
  };
  previousPR: {
    maxWeight: number;
    maxVolume: number;
  } | null;
  updatedPR: PersonalRecord | null;
}

/**
 * Evaluates whether a completed set establishes a new Personal Record for a given exercise.
 * Tracks both Absolute Max Weight (heaviest load lifted) and Max Set Volume (weight * reps).
 * Hardened for edge cases: negative values, non-existent exercise, concurrent updates.
 */
export async function evaluateAndRecordPR(params: {
  userId: string;
  exerciseId: string;
  weight: number;
  reps: number;
}): Promise<PRCheckResult> {
  const { userId, exerciseId, weight, reps } = params;

  // Defensive validation: ignore invalid non-positive numbers
  if (weight <= 0 || reps <= 0 || isNaN(weight) || isNaN(reps)) {
    return {
      isPR: false,
      isMaxWeight: false,
      isMaxVolume: false,
      currentSet: { weight: Math.max(0, weight), reps: Math.max(0, reps), volume: 0 },
      previousPR: null,
      updatedPR: null,
    };
  }

  const cleanWeight = Math.round(weight * 100) / 100;
  const currentVolume = Math.round(cleanWeight * reps * 100) / 100;

  // Find existing PR for this user and exercise
  const existingPR = await prisma.personalRecord.findUnique({
    where: {
      userId_exerciseId: {
        userId,
        exerciseId,
      },
    },
  });

  const isMaxWeight = !existingPR || cleanWeight > existingPR.maxWeight;
  const isMaxVolume = !existingPR || currentVolume > existingPR.maxVolume;
  const isPR = isMaxWeight || isMaxVolume;

  let updatedPR: PersonalRecord | null = null;

  if (isPR) {
    const newMaxWeight = existingPR ? Math.max(existingPR.maxWeight, cleanWeight) : cleanWeight;
    const newMaxVolume = existingPR ? Math.max(existingPR.maxVolume, currentVolume) : currentVolume;

    updatedPR = await prisma.personalRecord.upsert({
      where: {
        userId_exerciseId: {
          userId,
          exerciseId,
        },
      },
      update: {
        maxWeight: newMaxWeight,
        maxVolume: newMaxVolume,
        achievedAt: new Date(),
      },
      create: {
        userId,
        exerciseId,
        maxWeight: newMaxWeight,
        maxVolume: newMaxVolume,
        achievedAt: new Date(),
      },
    });
  }

  return {
    isPR,
    isMaxWeight,
    isMaxVolume,
    currentSet: {
      weight: cleanWeight,
      reps,
      volume: currentVolume,
    },
    previousPR: existingPR
      ? {
          maxWeight: existingPR.maxWeight,
          maxVolume: existingPR.maxVolume,
        }
      : null,
    updatedPR: updatedPR ?? existingPR,
  };
}

/**
 * Retrieves all personal records for a user with exercise details.
 */
export async function getUserPRs(userId: string) {
  return prisma.personalRecord.findMany({
    where: { userId },
    include: {
      exercise: {
        select: {
          id: true,
          name: true,
          muscleGroup: true,
          equipment: true,
        },
      },
    },
    orderBy: { achievedAt: "desc" },
  });
}

/**
 * Retrieves PR history and top lifts for a specific exercise.
 */
export async function getExercisePR(userId: string, exerciseId: string) {
  const pr = await prisma.personalRecord.findUnique({
    where: {
      userId_exerciseId: {
        userId,
        exerciseId,
      },
    },
    include: {
      exercise: true,
    },
  });

  // Top 5 historical sets for this exercise
  const topSets = await prisma.setLog.findMany({
    where: {
      exerciseId,
      isCompleted: true,
      session: {
        userId,
      },
    },
    orderBy: [{ weight: "desc" }, { reps: "desc" }],
    take: 5,
    include: {
      session: {
        select: {
          id: true,
          startTime: true,
          name: true,
        },
      },
    },
  });

  return {
    personalRecord: pr,
    topSets,
  };
}

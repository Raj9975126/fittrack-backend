import { prisma } from "../db/prisma.js";

export interface AnalyticsSummary {
  totalWorkouts: number;
  totalVolumeAllTime: number;
  thisWeekVolume: number;
  lastWeekVolume: number;
  volumeGrowthPercentage: number;
  currentStreakDays: number;
  longestStreakDays: number;
  avgDurationMinutes: number;
  totalSetsLogged: number;
}

export interface WeeklyChartPoint {
  weekLabel: string;
  startDate: string;
  workoutCount: number;
  totalVolume: number;
}

export interface StrengthChartPoint {
  date: string;
  maxWeight: number;
  maxVolume: number;
  repsAtMaxWeight: number;
  sessionName: string;
}

/**
 * Calculates high-level summary KPIs for the user's dashboard.
 * Designed with defensive coding to prevent division by zero for new users (Day 9 QA).
 */
export async function getAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
  const now = new Date();
  
  // Start of current week (last 7 days window)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Fetch all completed sessions for user
  const completedSessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      status: "COMPLETED",
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      totalVolume: true,
    },
    orderBy: { startTime: "asc" },
  });

  const totalWorkouts = completedSessions.length;

  // Total volume all time
  const totalVolumeAllTime = completedSessions.reduce(
    (sum, session) => sum + (session.totalVolume || 0),
    0
  );

  // Total sets completed
  const totalSetsLogged = await prisma.setLog.count({
    where: {
      isCompleted: true,
      session: {
        userId,
      },
    },
  });

  // Volumes for this week vs last week
  let thisWeekVolume = 0;
  let lastWeekVolume = 0;

  for (const session of completedSessions) {
    const sessionTime = new Date(session.startTime).getTime();
    if (sessionTime >= sevenDaysAgo.getTime()) {
      thisWeekVolume += session.totalVolume || 0;
    } else if (sessionTime >= fourteenDaysAgo.getTime()) {
      lastWeekVolume += session.totalVolume || 0;
    }
  }

  // Safe percentage growth calculation (avoids Division by Zero)
  let volumeGrowthPercentage = 0;
  if (lastWeekVolume > 0) {
    volumeGrowthPercentage = Number(
      (((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100).toFixed(1)
    );
  } else if (thisWeekVolume > 0) {
    volumeGrowthPercentage = 100.0;
  }

  // Calculate average duration in minutes safely
  let totalDurationMinutes = 0;
  let sessionsWithDuration = 0;

  for (const session of completedSessions) {
    if (session.startTime && session.endTime) {
      const diffMs = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
      const minutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
      if (minutes > 0) {
        totalDurationMinutes += minutes;
        sessionsWithDuration++;
      }
    }
  }

  const avgDurationMinutes =
    sessionsWithDuration > 0
      ? Math.round(totalDurationMinutes / sessionsWithDuration)
      : 0;

  // Streak calculations (Active workout days streak)
  const uniqueWorkoutDays = Array.from(
    new Set(
      completedSessions.map((s) =>
        new Date(s.startTime).toISOString().slice(0, 10)
      )
    )
  ).sort();

  const { currentStreakDays, longestStreakDays } = calculateStreaks(uniqueWorkoutDays);

  return {
    totalWorkouts,
    totalVolumeAllTime: Number(totalVolumeAllTime.toFixed(2)),
    thisWeekVolume: Number(thisWeekVolume.toFixed(2)),
    lastWeekVolume: Number(lastWeekVolume.toFixed(2)),
    volumeGrowthPercentage,
    currentStreakDays,
    longestStreakDays,
    avgDurationMinutes,
    totalSetsLogged,
  };
}

/**
 * Helper to compute active day streaks
 */
function calculateStreaks(sortedDateStrings: string[]): {
  currentStreakDays: number;
  longestStreakDays: number;
} {
  if (sortedDateStrings.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0 };
  }

  let longest = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDateStrings.length; i++) {
    const prev = new Date(sortedDateStrings[i - 1]).getTime();
    const curr = new Date(sortedDateStrings[i]).getTime();
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > longest) longest = currentStreak;
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }

  // Check if current streak extends to today or yesterday
  const lastDate = new Date(sortedDateStrings[sortedDateStrings.length - 1]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);

  const daysSinceLast = Math.round(
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const activeCurrentStreak = daysSinceLast <= 1 ? currentStreak : 0;

  return {
    currentStreakDays: activeCurrentStreak,
    longestStreakDays: longest,
  };
}

/**
 * Generates aggregated time-series chart data for:
 * 1. Weekly workout frequency & volume (last 8 weeks)
 * 2. Strength progression for a specified exercise (or top exercise)
 */
export async function getAnalyticsCharts(
  userId: string,
  exerciseId?: string,
  weeks: number = 8
) {
  const now = new Date();
  const weeklyData: WeeklyChartPoint[] = [];

  // Generate consecutive weekly buckets
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

    const sessionsInWeek = await prisma.workoutSession.findMany({
      where: {
        userId,
        status: "COMPLETED",
        startTime: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      select: {
        totalVolume: true,
      },
    });

    const totalVolume = sessionsInWeek.reduce(
      (acc, s) => acc + (s.totalVolume || 0),
      0
    );

    weeklyData.push({
      weekLabel: `W-${i === 0 ? "Current" : i}`,
      startDate: weekStart.toISOString().slice(0, 10),
      workoutCount: sessionsInWeek.length,
      totalVolume: Number(totalVolume.toFixed(2)),
    });
  }

  // Determine which exercise to chart for strength progression
  let targetExerciseId = exerciseId;
  let targetExerciseName = "Exercise Progression";

  if (!targetExerciseId) {
    const mostLogged = await prisma.setLog.groupBy({
      by: ["exerciseId"],
      where: {
        session: { userId },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 1,
    });

    if (mostLogged.length > 0) {
      targetExerciseId = mostLogged[0].exerciseId;
    }
  }

  const strengthProgression: StrengthChartPoint[] = [];

  if (targetExerciseId) {
    const exercise = await prisma.exercise.findUnique({
      where: { id: targetExerciseId },
      select: { name: true },
    });
    if (exercise) targetExerciseName = exercise.name;

    const sessionsWithExercise = await prisma.workoutSession.findMany({
      where: {
        userId,
        status: "COMPLETED",
        setLogs: {
          some: { exerciseId: targetExerciseId, isCompleted: true },
        },
      },
      include: {
        setLogs: {
          where: { exerciseId: targetExerciseId, isCompleted: true },
        },
      },
      orderBy: { startTime: "asc" },
      take: 20,
    });

    for (const session of sessionsWithExercise) {
      if (session.setLogs.length === 0) continue;

      let maxWeight = 0;
      let repsAtMax = 0;
      let maxSetVolume = 0;

      for (const set of session.setLogs) {
        if (set.weight > maxWeight) {
          maxWeight = set.weight;
          repsAtMax = set.reps;
        }
        const setVolume = set.weight * set.reps;
        if (setVolume > maxSetVolume) {
          maxSetVolume = setVolume;
        }
      }

      strengthProgression.push({
        date: session.startTime.toISOString().slice(0, 10),
        maxWeight,
        repsAtMaxWeight: repsAtMax,
        maxVolume: Number(maxSetVolume.toFixed(2)),
        sessionName: session.name,
      });
    }
  }

  return {
    weeklyActivity: weeklyData,
    strengthProgression: {
      exerciseId: targetExerciseId || null,
      exerciseName: targetExerciseName,
      dataPoints: strengthProgression,
    },
  };
}

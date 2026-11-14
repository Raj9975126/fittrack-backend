import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { evaluateAndRecordPR } from "../services/prService.js";

const router = Router();

const startSessionSchema = z.object({
  name: z.string().min(1).default("Workout Session"),
  routineId: z.string().optional(),
  notes: z.string().optional(),
});

const logSetSchema = z.object({
  exerciseId: z.string().min(1, "exerciseId is required"),
  setNumber: z.number().int().positive(),
  weight: z.number().nonnegative(),
  reps: z.number().int().positive(),
  rpe: z.number().min(1).max(10).optional(),
  isCompleted: z.boolean().default(true),
  notes: z.string().optional(),
});

const completeSessionSchema = z.object({
  notes: z.string().optional(),
});

router.post("/", authenticate, validateBody(startSessionSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, routineId, notes } = req.body;

    const session = await prisma.workoutSession.create({
      data: {
        userId,
        name,
        routineId,
        notes,
        status: "IN_PROGRESS",
      },
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/sets", authenticate, validateBody(logSetSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    const { exerciseId, setNumber, weight, reps, rpe, isCompleted, notes } = req.body;

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }

    let isPR = false;
    let prDetails = null;

    if (isCompleted && weight > 0 && reps > 0) {
      const prResult = await evaluateAndRecordPR({
        userId,
        exerciseId,
        weight,
        reps,
      });
      isPR = prResult.isPR;
      prDetails = prResult;
    }

    const setLog = await prisma.setLog.create({
      data: {
        sessionId,
        exerciseId,
        setNumber,
        weight,
        reps,
        rpe,
        isCompleted,
        isPR,
        notes,
      },
      include: {
        exercise: true,
      },
    });

    if (isCompleted) {
      const setVolume = weight * reps;
      await prisma.workoutSession.update({
        where: { id: sessionId },
        data: {
          totalVolume: {
            increment: setVolume,
          },
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        set: setLog,
        prEvaluation: prDetails,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/complete", authenticate, validateBody(completeSessionSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    const { notes } = req.body;

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        setLogs: true,
      },
    });

    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }

    const totalVolume = session.setLogs
      .filter((s: { isCompleted: boolean }) => s.isCompleted)
      .reduce((acc: number, s: { weight: number; reps: number }) => acc + s.weight * s.reps, 0);

    const updated = await prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endTime: new Date(),
        totalVolume,
        notes: notes ?? session.notes,
      },
      include: {
        setLogs: {
          include: { exercise: true },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.get("/history", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const history = await prisma.workoutSession.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { startTime: "desc" },
      include: {
        setLogs: {
          include: {
            exercise: {
              select: { id: true, name: true, muscleGroup: true },
            },
          },
        },
      },
    });

    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    next(err);
  }
});

export default router;

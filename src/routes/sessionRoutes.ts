import { Router, Response, NextFunction } from "express";
import { prisma } from "../db/prisma.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";
import { evaluateAndRecordPR } from "../services/prService.js";

const router = Router();

router.use(authenticate);

/**
 * @route   GET /sessions (and /api/sessions)
 * @desc    Get user sessions list
 */
router.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sessions = await prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { startTime: "desc" },
      include: {
        setLogs: {
          include: { exercise: true },
        },
      },
    });

    res.json({
      success: true,
      message: "Sessions fetched successfully",
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /sessions (and /api/sessions)
 * @desc    Start a new active workout session
 */
router.post("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, routineId, notes } = req.body;

    const session = await prisma.workoutSession.create({
      data: {
        userId,
        name: name || "Workout Session",
        routineId,
        notes,
        status: "IN_PROGRESS",
      },
      include: {
        setLogs: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Session started successfully",
      data: session,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /sessions/history (and /api/sessions/history)
 * @desc    Get user workout history
 */
router.get("/history", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

/**
 * @route   GET /sessions/:id
 * @desc    Get single session details
 */
router.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        setLogs: {
          include: { exercise: true },
          orderBy: { setNumber: "asc" },
        },
      },
    });

    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PATCH /sessions/:id
 * @desc    Update session details
 */
router.patch("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    const { name, notes, status, endTime } = req.body;

    const updated = await prisma.workoutSession.updateMany({
      where: { id: sessionId, userId },
      data: {
        name,
        notes,
        status,
        endTime: endTime ? new Date(endTime) : undefined,
      },
    });

    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: { setLogs: true },
    });

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /sessions/:id/sets
 * @desc    Get all sets for a session
 */
router.get("/:id/sets", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.id as string;

    const sets = await prisma.setLog.findMany({
      where: { sessionId },
      include: { exercise: true },
      orderBy: { setNumber: "asc" },
    });

    res.json({ success: true, data: sets });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /sessions/:id/sets & PUT /sessions/:id/sets
 * @desc    Log or batch save sets
 */
const handleSaveSets = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      res.status(404).json({ success: false, message: "Session not found" });
      return;
    }

    // Support both batch sets array or single set body
    const rawSets = req.body.sets && Array.isArray(req.body.sets) ? req.body.sets : [req.body];
    const savedSets = [];

    for (const s of rawSets) {
      const weight = Number(s.weight) || 0;
      const reps = Number(s.reps) || 0;
      const isCompleted = s.isCompleted !== undefined ? Boolean(s.isCompleted) : true;
      let isPR = false;

      if (isCompleted && weight > 0 && reps > 0 && s.exerciseId) {
        const prResult = await evaluateAndRecordPR({
          userId,
          exerciseId: s.exerciseId,
          weight,
          reps,
        });
        isPR = prResult.isPR;
      }

      const setLog = await prisma.setLog.create({
        data: {
          sessionId,
          exerciseId: s.exerciseId,
          setNumber: Number(s.setNumber) || 1,
          weight,
          reps,
          rpe: s.rpe ? Number(s.rpe) : undefined,
          isCompleted,
          isPR,
          notes: s.notes,
        },
        include: { exercise: true },
      });

      if (isCompleted) {
        await prisma.workoutSession.update({
          where: { id: sessionId },
          data: { totalVolume: { increment: weight * reps } },
        });
      }

      savedSets.push(setLog);
    }

    res.status(201).json({
      success: true,
      message: "Sets saved successfully",
      data: req.body.sets ? savedSets : savedSets[0],
    });
  } catch (err) {
    next(err);
  }
};

router.post("/:id/sets", handleSaveSets);
router.put("/:id/sets", handleSaveSets);

/**
 * @route   POST /sessions/:id/complete
 * @desc    Complete and close a workout session
 */
router.post("/:id/complete", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id as string;
    const { notes } = req.body;

    const session = await prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
      include: { setLogs: true },
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
        setLogs: { include: { exercise: true } },
      },
    });

    res.json({ success: true, message: "Workout session completed", data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;

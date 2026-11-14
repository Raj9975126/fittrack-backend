import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const createExerciseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  muscleGroup: z.string().min(2, "Muscle group is required"),
  equipment: z.string().min(2, "Equipment is required"),
  instructions: z.string().optional(),
});

/**
 * @route   GET /exercises/options (must stay above /:id)
 * @desc    Returns unique muscle groups and equipment options
 */
router.get("/options", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const exercises = await prisma.exercise.findMany({
      select: { muscleGroup: true, equipment: true },
    });

    const muscleGroups = Array.from(new Set(exercises.map((e) => e.muscleGroup))).sort();
    const equipment = Array.from(new Set(exercises.map((e) => e.equipment))).sort();

    res.json({
      success: true,
      data: {
        muscleGroups,
        equipment,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /exercises/previous-sets (must stay above /:id)
 * @desc    Get previous set logs for exercise IDs
 */
router.get("/previous-sets", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idsParam = req.query.ids as string;
    if (!idsParam) {
      res.json({ success: true, data: {} });
      return;
    }

    const exerciseIds = idsParam.split(",").map((s) => s.trim());
    const result: Record<string, any> = {};

    for (const exId of exerciseIds) {
      const lastSession = await prisma.workoutSession.findFirst({
        where: {
          status: "COMPLETED",
          setLogs: {
            some: { exerciseId: exId, isCompleted: true },
          },
        },
        orderBy: { startTime: "desc" },
        include: {
          setLogs: {
            where: { exerciseId: exId, isCompleted: true },
            orderBy: { setNumber: "asc" },
          },
        },
      });

      if (lastSession) {
        result[exId] = {
          sessionId: lastSession.id,
          sessionName: lastSession.name,
          performedAt: lastSession.startTime,
          sets: lastSession.setLogs.map((s) => ({
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
          })),
        };
      }
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /exercises
 * @desc    Get exercises catalog with filters and pagination
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { muscle, search, mine, page, limit } = req.query;

    const where: any = {};
    if (muscle && typeof muscle === "string") {
      where.muscleGroup = { contains: muscle };
    }
    if (search && typeof search === "string") {
      where.name = { contains: search };
    }

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      count: exercises.length,
      data: exercises,
      pagination: {
        page: Number(page) || 1,
        limit: Number(limit) || 50,
        total: exercises.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /exercises/:id
 * @desc    Get single exercise by ID
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const exercise = await prisma.exercise.findUnique({
      where: { id },
    });

    if (!exercise) {
      res.status(404).json({ success: false, message: "Exercise not found" });
      return;
    }

    res.json({ success: true, data: exercise });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /exercises
 * @desc    Create custom exercise
 */
router.post("/", authenticate, validateBody(createExerciseSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, muscleGroup, equipment, instructions } = req.body;
    const userId = req.user!.id;

    const exercise = await prisma.exercise.create({
      data: {
        name,
        muscleGroup,
        equipment,
        instructions,
        isCustom: true,
        createdById: userId,
      },
    });

    res.status(201).json({
      success: true,
      data: exercise,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /exercises/:id
 * @desc    Delete custom exercise
 */
router.delete("/:id", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.exercise.delete({
      where: { id },
    });

    res.json({ success: true, message: "Exercise deleted successfully", data: { id } });
  } catch (err) {
    next(err);
  }
});

export default router;

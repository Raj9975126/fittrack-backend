import { Router, Response, NextFunction } from "express";
import { prisma } from "../db/prisma.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

/**
 * @route   GET /routines (and /api/routines)
 * @desc    Get all routines for the authenticated user
 */
router.get("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const routines = await prisma.workoutRoutine.findMany({
      where: { userId },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      message: "Workout routines fetched successfully",
      data: routines,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /routines (and /api/routines)
 * @desc    Create a new routine with exercises
 */
router.post("/", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, description, exercises } = req.body;

    const routine = await prisma.workoutRoutine.create({
      data: {
        userId,
        name: name || "New Routine",
        description,
        exercises: exercises && Array.isArray(exercises)
          ? {
              create: exercises.map((ex: any, idx: number) => ({
                exerciseId: ex.exerciseId,
                order: ex.order !== undefined ? ex.order : idx,
                targetSets: ex.targetSets || 3,
                targetReps: ex.targetReps || 10,
                notes: ex.notes,
              })),
            }
          : undefined,
      },
      include: {
        exercises: {
          include: { exercise: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Workout routine created successfully",
      data: routine,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /routines/:id (and /api/routines/:id)
 * @desc    Get a routine by ID
 */
router.get("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const routine = await prisma.workoutRoutine.findUnique({
      where: { id },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!routine) {
      res.status(404).json({ success: false, message: "Workout routine not found" });
      return;
    }

    res.json({
      success: true,
      message: "Workout routine fetched successfully",
      data: routine,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /routines/:id/exercises (and /api/routines/:id/exercises)
 * @desc    Replace all exercises in a routine
 */
router.put("/:id/exercises", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const routineId = req.params.id as string;
    const { exercises } = req.body;

    // Delete existing routine exercises
    await prisma.routineExercise.deleteMany({
      where: { routineId },
    });

    // Create new ones
    if (exercises && Array.isArray(exercises)) {
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i];
        await prisma.routineExercise.create({
          data: {
            routineId,
            exerciseId: ex.exerciseId,
            order: ex.order !== undefined ? ex.order : i,
            targetSets: ex.targetSets || 3,
            targetReps: ex.targetReps || 10,
            notes: ex.notes,
          },
        });
      }
    }

    const updated = await prisma.workoutRoutine.findUnique({
      where: { id: routineId },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
    });

    res.json({
      success: true,
      message: "Routine exercises saved successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /routines/:id (and /api/routines/:id)
 * @desc    Delete a routine
 */
router.delete("/:id", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.workoutRoutine.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Workout routine deleted successfully",
      data: { id },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

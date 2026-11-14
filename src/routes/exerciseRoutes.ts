import { Router, Response, NextFunction } from "express";
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

router.get("/", async (req, res, next) => {
  try {
    const { muscle, search } = req.query;

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
    });
  } catch (err) {
    next(err);
  }
});

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

export default router;

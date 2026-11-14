import { Router, Response } from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";
import { getUserPRs, getExercisePR, evaluateAndRecordPR } from "../services/prService.js";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const checkPRSchema = z.object({
  exerciseId: z.string().min(1, "exerciseId is required"),
  weight: z.number().positive("weight must be greater than 0"),
  reps: z.number().int().positive("reps must be at least 1"),
});

/**
 * @route   GET /prs
 * @desc    Get all Personal Records for authenticated user
 * @access  Private
 */
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const prs = await getUserPRs(userId);

    res.json({
      success: true,
      count: prs.length,
      data: prs,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /prs/:exerciseId
 * @desc    Get PR and historical top lifts for a specific exercise
 * @access  Private
 */
router.get("/:exerciseId", authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const exerciseId = req.params.exerciseId as string;

    const data = await getExercisePR(userId, exerciseId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /prs/evaluate
 * @desc    Evaluates a set in real-time to check if it sets a new PR
 * @access  Private
 */
router.post(
  "/evaluate",
  authenticate,
  validateBody(checkPRSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const { exerciseId, weight, reps } = req.body;

      const result = await evaluateAndRecordPR({
        userId,
        exerciseId,
        weight,
        reps,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

import { Router, Response } from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";
import { getAnalyticsSummary, getAnalyticsCharts } from "../services/analyticsService.js";
import { z } from "zod";
import { validateQuery } from "../middleware/validate.js";

const router = Router();

const chartsQuerySchema = z.object({
  exerciseId: z.string().optional(),
  weeks: z.coerce.number().int().min(1).max(52).default(8),
});

/**
 * @route   GET /analytics/summary
 * @desc    Get dashboard KPIs (total volume, workouts, streaks, avg duration)
 * @access  Private
 */
router.get("/summary", authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const summary = await getAnalyticsSummary(userId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /analytics/charts
 * @desc    Get time-series charts (weekly volume/frequency, strength progression)
 * @access  Private
 */
router.get(
  "/charts",
  authenticate,
  validateQuery(chartsQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const userId = req.user!.id;
      const exerciseId = req.query.exerciseId as string | undefined;
      const weeks = Number(req.query.weeks) || 8;

      const chartsData = await getAnalyticsCharts(userId, exerciseId, weeks);

      res.json({
        success: true,
        data: chartsData,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

import { Router, Response } from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";
import { getAnalyticsSummary, getAnalyticsCharts } from "../services/analyticsService.js";

const router = Router();

router.use(authenticate);

/**
 * @route   GET /analytics/summary
 * @desc    Get dashboard KPIs
 */
router.get("/summary", async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const summary = await getAnalyticsSummary(userId);

    res.json({
      success: true,
      message: "Analytics summary fetched successfully",
      data: summary,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /analytics/charts/weekly-frequency
 * @desc    Get weekly frequency bar chart data
 */
router.get("/charts/weekly-frequency", async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const weeks = Number(req.query.weeks) || 8;
    const chartsData = await getAnalyticsCharts(userId, undefined, weeks);

    res.json({
      success: true,
      data: chartsData.weeklyActivity,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /analytics/charts/strength-progression and /charts/strength-progression/:exerciseId
 * @desc    Get strength progression line chart data
 */
const handleStrengthProgression = async (req: AuthenticatedRequest, res: Response, next: any) => {
  try {
    const userId = req.user!.id;
    const exerciseId = (req.params.exerciseId || req.query.exerciseId) as string | undefined;
    const chartsData = await getAnalyticsCharts(userId, exerciseId);

    res.json({
      success: true,
      data: chartsData.strengthProgression,
    });
  } catch (err) {
    next(err);
  }
};

router.get("/charts/strength-progression", handleStrengthProgression);
router.get("/charts/strength-progression/:exerciseId", handleStrengthProgression);

/**
 * @route   GET /analytics/charts
 * @desc    Get composite charts (weekly frequency, strength progression)
 */
router.get("/charts", async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const exerciseId = req.query.exerciseId as string | undefined;
    const weeks = Number(req.query.weeks) || 8;

    const chartsData = await getAnalyticsCharts(userId, exerciseId, weeks);

    res.json({
      success: true,
      data: {
        weeklyFrequency: chartsData.weeklyActivity,
        topExercises: [],
        strengthProgression: chartsData.strengthProgression,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

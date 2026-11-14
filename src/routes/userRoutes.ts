import { Router, Response, NextFunction } from "express";
import { prisma } from "../db/prisma.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

// Middleware to extract user from JWT or x-user-id header
router.use(authenticate);

/**
 * @route   GET /users/profile (also /api/users/profile)
 * @desc    Get user profile
 */
router.get("/profile", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      message: "Profile fetched successfully",
      data: userWithoutPassword,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /users/profile (also /api/users/profile)
 * @desc    Update user profile
 */
router.put("/profile", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { weight, height, fitnessGoals, unitSystem, name } = req.body;

    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name },
      });
    }

    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        weight: weight !== undefined ? Number(weight) : undefined,
        height: height !== undefined ? Number(height) : undefined,
        fitnessGoals,
        unitSystem,
      },
      create: {
        userId,
        weight: weight !== undefined ? Number(weight) : undefined,
        height: height !== undefined ? Number(height) : undefined,
        fitnessGoals,
        unitSystem: unitSystem || "kg",
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const { password: _, ...userWithoutPassword } = user!;
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: userWithoutPassword,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { validateBody } from "../middleware/validate.js";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/security.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fittrack_super_secure_jwt_secret_key_2026";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  weight: z.number().optional(),
  height: z.number().optional(),
  fitnessGoals: z.string().optional(),
  unitSystem: z.enum(["kg", "lbs"]).default("kg"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

router.post("/register", authRateLimiter, validateBody(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name, weight, height, fitnessGoals, unitSystem } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: "Conflict", message: "User already exists with this email" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        profile: {
          create: {
            weight,
            height,
            fitnessGoals,
            unitSystem,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profile: user.profile,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", authRateLimiter, validateBody(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      res.status(401).json({ success: false, error: "Unauthorized", message: "Invalid email or password" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, error: "Unauthorized", message: "Invalid email or password" });
      return;
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profile: user.profile,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { profile: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, data: userWithoutPassword });
  } catch (err) {
    next(err);
  }
});

export default router;

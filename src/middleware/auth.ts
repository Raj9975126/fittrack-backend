import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const JWT_SECRET = process.env.JWT_SECRET || "fittrack_super_secure_jwt_secret_key_2026";

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Authentication token missing or invalid format (expected: Bearer <token>)",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
    return;
  }
};

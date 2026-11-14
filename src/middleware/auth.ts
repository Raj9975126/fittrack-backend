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
  const xUserId = (req.headers["x-user-id"] || req.query.userId) as string | undefined;

  // 1. Bearer Token Authentication
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
      return next();
    } catch (_err) {
      // Fall through to x-user-id if token invalid
    }
  }

  // 2. Fallback to x-user-id or query userId (sent by React Native services/api.js)
  if (xUserId) {
    req.user = { id: xUserId, email: "" };
    return next();
  }

  res.status(401).json({
    success: false,
    error: "Unauthorized",
    message: "Authentication token missing or invalid format (expected: Bearer <token> or x-user-id)",
  });
};

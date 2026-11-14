import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation Error",
      details: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  // 2. Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        error: "Conflict",
        message: `Unique constraint violated on field: ${JSON.stringify(err.meta?.target)}`,
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: "Not Found",
        message: "Record does not exist in database",
      });
      return;
    }
  }

  // 3. Custom status errors or fallback 500
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (statusCode === 500 && process.env.NODE_ENV !== "test") {
    console.error("❌ Unhandled Error:", err);
  }

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? "Internal Server Error" : "Error",
    message: statusCode === 500 && process.env.NODE_ENV === "production" ? "Something went wrong" : message,
  });
};

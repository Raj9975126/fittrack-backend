import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";

export const validateBody = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation Error",
          details: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Query Validation Error",
          details: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

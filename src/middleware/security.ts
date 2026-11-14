import { Request, Response, NextFunction } from "express";

// In-Memory sliding-window rate limiter for API protection (Raj - Day 9 Security Lockdown)
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

/**
 * High-performance sliding-window token bucket rate limiter
 * Protects against brute-force password guessing and API resource exhaustion
 */
export const rateLimit = (options: {
  windowMs: number; // e.g. 60000 (1 minute)
  maxRequests: number; // e.g. 100 requests per window
  message?: string;
}) => {
  const { windowMs, maxRequests, message = "Too many requests. Please slow down." } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Key by IP or authorization token if present
    const clientKey = (req.headers["x-forwarded-for"] as string) || req.ip || "unknown-ip";
    const now = Date.now();

    let bucket = rateLimitStore.get(clientKey);

    if (!bucket) {
      bucket = { tokens: maxRequests - 1, lastRefill: now };
      rateLimitStore.set(clientKey, bucket);
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", bucket.tokens);
      return next();
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    if (elapsed > windowMs) {
      bucket.tokens = maxRequests - 1;
      bucket.lastRefill = now;
      rateLimitStore.set(clientKey, bucket);
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", bucket.tokens);
      return next();
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", bucket.tokens);
      return next();
    }

    const retryAfterSeconds = Math.ceil((windowMs - elapsed) / 1000);
    res.setHeader("Retry-After", retryAfterSeconds);
    res.status(429).json({
      success: false,
      error: "Too Many Requests",
      message,
      retryAfterSeconds,
    });
  };
};

/**
 * Strict Auth Rate Limiter (Max 15 login/register attempts per minute)
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 15,
  message: "Excessive login/register attempts detected. Please try again after 1 minute.",
});

/**
 * General API Rate Limiter (Max 120 requests per minute per IP)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: "API rate limit exceeded. Please throttle your client requests.",
});

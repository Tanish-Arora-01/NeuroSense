// ──────────────────────────────────────────────
// Rate Limiting Configuration
// ──────────────────────────────────────────────

const rateLimit = require("express-rate-limit");

/**
 * Strict limiter for authentication endpoints.
 * Prevents brute-force password guessing and credential stuffing.
 *
 * 5 requests per 15-minute window per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    message:
      "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

/**
 * General API rate limiter.
 * Applies to all /api/* routes as a baseline DDoS mitigation layer.
 *
 * 100 requests per 1-minute window per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please slow down and try again shortly.",
  },
});

/**
 * Strict limiter for screening endpoints.
 * ML inference is expensive — prevent abuse.
 *
 * 10 screening requests per 5-minute window per IP.
 */
const screeningLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too many screening requests. Please wait before running another screening.",
  },
});

module.exports = { authLimiter, apiLimiter, screeningLimiter };

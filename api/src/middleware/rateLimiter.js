import rateLimit from 'express-rate-limit';

/**
 * General rate limiter for unauthenticated/public routes
 * 100 requests per 15 minutes (prevents abuse from unauthenticated users)
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      status: 429,
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Rate limiter for authenticated users
 * Uses userId for tracking instead of IP, allowing much higher limits
 * 2000 requests per 15 minutes per user (sufficient for normal usage)
 * Falls back to IP if user is not authenticated
 */
export const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Limit each authenticated user to 2000 requests per windowMs
  message: {
    success: false,
    error: {
      status: 429,
      message: 'Too many requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use Clerk userId if available (authenticated), otherwise fall back to IP
  keyGenerator: (req) => {
    // If user is authenticated via Clerk, use userId for rate limiting
    if (req.auth && req.auth.userId) {
      return `user:${req.auth.userId}`;
    }
    // Fall back to IP for unauthenticated requests
    return req.ip;
  },
  // Disable IPv6 keyGenerator validation - req.ip is safe to use
  validate: { keyGeneratorIpFallback: false },
});

/**
 * Strict rate limiter for sensitive endpoints
 * 10 requests per 15 minutes (prevents brute force attacks)
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: {
      status: 429,
      message: 'Too many attempts, please try again after 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Webhook rate limiter
 * Higher limits for webhook endpoints (Clerk sends webhooks)
 * 500 requests per minute
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500, // Limit to 500 requests per minute
  message: {
    success: false,
    error: {
      status: 429,
      message: 'Too many webhook requests.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});


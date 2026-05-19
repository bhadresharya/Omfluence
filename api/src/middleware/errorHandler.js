import { errorLogger } from './logger.js';

/**
 * Global Error Handler Middleware
 * 
 * This middleware catches all errors thrown in the application
 * and returns a consistent error response format.
 * 
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const errorHandler = (err, req, res, next) => {
  // Handle CORS errors
  if (err.message && (err.message.includes('CORS') || err.message.includes('Not allowed by CORS'))) {
    if (!res.headersSent) {
      return res.status(403).json({
        success: false,
        error: {
          status: 403,
          message: 'CORS policy: Origin not allowed'
        }
      });
    }
    return res.end();
  }

  // Log error for debugging using enhanced logger
  errorLogger(err, req);

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        status: 401,
        message: 'Invalid token'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        status: 401,
        message: 'Token expired. Please refresh your token or login again.'
      }
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'Validation failed',
        errors
      }
    });
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: {
        status: 409,
        message: `${field} already exists`
      }
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: `Invalid ${err.path}: ${err.value}`
      }
    });
  }

  // Handle payload too large errors
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: {
        status: 413,
        message: 'Request payload too large. Maximum size is 10MB.'
      }
    });
  }


  // Default error status and message
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Send error response
  res.status(status).json({
    success: false,
    error: {
      status,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};


import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

/**
 * Authentication middleware - Verifies JWT access token
 * Attaches user to req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          status: 401,
          message: 'No token provided. Authorization header must be in format: Bearer <token>'
        }
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          status: 401,
          message: 'No token provided'
        }
      });
    }

    // Verify token
    try {
      const decoded = verifyAccessToken(token);
      
      // Check if user exists and is not deleted
      const user = await User.findActiveById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            status: 401,
            message: 'User not found or account has been deleted'
          }
        });
      }
      
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            status: 401,
            message: 'Token expired. Please refresh your token or login again.'
          }
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: {
            status: 401,
            message: 'Invalid token'
          }
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user to req.user if token is valid, but doesn't fail if token is missing
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findActiveById(decoded.userId);
        req.user = user || null;
      } catch (error) {
        // If token is invalid, just continue without user
        req.user = null;
      }
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require specific role middleware
 * Use after authenticate middleware
 * 
 * @param {string[]} roles - Array of allowed roles
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          status: 401,
          message: 'Authentication required'
        }
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          status: 403,
          message: 'Insufficient permissions'
        }
      });
    }
    
    next();
  };
};

/**
 * Admin only middleware
 */
export const requireAdmin = requireRole(['admin']);


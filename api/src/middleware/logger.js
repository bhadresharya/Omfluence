/**
 * Logger utility with log levels
 */
const logLevels = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

/**
 * Format log message with level and timestamp
 * @param {string} level - Log level (INFO, WARN, ERROR)
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Formatted log entry
 */
const formatLog = (level, message, metadata = {}) => {
  const timestamp = new Date().toISOString();
  const pad = (n) => n.toString().padStart(2, '0');
  const now = new Date();
  const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  
  const logEntry = {
    timestamp,
    time: timeString,
    level,
    message,
    ...metadata
  };

  return logEntry;
};

/**
 * Logger object with different log levels
 */
export const logger = {
  info: (message, metadata) => {
    const log = formatLog(logLevels.INFO, message, metadata);
    console.log(`[${log.time}] [${log.level}] ${log.message}`, metadata && Object.keys(metadata).length > 0 ? metadata : '');
  },
  
  warn: (message, metadata) => {
    const log = formatLog(logLevels.WARN, message, metadata);
    console.warn(`[${log.time}] [${log.level}] ${log.message}`, metadata && Object.keys(metadata).length > 0 ? metadata : '');
  },
  
  error: (message, error, metadata) => {
    const log = formatLog(logLevels.ERROR, message, metadata);
    const errorDetails = error ? {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } : {};
    console.error(`[${log.time}] [${log.level}] ${log.message}`, { ...errorDetails, ...metadata });
  }
};

/**
 * Request Logger Middleware
 * 
 * Logs all incoming requests with method, path, timestamp, and IP address.
 * Useful for debugging and monitoring API usage.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const requestLogger = (req, res, next) => {
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent') || 'Unknown';
  
  // Log request
  logger.info(`${method} ${path}`, {
    ip,
    userAgent,
    query: Object.keys(req.query).length > 0 ? req.query : undefined
  });

  // Capture response status
  const originalSend = res.send;
  res.send = function (data) {
    logger.info(`${method} ${path} - ${res.statusCode}`, {
      ip,
      statusCode: res.statusCode
    });
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Error Logger
 * Logs errors with stack traces and context
 * @param {Error} error - Error object
 * @param {Object} req - Express request object (optional)
 */
export const errorLogger = (error, req = null) => {
  const context = req ? {
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    user: req.user ? { id: req.user._id } : undefined
  } : {};

  logger.error('Error occurred', error, context);
};


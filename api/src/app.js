import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';

// Middleware imports
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { versionMiddleware, deprecationMiddleware } from './middleware/version.middleware.js';

dotenv.config();

const app = express();

// ===========================================
// CORS Configuration
// ===========================================

let defaultOrigins;

if (process.env.FRONTEND_URL) {
  const frontendUrls = process.env.FRONTEND_URL.split(',').map(url => url.trim());
  
  if (process.env.NODE_ENV === 'development') {
    // Development: merge FRONTEND_URL with default localhost URLs
    const devDefaults = ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'];
    defaultOrigins = [...new Set([...devDefaults, ...frontendUrls])];
  } else {
    // Production/staging: use FRONTEND_URL exclusively
    defaultOrigins = frontendUrls;
  }
} else if (process.env.NODE_ENV === 'development') {
  // Development fallback
  defaultOrigins = ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'];
} else {
  // Production without FRONTEND_URL - restrictive
  defaultOrigins = [];
  console.warn(
    '⚠️  WARNING: FRONTEND_URL is not set. CORS will be very restrictive. ' +
    'Please set FRONTEND_URL environment variable with allowed origins.'
  );
}

const allowedOrigins = defaultOrigins;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Rejected origin "${origin}". Allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Configure Helmet for CORS compatibility
const helmetOptions = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
};

// ===========================================
// Global Middleware
// ===========================================

// Security headers (must be early)
app.use(helmet(helmetOptions));

// CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security & Logging
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(requestLogger); // Log all requests

// ===========================================
// Health Check Route (public)
// ===========================================

app.get('/health', generalLimiter, (req, res) => {
  res.status(200).json({ 
    success: true,
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ===========================================
// API Versioning Middleware
// ===========================================

app.use('/api', versionMiddleware);
app.use('/api', deprecationMiddleware);

// ===========================================
// API Routes
// ===========================================

// Versioned API Routes (Recommended)
// Example: app.use('/api/v1', v1Routes);
// Routes will be added here as the application grows

// Placeholder route to verify API is working
app.get('/api/v1', generalLimiter, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Omfluence API v1',
    version: req.apiVersion,
    timestamp: new Date().toISOString()
  });
});

// ===========================================
// 404 Handler
// ===========================================

app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: {
      status: 404,
      message: `Route ${req.method} ${req.path} not found`
    }
  });
});

// ===========================================
// Global Error Handler (must be last)
// ===========================================

app.use(errorHandler);

export default app;

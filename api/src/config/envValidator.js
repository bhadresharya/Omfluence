import dotenv from 'dotenv';

dotenv.config();

/**
 * Validate required environment variables
 * @throws {Error} If required environment variables are missing
 */
export const validateEnv = () => {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  const missing = [];
  const warnings = [];

  // Check required variables
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check optional but recommended variables
  if (!process.env.FRONTEND_URL) {
    warnings.push('FRONTEND_URL is not set. CORS may be restrictive.');
  }

  // Throw error if required variables are missing
  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file and ensure all required variables are set.`
    );
    error.missingVars = missing;
    throw error;
  }

  // Log warnings for optional variables
  if (warnings.length > 0) {
    console.warn('⚠️  Environment Variable Warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  // Validate JWT secrets are not default values
  if (process.env.JWT_SECRET === 'your-secret-key-change-in-production' ||
      process.env.JWT_REFRESH_SECRET === 'your-refresh-secret-key-change-in-production') {
    console.warn('⚠️  WARNING: Using default JWT secrets. Please change them in production!');
  }

  // Validate JWT secrets have minimum length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security.');
  }

  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long for security.');
  }

  console.log('✅ Environment variables validated successfully');
};

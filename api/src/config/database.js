import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/omfluence';

// Reconnection configuration
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;
let reconnectTimer = null;

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number
 * @returns {number} Delay in milliseconds
 */
const getBackoffDelay = (attempt) => {
  return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
};

/**
 * Attempt to reconnect to MongoDB with exponential backoff
 */
const attemptReconnect = async () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('❌ Maximum reconnection attempts reached. Please check your MongoDB connection.');
    return;
  }

  reconnectAttempts++;
  const delay = getBackoffDelay(reconnectAttempts - 1);
  
  console.log(`🔄 Attempting to reconnect to MongoDB (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);

  reconnectTimer = setTimeout(async () => {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ MongoDB reconnected successfully');
      reconnectAttempts = 0; // Reset on successful reconnection
    } catch (error) {
      console.error(`❌ Reconnection attempt ${reconnectAttempts} failed:`, error.message);
      attemptReconnect(); // Try again
    }
  }, delay);
};

/**
 * Connect to MongoDB database
 * @returns {Promise} Database connection promise
 */
export const connectDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI);

    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
      if (!reconnectTimer) {
        reconnectAttempts = 0; // Reset attempts for new disconnection
        attemptReconnect();
      }
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      reconnectAttempts = 0;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    });

    mongoose.connection.on('connected', () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      reconnectAttempts = 0;
    });

    return mongoose.connection;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
};

/**
 * Close database connection gracefully
 */
export const closeDatabase = async () => {
  try {
    // Clear any pending reconnection attempts
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
};

export default { connectDatabase, closeDatabase };


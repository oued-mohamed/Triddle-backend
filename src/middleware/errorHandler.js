// backend/src/middleware/errorHandler.js
// Global error handling middleware

const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * Catches all errors and returns appropriate response
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  
  // Log the error
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    params: req.params,
    query: req.query,
  });
  
  // Handle different error types
  let errorResponse = {
    status: 'error',
    message: process.env.NODE_ENV === 'production' && statusCode === 500 
      ? 'An unexpected error occurred' 
      : err.message
  };
  
  // Include validation errors if available
  if (err.errors) {
    errorResponse.errors = err.errors;
  }
  
  // Don't expose stack trace in production
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
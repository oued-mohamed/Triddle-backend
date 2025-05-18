// backend/src/utils/jwt.js
// JWT utility functions

const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token
 * @param {Object} payload - The data to encode in the token
 * @param {string} expiresIn - Token expiration time (default: '1d')
 * @returns {string} JWT token
 */
function generateToken(payload, expiresIn = '1d') {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid
 */
function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  
  return jwt.verify(token, secret);
}

module.exports = {
  generateToken,
  verifyToken,
};
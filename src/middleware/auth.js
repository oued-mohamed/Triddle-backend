// backend/src/middleware/auth.js
// Authentication middleware

const { verifyToken } = require('../utils/jwt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Authentication middleware to protect routes
 * Verifies the JWT token from the Authorization header
 */
async function authenticate(req, res, next) {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Authentication required' 
      });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid token format' 
      });
    }

    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid token' 
      });
    }

    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'User not found' 
      });
    }

    // Add the user to the request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid or expired token' 
      });
    }
    next(error);
  }
}

module.exports = authenticate;
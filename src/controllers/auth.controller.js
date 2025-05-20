// backend/src/controllers/auth.controller.js
// Authentication controller for user registration and login

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Register a new user
 * @route POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ 
        status: 'error', 
        message: 'User with this email already exists' 
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    // Generate token
    const token = generateToken({ userId: user.id });

    res.status(201).json({
      status: 'success',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
    res.status(201).json({
      status: 'success',
      data: {
        "message" :error
      }
    });
  }
}

/**
 * Login a user
 * @route POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = generateToken({ userId: user.id });

    // Return user info (excluding password)
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      status: 'success',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user profile
 * @route GET /api/auth/me
 */
async function getProfile(req, res) {
  // User is already attached to req by auth middleware
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
}

module.exports = {
  register,
  login,
  getProfile
};
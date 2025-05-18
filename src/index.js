// backend/src/index.js
// Main server entry point

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(helmet()); // Security headers
app.use(cors(corsOptions)); // Enable CORS with enhanced options
app.use(express.json()); // Parse JSON request bodies
app.use(morgan('combined')); // Request logging

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    serverInfo: {
      uptime: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 + ' MB',
      nodeVersion: process.version
    }
  });
});

// Keep the old health endpoint for backward compatibility
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});
// Add a debug endpoint in your backend
app.get('/api/debug/form/:id', async (req, res) => {
  try {
    const form = await prisma.form.findUnique({
      where: { id: req.params.id },
      select: { id: true, title: true, isPublished: true }
    });
    res.json(form);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API routes
app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

// Start the server
async function start() {
  try {
    // Connect to the database
    await prisma.$connect();
    logger.info('Connected to the database');

    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api`);
      logger.info(`Health check at http://localhost:${PORT}/api/health`);
      logger.info(`CORS configured for origin: ${corsOptions.origin}`);
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

// Handle application shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from the database');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from the database');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

start();

module.exports = app; // Export for testing
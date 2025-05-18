// backend/src/routes/index.js
// Main router that combines all route modules

const express = require('express');
const authRoutes = require('./auth.routes');
const formRoutes = require('./form.routes');
const responseRoutes = require('./response.routes');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/forms', formRoutes);
router.use('/responses', responseRoutes);

module.exports = router;
// backend/src/routes/auth.routes.js
// Authentication routes

const express = require('express');
const { register, login, getProfile } = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');
// const auth = require('../middleware/auth.middleware');


const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);


// Protected routes
router.get('/me', authenticate, getProfile);

module.exports = router;
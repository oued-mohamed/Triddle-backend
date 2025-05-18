// backend/src/routes/response.routes.js
// Form response routes

const express = require('express');
const { 
  startResponse, 
  submitAnswer, 
  getResponse,
  getUploadUrl
} = require('../controllers/response.controller');

const router = express.Router();

// All response routes are public to allow anonymous form submissions
router.post('/start/:formId', startResponse);
router.post('/:responseId/answers', submitAnswer);
router.get('/:id', getResponse);
router.post('/upload-url', getUploadUrl);

module.exports = router;
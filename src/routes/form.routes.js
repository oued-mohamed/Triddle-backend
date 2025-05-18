// // backend/src/routes/form.routes.js
// // Form management routes

// const express = require('express');
// const formController = require('../controllers/form.controller');

// const { 
//   createForm, 
//   getForms, 
//   getForm, 
//   updateForm, 
//   deleteForm, 
//   getFormAnalytics, 
//   getFormResponses,
//   trackFormVisit
// } = require('../controllers/form.controller');
// const {
//   createQuestion,
//   updateQuestion,
//   deleteQuestion,
//   reorderQuestions
// } = require('../controllers/question.controller');
// const authenticate = require('../middleware/auth');

// const router = express.Router();

// // Form routes
// router.post('/', authenticate, createForm);
// router.get('/', authenticate, getForms);
// router.get('/:id', authenticate, getForm);
// router.put('/:id', authenticate, updateForm);
// router.delete('/:id', authenticate, deleteForm);
// router.get('/:id/analytics', authenticate, getFormAnalytics);
// router.get('/:id/responses', authenticate, getFormResponses);
// router.put('/:id/publish', auth.protect, formController.publishForm);


// // Question routes
// router.post('/:formId/questions', authenticate, createQuestion);
// router.put('/:formId/questions/:id', authenticate, updateQuestion);
// router.delete('/:formId/questions/:id', authenticate, deleteQuestion);
// router.put('/:formId/questions/reorder', authenticate, reorderQuestions);

// // Public routes
// router.post('/:id/visit', trackFormVisit);
// router.get('/:id/fill', formController.getFormToFill);


// module.exports = router;
const express = require('express');
const formController = require('../controllers/form.controller');
const {
  createForm, getForms, getForm, updateForm, deleteForm,
  getFormAnalytics, getFormResponses, trackFormVisit
} = require('../controllers/form.controller');
const {
  createQuestion, updateQuestion, deleteQuestion, reorderQuestions
} = require('../controllers/question.controller');
const authenticate = require('../middleware/auth'); // ✅ correct import

const router = express.Router();

// Form routes
router.post('/', authenticate, createForm);
router.get('/', authenticate, getForms);
router.get('/:id', authenticate, getForm);
router.put('/:id', authenticate, updateForm);
router.delete('/:id', authenticate, deleteForm);
router.get('/:id/analytics', authenticate, getFormAnalytics);
router.get('/:id/responses', authenticate, getFormResponses);
router.put('/:id/publish', authenticate, formController.publishForm); // ✅ fixed

// Question routes
router.post('/:formId/questions', authenticate, createQuestion);
router.put('/:formId/questions/:id', authenticate, updateQuestion);
router.delete('/:formId/questions/:id', authenticate, deleteQuestion);
router.put('/:formId/questions/reorder', authenticate, reorderQuestions);

// Public routes
router.post('/:id/visit', trackFormVisit);
router.get('/:id/fill', formController.getFormToFill);

module.exports = router;

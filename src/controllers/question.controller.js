// backend/src/controllers/question.controller.js
// Question management controller - handles creation, updating, and deletion of form questions

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Add a question to a form
 * @route POST /api/forms/:formId/questions
 */
async function createQuestion(req, res, next) {
  try {
    const { formId } = req.params;
    const { title, description, type, isRequired, options, validation } = req.body;
    const userId = req.user.id;

    // Check if form exists and belongs to user
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        userId
      }
    });

    if (!form) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }

    // Get current highest order value
    const highestOrder = await prisma.question.findFirst({
      where: {
        formId
      },
      orderBy: {
        order: 'desc'
      },
      select: {
        order: true
      }
    });

    const nextOrder = highestOrder ? highestOrder.order + 1 : 0;

    // Create the question
    const question = await prisma.question.create({
      data: {
        formId,
        title,
        description,
        type,
        isRequired: isRequired || false,
        options: options ? JSON.parse(JSON.stringify(options)) : null,
        validation: validation ? JSON.parse(JSON.stringify(validation)) : null,
        order: nextOrder
      }
    });

    res.status(201).json({
      status: 'success',
      data: {
        question
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a question
 * @route PUT /api/forms/:formId/questions/:id
 */
async function updateQuestion(req, res, next) {
  try {
    const { formId, id } = req.params;
    const { title, description, type, isRequired, options, validation } = req.body;
    const userId = req.user.id;

    // Check if form exists and belongs to user
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        userId
      }
    });

    if (!form) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }

    // Check if question exists and belongs to the form
    const existingQuestion = await prisma.question.findFirst({
      where: {
        id,
        formId
      }
    });

    if (!existingQuestion) {
      return res.status(404).json({
        status: 'error',
        message: 'Question not found'
      });
    }

    // Update the question
    const updatedQuestion = await prisma.question.update({
      where: {
        id
      },
      data: {
        title,
        description,
        type,
        isRequired: isRequired !== undefined ? isRequired : existingQuestion.isRequired,
        options: options ? JSON.parse(JSON.stringify(options)) : existingQuestion.options,
        validation: validation ? JSON.parse(JSON.stringify(validation)) : existingQuestion.validation
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        question: updatedQuestion
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a question
 * @route DELETE /api/forms/:formId/questions/:id
 */
async function deleteQuestion(req, res, next) {
  try {
    const { formId, id } = req.params;
    const userId = req.user.id;

    // Check if form exists and belongs to user
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        userId
      }
    });

    if (!form) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }

    // Check if question exists and belongs to the form
    const existingQuestion = await prisma.question.findFirst({
      where: {
        id,
        formId
      }
    });

    if (!existingQuestion) {
      return res.status(404).json({
        status: 'error',
        message: 'Question not found'
      });
    }

    // Delete the question
    await prisma.question.delete({
      where: {
        id
      }
    });

    // Reorder remaining questions
    const remainingQuestions = await prisma.question.findMany({
      where: {
        formId,
        order: {
          gt: existingQuestion.order
        }
      },
      orderBy: {
        order: 'asc'
      }
    });

    // Update order for remaining questions
    for (const [index, question] of remainingQuestions.entries()) {
      await prisma.question.update({
        where: {
          id: question.id
        },
        data: {
          order: existingQuestion.order + index
        }
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Question deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reorder questions
 * @route PUT /api/forms/:formId/questions/reorder
 */
async function reorderQuestions(req, res, next) {
  try {
    const { formId } = req.params;
    const { questions } = req.body; // Array of { id, order }
    const userId = req.user.id;

    // Check if form exists and belongs to user
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        userId
      }
    });

    if (!form) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }

    // Update order for each question
    const updates = questions.map(({ id, order }) => 
      prisma.question.update({
        where: { id },
        data: { order }
      })
    );

    await prisma.$transaction(updates);

    res.status(200).json({
      status: 'success',
      message: 'Questions reordered successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions
};
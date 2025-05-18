// backend/src/controllers/response.controller.js
// Response controller - handles form submissions and answers

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Start a form response session
 * @route POST /api/responses/start/:formId
 * Public endpoint - no authentication required
 */
async function startResponse(req, res, next) {
  try {
    const { formId } = req.params;
    
    // Check if form exists and is published
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        isPublished: true
      },
      include: {
        questions: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!form) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found or not published'
      });
    }

    // Generate a unique respondent ID
    const respondentId = uuidv4();
    
    // Create a new response
    const response = await prisma.response.create({
      data: {
        formId,
        respondentId,
        isCompleted: false
      }
    });

    // Return the form structure and response ID
    res.status(201).json({
      status: 'success',
      data: {
        response: {
          id: response.id,
          respondentId: response.respondentId
        },
        form: {
          id: form.id,
          title: form.title,
          description: form.description,
          questionCount: form.questions.length,
          firstQuestion: form.questions.length > 0 ? form.questions[0] : null
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit an answer to a question
 * @route POST /api/responses/:responseId/answers
 * Public endpoint - no authentication required
 */
async function submitAnswer(req, res, next) {
  try {
    const { responseId } = req.params;
    const { questionId, value, fileUrl } = req.body;
    
    // Check if response exists
    const response = await prisma.response.findUnique({
      where: { id: responseId },
      include: {
        form: {
          include: {
            questions: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        }
      }
    });

    if (!response) {
      return res.status(404).json({
        status: 'error',
        message: 'Response not found'
      });
    }

    // Check if question belongs to the form
    const question = response.form.questions.find(q => q.id === questionId);
    if (!question) {
      return res.status(404).json({
        status: 'error',
        message: 'Question not found in this form'
      });
    }

    // Check if an answer for this question already exists
    const existingAnswer = await prisma.answer.findFirst({
      where: {
        responseId,
        questionId
      }
    });

    let answer;
    if (existingAnswer) {
      // Update existing answer
      answer = await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: {
          value,
          fileUrl
        }
      });
    } else {
      // Create new answer
      answer = await prisma.answer.create({
        data: {
          responseId,
          questionId,
          value,
          fileUrl
        }
      });
    }

    // Determine next question
    const currentQuestionIndex = response.form.questions.findIndex(q => q.id === questionId);
    const nextQuestion = currentQuestionIndex < response.form.questions.length - 1 
      ? response.form.questions[currentQuestionIndex + 1] 
      : null;

    // Check if this is the last question
    const isLastQuestion = currentQuestionIndex === response.form.questions.length - 1;

    // If last question, mark response as completed
    if (isLastQuestion) {
      await prisma.response.update({
        where: { id: responseId },
        data: {
          isCompleted: true,
          completedAt: new Date()
        }
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        answer,
        nextQuestion,
        isLastQuestion
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a specific response
 * @route GET /api/responses/:id
 * Public endpoint but requires respondent ID to verify ownership
 */
async function getResponse(req, res, next) {
  try {
    const { id } = req.params;
    const { respondentId } = req.query;
    
    if (!respondentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Respondent ID is required'
      });
    }

    // Get response with answers
    const response = await prisma.response.findFirst({
      where: {
        id,
        respondentId
      },
      include: {
        form: {
          select: {
            title: true,
            description: true
          }
        },
        answers: {
          include: {
            question: true
          }
        }
      }
    });

    if (!response) {
      return res.status(404).json({
        status: 'error',
        message: 'Response not found'
      });
    }

    // Format the response
    const formattedResponse = {
      id: response.id,
      respondentId: response.respondentId,
      formTitle: response.form.title,
      formDescription: response.form.description,
      isCompleted: response.isCompleted,
      startedAt: response.startedAt,
      completedAt: response.completedAt,
      answers: response.answers.map(answer => ({
        questionId: answer.questionId,
        questionTitle: answer.question.title,
        questionType: answer.question.type,
        value: answer.value,
        fileUrl: answer.fileUrl
      }))
    };

    res.status(200).json({
      status: 'success',
      data: {
        response: formattedResponse
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate a signed URL for file uploads
 * @route POST /api/responses/upload-url
 * Public endpoint - no authentication required
 */
async function getUploadUrl(req, res, next) {
  try {
    const { fileName, contentType } = req.body;
    
    // In a real implementation, this would generate a signed URL from a cloud provider
    // For simplicity, we'll just return a mock URL
    const fileKey = `uploads/${Date.now()}-${fileName}`;
    const uploadUrl = `https://storage.triddle.co/${fileKey}`;
    
    res.status(200).json({
      status: 'success',
      data: {
        uploadUrl,
        fileUrl: uploadUrl, // The URL where the file will be accessible after upload
        expiresIn: 300 // URL expires in 5 minutes
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startResponse,
  submitAnswer,
  getResponse,
  getUploadUrl
};
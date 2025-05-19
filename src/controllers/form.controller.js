// backend/src/controllers/form.controller.js
// Form management controller - handles form CRUD operations and analytics

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Create a new form
 * @route POST /api/forms
 */
async function createForm(req, res, next) {
  try {
    const { title, description, isPublished, theme, settings } = req.body;
    const userId = req.user.id;

    // Create form with optional theme and settings
    const form = await prisma.form.create({
      data: {
        title,
        description,
        isPublished: isPublished || false,
        userId,
        // Add theme if provided
        ...(theme && {
          theme: {
            create: {
              primaryColor: theme.primaryColor || "#3b82f6",
              backgroundColor: theme.backgroundColor || "#f8fafc",
              fontFamily: theme.fontFamily || "Inter, sans-serif"
            }
          }
        }),
        // Add settings if provided
        ...(settings && {
          settings: {
            create: {
              requireSignIn: settings.requireSignIn || false,
              limitOneResponsePerUser: settings.limitOneResponsePerUser || false,
              showProgressBar: settings.showProgressBar || true,
              shuffleQuestions: settings.shuffleQuestions || false,
              confirmationMessage: settings.confirmationMessage || "Thank you for your submission!",
              redirectUrl: settings.redirectUrl || "",
              notifyOnSubmission: settings.notifyOnSubmission || false
            }
          }
        })
      }
    });

    res.status(201).json({
      status: 'success',
      data: {
        form
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all forms for the current user
 * @route GET /api/forms
 */
async function getForms(req, res, next) {
  try {
    const userId = req.user.id;
    const forms = await prisma.form.findMany({
      where: {
        userId
      },
      include: {
        theme: true,
        settings: true,
        _count: {
          select: {
            questions: true, // Changed from fields to questions
            responses: true,
            visits: true // Added visits to match schema
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        forms
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single form by ID
 * @route GET /api/forms/:id
 */
async function getForm(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const form = await prisma.form.findFirst({
      where: {
        id,
        userId
      },
      include: {
        theme: true,
        settings: {
          include: {
            notificationEmails: true
          }
        },
        questions: { // Changed from fields to questions
          include: {
            conditionalLogic: {
              include: {
                rules: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: {
            responses: true
          }
        }
      }
    });

    if (!form) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        form
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a form
 * @route PUT /api/forms/:id
 */
async function updateForm(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, isPublished, theme, settings, questions } = req.body; // Changed fields to questions
    const userId = req.user.id;

    // Check if form exists and belongs to user
    const existingForm = await prisma.form.findFirst({
      where: {
        id,
        userId
      },
      include: {
        theme: true,
        settings: true
      }
    });

    if (!existingForm) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }

    // Start a transaction for updating related entities
    const updatedForm = await prisma.$transaction(async (prisma) => {
      // Update the form basic info
      const form = await prisma.form.update({
        where: { id },
        data: { 
          title, 
          description, 
          isPublished: isPublished || false
        }
      });

      // Update theme if provided
      if (theme) {
        if (existingForm.theme) {
          await prisma.theme.update({
            where: { formId: id }, // Updated to use formId instead of id
            data: {
              primaryColor: theme.primaryColor || "#3b82f6",
              backgroundColor: theme.backgroundColor || "#f8fafc",
              fontFamily: theme.fontFamily || "Inter, sans-serif"
            }
          });
        } else {
          // Create new theme and link to form
          await prisma.theme.create({
            data: {
              formId: id, // Using formId for direct relation
              primaryColor: theme.primaryColor || "#3b82f6",
              backgroundColor: theme.backgroundColor || "#f8fafc",
              fontFamily: theme.fontFamily || "Inter, sans-serif"
            }
          });
        }
      }

      // Update settings if provided
      if (settings) {
        if (existingForm.settings) {
          await prisma.formSettings.update({ // Changed from settings to formSettings
            where: { formId: id }, // Updated to use formId instead of id
            data: {
              requireSignIn: settings.requireSignIn,
              limitOneResponsePerUser: settings.limitOneResponsePerUser,
              showProgressBar: settings.showProgressBar,
              shuffleQuestions: settings.shuffleQuestions,
              confirmationMessage: settings.confirmationMessage,
              redirectUrl: settings.redirectUrl,
              notifyOnSubmission: settings.notifyOnSubmission
            }
          });

          // Update notification emails if provided
          if (settings.notificationEmails) {
            // Delete existing notification emails
            await prisma.notificationEmail.deleteMany({
              where: { formSettingsId: existingForm.settings.id } // Changed to formSettingsId
            });

            // Create new notification emails
            if (settings.notificationEmails.length > 0) {
              await prisma.notificationEmail.createMany({
                data: settings.notificationEmails.map(email => ({
                  email,
                  formSettingsId: existingForm.settings.id // Changed to formSettingsId
                }))
              });
            }
          }
        } else {
          // Create new settings and link to form
          const newSettings = await prisma.formSettings.create({ // Changed from settings to formSettings
            data: {
              formId: id, // Using formId for direct relation
              requireSignIn: settings.requireSignIn || false,
              limitOneResponsePerUser: settings.limitOneResponsePerUser || false,
              showProgressBar: settings.showProgressBar || true,
              shuffleQuestions: settings.shuffleQuestions || false,
              confirmationMessage: settings.confirmationMessage || "Thank you for your submission!",
              redirectUrl: settings.redirectUrl || "",
              notifyOnSubmission: settings.notifyOnSubmission || false,
              ...(settings.notificationEmails && settings.notificationEmails.length > 0 && {
                notificationEmails: {
                  create: settings.notificationEmails.map(email => ({ email }))
                }
              })
            }
          });
        }
      }

      // Update questions if provided (Changed from fields to questions)
      if (questions && Array.isArray(questions)) {
        // Process each question
        for (const question of questions) {
          if (question.id && question.id.startsWith('question-') && question.id.length > 9) {
            // Existing question - update it
            const existingQuestion = await prisma.question.findUnique({
              where: { id: question.id }
            });

            if (existingQuestion) {
              await prisma.question.update({
                where: { id: question.id },
                data: {
                  type: question.type,
                  title: question.title, // Changed from label to title
                  description: question.description, // Changed from helpText to description
                  isRequired: question.isRequired, // Changed from required to isRequired
                  order: question.order,
                  validation: question.validation ? {
                    min: question.validation.min,
                    max: question.validation.max,
                    pattern: question.validation.pattern
                  } : null // Changed to use JSON validation field
                }
              });

              // Update options if applicable - stored in options JSON field in Question model
              if (['multipleChoice', 'checkboxes', 'dropdown'].includes(question.type) && question.options) {
                await prisma.question.update({
                  where: { id: question.id },
                  data: {
                    options: question.options
                  }
                });
              }

              // Update conditional logic if provided
              if (question.conditionalLogic) {
                const existingLogic = await prisma.conditionalLogic.findUnique({
                  where: { questionId: question.id } // Changed from fieldId to questionId
                });

                if (existingLogic && question.conditionalLogic.enabled) {
                  // Update existing logic
                  await prisma.conditionalLogic.update({
                    where: { id: existingLogic.id },
                    data: { enabled: question.conditionalLogic.enabled }
                  });

                  // Delete existing rules
                  await prisma.conditionalRule.deleteMany({
                    where: { conditionalLogicId: existingLogic.id }
                  });

                  // Create new rules if enabled
                  if (question.conditionalLogic.enabled && question.conditionalLogic.rules) {
                    await prisma.conditionalRule.createMany({
                      data: question.conditionalLogic.rules.map(rule => ({
                        conditionalLogicId: existingLogic.id,
                        targetQuestionId: rule.questionId, // Changed from targetFieldId to targetQuestionId
                        operator: rule.operator,
                        value: rule.value,
                        action: rule.action
                      }))
                    });
                  }
                } else if (!existingLogic && question.conditionalLogic.enabled) {
                  // Create new conditional logic
                  const newLogic = await prisma.conditionalLogic.create({
                    data: {
                      questionId: question.id, // Changed from fieldId to questionId
                      enabled: true
                    }
                  });

                  // Create rules
                  if (question.conditionalLogic.rules) {
                    await prisma.conditionalRule.createMany({
                      data: question.conditionalLogic.rules.map(rule => ({
                        conditionalLogicId: newLogic.id,
                        targetQuestionId: rule.questionId, // Changed from targetFieldId to targetQuestionId
                        operator: rule.operator,
                        value: rule.value,
                        action: rule.action
                      }))
                    });
                  }
                } else if (existingLogic && !question.conditionalLogic.enabled) {
                  // Disable conditional logic
                  await prisma.conditionalLogic.update({
                    where: { id: existingLogic.id },
                    data: { enabled: false }
                  });

                  // Delete rules
                  await prisma.conditionalRule.deleteMany({
                    where: { conditionalLogicId: existingLogic.id }
                  });
                }
              }
            }
          } else {
            // New question - create it
            const newQuestion = await prisma.question.create({
              data: {
                formId: id,
                type: question.type,
                title: question.title, // Changed from label to title
                description: question.description, // Changed from helpText to description
                isRequired: question.isRequired || false, // Changed from required to isRequired
                order: question.order,
                validation: question.validation ? {
                  min: question.validation.min,
                  max: question.validation.max,
                  pattern: question.validation.pattern
                } : null, // Changed to use JSON validation field
                options: ['multipleChoice', 'checkboxes', 'dropdown'].includes(question.type) ? 
                  question.options : null
              }
            });

            // Create conditional logic if enabled
            if (question.conditionalLogic && question.conditionalLogic.enabled) {
              const newLogic = await prisma.conditionalLogic.create({
                data: {
                  questionId: newQuestion.id, // Changed from fieldId to questionId
                  enabled: true
                }
              });

              // Create rules
              if (question.conditionalLogic.rules) {
                await prisma.conditionalRule.createMany({
                  data: question.conditionalLogic.rules.map(rule => ({
                    conditionalLogicId: newLogic.id,
                    targetQuestionId: rule.questionId, // Changed from targetFieldId to targetQuestionId
                    operator: rule.operator,
                    value: rule.value,
                    action: rule.action
                  }))
                });
              }
            }
          }
        }

        // Delete questions that are no longer in the form
        const questionIds = questions.map(q => q.id).filter(id => id && id.startsWith('question-'));
        if (questionIds.length > 0) {
          await prisma.question.deleteMany({
            where: {
              formId: id,
              id: { notIn: questionIds }
            }
          });
        }
      }

      // Return the updated form
      return prisma.form.findUnique({
        where: { id },
        include: {
          theme: true,
          settings: {
            include: {
              notificationEmails: true
            }
          },
          questions: { // Changed from fields to questions
            include: {
              conditionalLogic: {
                include: {
                  rules: true
                }
              }
            },
            orderBy: {
              order: 'asc'
            }
          }
        }
      });
    });

    res.status(200).json({
      status: 'success',
      data: {
        form: updatedForm
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a form
 * @route DELETE /api/forms/:id
 */
async function deleteForm(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if form exists and belongs to user
    const existingForm = await prisma.form.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingForm) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }

    // Delete form (will cascade delete questions and responses)
    await prisma.form.delete({
      where: {
        id
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Form deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Publish a form
 * @route PUT /api/forms/:id/publish
 */
async function publishForm(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if form exists and belongs to user
    const existingForm = await prisma.form.findFirst({
      where: {
        id,
        userId
      },
      include: {
        questions: true // Changed from fields to questions
      }
    });

    if (!existingForm) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }

    // Validate form has at least one question
    if (existingForm.questions.length === 0) { // Changed from fields to questions
      return res.status(400).json({
        status: 'error',
        message: 'Cannot publish a form with no questions' // Changed message
      });
    }

    // Publish the form
    const updatedForm = await prisma.form.update({
      where: {
        id
      },
      data: {
        isPublished: true
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        form: updatedForm
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get form to fill (public endpoint)
 * @route GET /api/forms/:id/fill
 * @access Public
 */
async function getFormToFill(req, res, next) {
  try {
    const { id } = req.params;
    
    // Debug logging
    console.log(`Fetching form to fill with ID: ${id}`);
    
    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        theme: true,
        questions: { // Changed from fields to questions
          include: {
            conditionalLogic: {
              include: {
                rules: true
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });
    
    if (!form) {
      console.log(`Form not found: ${id}`);
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }
    
    // Debug logging
    console.log(`Form found. Published status: ${form.isPublished}`);
    
    if (!form.isPublished) {
      return res.status(403).json({
        status: 'error',
        message: 'This form is not published and cannot be filled'
      });
    }
    
    // Create a form visit record for analytics
    await prisma.formVisit.create({
      data: {
        formId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer || req.headers.referrer
      }
    });
    
    return res.status(200).json({
      status: 'success',
      data: form
    });
  } catch (error) {
    console.error('Error in getFormToFill:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error while fetching form',
      error: error.message
    });
  }
}

/**
 * Get form analytics
 * @route GET /api/forms/:id/analytics
 */
async function getFormAnalytics(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if form exists and belongs to user
    const form = await prisma.form.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!form) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }

    // Get analytics data
    const [visitsCount, responsesCount, completionRate, questions] = await Promise.all([
      // Total visits
      prisma.formVisit.count({
        where: { formId: id }
      }),
      // Total responses
      prisma.response.count({
        where: { formId: id }
      }),
      // Completion rate
      prisma.response.findMany({
        where: { formId: id },
        select: { isCompleted: true } // Changed from completed to isCompleted
      }).then(responses => {
        const completed = responses.filter(r => r.isCompleted).length; // Changed from completed to isCompleted
        return responses.length > 0 ? (completed / responses.length) * 100 : 0;
      }),
      // Question-level analytics - Changed from field-level
      prisma.question.findMany({ // Changed from field to question
        where: { formId: id },
        include: {
          _count: {
            select: {
              answers: true // Changed from fieldResponses to answers
            }
          }
        },
        orderBy: { order: 'asc' }
      })
    ]);

    // Calculate drop-off rates
    let questionsWithDropoff = []; // Changed variable name
    if (questions.length > 0) {
      const firstQuestionResponses = questions[0]._count.answers; // Changed field to question and fieldResponses to answers
      questionsWithDropoff = questions.map(q => ({ // Changed f to q
        id: q.id,
        title: q.title, // Changed label to title
        type: q.type,
        responses: q._count.answers, // Changed fieldResponses to answers
        dropoffRate: firstQuestionResponses > 0 
          ? ((firstQuestionResponses - q._count.answers) / firstQuestionResponses) * 100 // Changed fieldResponses to answers
          : 0
      }));
    }

    res.status(200).json({
      status: 'success',
      data: {
        visits: visitsCount,
        responses: responsesCount,
        completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
        questions: questionsWithDropoff // Changed fields to questions
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all responses for a form
 * @route GET /api/forms/:id/responses
 */
async function getFormResponses(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if form exists and belongs to user
    const form = await prisma.form.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!form) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }

    // Get responses with answers
    const responses = await prisma.response.findMany({
      where: {
        formId: id
      },
      include: {
        answers: { // Changed from fieldResponses
          include: {
            question: true // Changed from field to question
          }
        }
      },
      orderBy: {
        startedAt: 'desc' // Changed from createdAt to startedAt to match schema
      }
    });

    // Format the responses for better readability
    const formattedResponses = responses.map(response => {
      // Group answers by question
      const answersMap = {};
      response.answers.forEach(answer => { // Changed from fieldResponses to answers
        answersMap[answer.question.title] = { // Changed from field.label to question.title
          value: answer.value,
          type: answer.question.type // Changed from field.type to question.type
        };
      });

      return {
        id: response.id,
        respondentId: response.respondentId, // Changed from userId to respondentId
        isCompleted: response.isCompleted, // Changed from completed to isCompleted
        startedAt: response.startedAt, // Changed from createdAt to startedAt
        completedAt: response.completedAt,
        answers: answersMap
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        responses: formattedResponses
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get response count for a form
 * @route GET /api/forms/:id/responses/count
 */
async function getFormResponseCount(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if form exists and belongs to user
    const form = await prisma.form.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!form) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found'
      });
    }

    // Get response count
    const count = await prisma.response.count({
      where: {
        formId: id
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        count
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Track form visit
 * @route POST /api/forms/:id/visit
 * Public endpoint - no authentication required
 */
async function trackFormVisit(req, res, next) {
  try {
    const { id } = req.params;
    
    // Check if form exists and is published
    const form = await prisma.form.findFirst({
      where: {
        id,
        isPublished: true
      }
    });

    if (!form) {
      return res.status(404).json({
        status: 'error',
        message: 'Form not found or not published'
      });
    }

    // Record the visit
    await prisma.formVisit.create({
      data: {
        formId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer || req.headers.referrer
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Visit recorded'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createForm,
  getForms,
  getForm,
  updateForm,
  deleteForm,
  publishForm,
  getFormToFill,
  getFormAnalytics,
  getFormResponses,
  getFormResponseCount, // Add the new function
  trackFormVisit
};
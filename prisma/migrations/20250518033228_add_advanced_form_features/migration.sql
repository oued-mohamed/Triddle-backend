-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f8fafc',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter, sans-serif',

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_settings" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "requireSignIn" BOOLEAN NOT NULL DEFAULT false,
    "limitOneResponsePerUser" BOOLEAN NOT NULL DEFAULT false,
    "showProgressBar" BOOLEAN NOT NULL DEFAULT true,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "confirmationMessage" TEXT NOT NULL DEFAULT 'Thank you for your submission!',
    "redirectUrl" TEXT,
    "notifyOnSubmission" BOOLEAN NOT NULL DEFAULT false,
    "notificationEmails" TEXT[],

    CONSTRAINT "form_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conditional_logic" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "conditional_logic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conditional_rules" (
    "id" TEXT NOT NULL,
    "conditionalLogicId" TEXT NOT NULL,
    "targetQuestionId" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT,
    "action" TEXT NOT NULL DEFAULT 'show',

    CONSTRAINT "conditional_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "themes_formId_key" ON "themes"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "form_settings_formId_key" ON "form_settings"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "conditional_logic_questionId_key" ON "conditional_logic"("questionId");

-- AddForeignKey
ALTER TABLE "themes" ADD CONSTRAINT "themes_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_settings" ADD CONSTRAINT "form_settings_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditional_logic" ADD CONSTRAINT "conditional_logic_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditional_rules" ADD CONSTRAINT "conditional_rules_conditionalLogicId_fkey" FOREIGN KEY ("conditionalLogicId") REFERENCES "conditional_logic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `notificationEmails` on the `form_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "form_settings" DROP COLUMN "notificationEmails";

-- CreateTable
CREATE TABLE "notification_emails" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "formSettingsId" TEXT NOT NULL,

    CONSTRAINT "notification_emails_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notification_emails" ADD CONSTRAINT "notification_emails_formSettingsId_fkey" FOREIGN KEY ("formSettingsId") REFERENCES "form_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

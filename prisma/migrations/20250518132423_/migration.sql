/*
  Warnings:

  - You are about to drop the `notification_emails` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "notification_emails" DROP CONSTRAINT "notification_emails_formSettingsId_fkey";

-- AlterTable
ALTER TABLE "form_settings" ADD COLUMN     "notificationEmails" TEXT[];

-- DropTable
DROP TABLE "notification_emails";

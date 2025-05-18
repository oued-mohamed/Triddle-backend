// backend/src/services/storage.service.js
// Cloud storage service for file uploads

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'triddle-uploads';

/**
 * Generate a pre-signed URL for uploading a file to S3
 * @param {string} fileName - Original file name
 * @param {string} contentType - MIME type of the file
 * @returns {Object} - Object containing upload URL and final file URL
 */
async function getSignedUploadUrl(fileName, contentType) {
  try {
    // Generate a unique file key
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const fileKey = `uploads/${uniqueFileName}`;

    // Set parameters for the signed URL
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
      Expires: 300 // URL expires in 5 minutes
    };

    // Generate the signed URL
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    
    // Generate the public URL for the file
    const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;

    return {
      uploadUrl,
      fileUrl,
      expiresIn: 300
    };
  } catch (error) {
    logger.error('Error generating signed URL:', error);
    throw new Error('Failed to generate upload URL');
  }
}

/**
 * Delete a file from S3
 * @param {string} fileUrl - URL of the file to delete
 */
async function deleteFile(fileUrl) {
  try {
    // Extract the file key from the URL
    const urlObj = new URL(fileUrl);
    const fileKey = urlObj.pathname.substring(1); // Remove leading slash

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey
    };

    await s3.deleteObject(params).promise();
    logger.info(`File deleted: ${fileKey}`);
  } catch (error) {
    logger.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}

module.exports = {
  getSignedUploadUrl,
  deleteFile
};
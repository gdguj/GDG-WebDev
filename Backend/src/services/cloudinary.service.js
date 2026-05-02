const { v2: cloudinary } = require("cloudinary");

const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

function isCloudinaryConfigured() {
  if (cloudName && apiKey && apiSecret) return true;
  return Boolean(String(process.env.CLOUDINARY_URL || "").trim());
}

function assertCloudinaryConfigured() {
  if (!isCloudinaryConfigured()) {
    const error = new Error(
      "Cloudinary غير مهيأ. أضف CLOUDINARY_CLOUD_NAME و CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET في .env"
    );
    error.statusCode = 500;
    throw error;
  }
}

function uploadImageBuffer(buffer, options = {}) {
  assertCloudinaryConfigured();

  const folder = String(options.folder || process.env.CLOUDINARY_UPLOAD_FOLDER || "gdg-games/image-guessing").trim();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );

    stream.end(buffer);
  });
}

module.exports = {
  uploadImageBuffer,
};

const { uploadImageBuffer } = require("../services/cloudinary.service");

function normalizeFolderPart(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function uploadImage(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "يجب إرسال ملف صورة في الحقل image.",
      });
    }

    const userId = normalizeFolderPart(req.authUser && req.authUser.id);
    const baseFolder = String(process.env.CLOUDINARY_USERS_FOLDER || "Users_Games").trim();
    const folder = `${baseFolder}/${userId || "anonymous"}/image-guessing`;

    const result = await uploadImageBuffer(req.file.buffer, { folder });

    return res.status(201).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadImage,
};

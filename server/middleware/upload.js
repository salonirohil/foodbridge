import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

function imageOnly(_req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
}

function mediaOnly(_req, file, cb) {
  if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
    return cb(new Error('Only image and video files are allowed'));
  }
  cb(null, true);
}

export const uploadFoodImage = multer({
  storage,
  fileFilter: imageOnly,
  limits: { fileSize: 5 * 1024 * 1024 }
});

export const uploadCmsMedia = multer({
  storage,
  fileFilter: mediaOnly,
  limits: { fileSize: 80 * 1024 * 1024 }
});

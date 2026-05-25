import multer from 'multer';
import path from 'path';

// Use memory storage — files stay in req.file.buffer and are saved to the database
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|svg|webp|mp4|mov|avi|quicktime|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Formato de arquivo não suportado!'));
  }
});

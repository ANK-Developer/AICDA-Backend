import multer from "multer";
import path from "path";
import fs from "fs";

// ======================================================
// EXISTING UPLOAD
// Keep this for your existing functionality
// ======================================================

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
});

// ======================================================
// LOCAL UPLOAD FOR GALLERY / MEMBER / PARTNER
// Saves files to src/uploads
// ======================================================

const uploadDir = path.join(process.cwd(), "src", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    cb(null, filename);
  },
});

export const uploadGalleryMedia = multer({
  storage: localStorage,

  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos are allowed"));
    }
  },

  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

// ======================================================
// DEFAULT EXPORT
// Keep your existing upload
// ======================================================

export default upload;

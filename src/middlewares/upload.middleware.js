import multer from "multer";

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

export const uploadGalleryMedia = multer({
  storage: multer.memoryStorage(),
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

export default upload;

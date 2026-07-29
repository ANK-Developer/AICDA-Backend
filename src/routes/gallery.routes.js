// import express from "express";
// import upload from "../middlewares/upload.middleware.js";
// import { uploadImage } from "../controllers/gallery.controller.js";

// const router = express.Router();

// router.post("/upload", upload.single("image"), uploadImage);
// router.get("/test", (req, res) => {
//   res.send("Gallery Route Working");
// });
// export default router;



import express from "express";
import upload from "../middlewares/upload.middleware.js";
import {
  deleteGalleryImage,
  getGalleryImages,
  uploadImage,
  updateGalleryImage,
} from "../controllers/gallery.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/admin.middleware.js";

const router = express.Router();

router.get("/", getGalleryImages);
router.get("/category/:category", getGalleryImages);

router.post(
  "/upload",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  upload.single("image"),
  uploadImage,
);

router.patch(
  "/:id",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  upload.single("image"),
  updateGalleryImage,
);

router.delete(
  "/:id",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  deleteGalleryImage,
);

// router.get("/test", (req, res) => {
//   res.json({
//     success: true,
//     message: "Gallery Route Working",
//   });
// });

export default router;

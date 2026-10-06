import express from "express";
import { uploadGalleryMedia } from "../middlewares/upload.middleware.js";
import {
  uploadImage,
  getGalleryImages,
  getSingleGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  getAdminGallery,
  toggleGalleryVisibility,
  reorderBanners,
} from "../controllers/gallery.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/superAdmin.middlewares.js";

const router = express.Router();

const adminOnly = [isAuthenticated, authorizeRoles("SUPER_ADMIN")];

router.post("/upload", ...adminOnly, uploadGalleryMedia.single("image"), uploadImage);

router.get("/", getGalleryImages);

// Every item, hidden ones included — for the admin Media Library.
router.get("/admin", ...adminOnly, getAdminGallery);

// Declared before "/:id" so "banners" is not read as an id.
router.patch("/banners/reorder", ...adminOnly, reorderBanners);

router.get("/:id", getSingleGalleryImage);

router.patch("/:id/visibility", ...adminOnly, toggleGalleryVisibility);

router.patch("/:id", ...adminOnly, uploadGalleryMedia.single("image"), updateGalleryImage);

router.delete("/:id", ...adminOnly, deleteGalleryImage);

export default router;
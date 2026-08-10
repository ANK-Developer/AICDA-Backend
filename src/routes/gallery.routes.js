import express from "express";
import { uploadGalleryMedia } from "../middlewares/upload.middleware.js";
import {
  uploadImage,
  getGalleryImages,
  getSingleGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
} from "../controllers/gallery.controller.js";

const router = express.Router();

router.post("/upload", uploadGalleryMedia.single("image"), uploadImage);

router.get("/", getGalleryImages);

router.get("/:id", getSingleGalleryImage);

router.patch("/:id", uploadGalleryMedia.single("image"), updateGalleryImage);

router.delete("/:id", deleteGalleryImage);

export default router;
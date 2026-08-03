import express from "express";
import upload from "../middlewares/upload.middleware.js";
import {
  uploadImage,
  getGalleryImages,
  getSingleGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
} from "../controllers/gallery.controller.js";

const router = express.Router();

router.post("/upload", upload.single("image"), uploadImage);

router.get("/", getGalleryImages);

router.get("/:id", getSingleGalleryImage);

router.patch("/:id", upload.single("image"), updateGalleryImage);

router.delete("/:id", deleteGalleryImage);

export default router;
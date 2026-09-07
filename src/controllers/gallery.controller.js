import prisma from "../config/prisma.js";
import fs from "fs";
import path from "path";

const GALLERY_CATEGORIES = ["ASSOCIATION", "POLITICAL_ACHIEVEMENT", "IMAGE", "DIRECTORY", "LETTER", "BANNER"];

const getResourceType = (mimetype) => (mimetype.startsWith("video/") ? "video" : "image");

// ==========================
// Upload Image / Video
// ==========================

export const uploadImage = async (req, res) => {
  try {
    const { title, description, category } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image or video is required",
      });
    }

    if (!category || !GALLERY_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${GALLERY_CATEGORIES.join(", ")}`,
      });
    }

    const resourceType = getResourceType(req.file.mimetype);

    // Save only path in database
    const fileUrl = `/uploads/${req.file.filename}`;

    const gallery = await prisma.gallery.create({
      data: {
        title: title?.trim() || req.file.originalname,
        description: description?.trim() || null,
        category,
        imageUrl: fileUrl,

        resourceType: resourceType.toUpperCase(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Gallery item uploaded successfully",
      gallery,
    });
  } catch (error) {
    // Remove uploaded file if database operation fails
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to upload gallery item",
    });
  }
};

// ==========================
// Get Gallery Images
// ==========================

export const getGalleryImages = async (req, res) => {
  try {
    const { category } = req.query;

    if (category && !GALLERY_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${GALLERY_CATEGORIES.join(", ")}`,
      });
    }

    const gallery = await prisma.gallery.findMany({
      where: category ? { category } : {},
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: gallery.length,
      gallery,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch gallery",
    });
  }
};

// ==========================
// Get Single Image / Video
// ==========================

export const getSingleGalleryImage = async (req, res) => {
  try {
    const gallery = await prisma.gallery.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: "Gallery image not found",
      });
    }

    return res.status(200).json({
      success: true,
      gallery,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch image",
    });
  }
};

// ==========================
// Update Image / Video
// ==========================

export const updateGalleryImage = async (req, res) => {
  try {
    const gallery = await prisma.gallery.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: "Gallery image not found",
      });
    }

    const { title, description, category } = req.body;

    if (category && !GALLERY_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${GALLERY_CATEGORIES.join(", ")}`,
      });
    }

    const data = {};

    if (title !== undefined) {
      data.title = title.trim();
    }

    if (description !== undefined) {
      data.description = description.trim() || null;
    }

    if (category !== undefined) {
      data.category = category;
    }

    // New image/video uploaded
    if (req.file) {
      const resourceType = getResourceType(req.file.mimetype);

      data.imageUrl = `/uploads/${req.file.filename}`;

      data.resourceType = resourceType.toUpperCase();
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nothing to update",
      });
    }

    // Update database
    const updatedGallery = await prisma.gallery.update({
      where: {
        id: req.params.id,
      },
      data,
    });

    // Delete old physical file
    if (req.file && gallery.imageUrl) {
      const oldFilePath = path.join(process.cwd(), "src", gallery.imageUrl.replace("/uploads/", "uploads/"));

      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Gallery item updated successfully",
      gallery: updatedGallery,
    });
  } catch (error) {
    // Delete newly uploaded file if database update fails
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update gallery item",
    });
  }
};

// ==========================
// Delete Image / Video
// ==========================

export const deleteGalleryImage = async (req, res) => {
  try {
    const gallery = await prisma.gallery.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: "Gallery image not found",
      });
    }

    // Delete physical file from src/uploads
    if (gallery.imageUrl) {
      const filePath = path.join(process.cwd(), "src", gallery.imageUrl.replace("/uploads/", "uploads/"));

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete database record
    await prisma.gallery.delete({
      where: {
        id: req.params.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Gallery item deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to delete gallery item",
    });
  }
};

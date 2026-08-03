import cloudinary, { uploadBufferToCloudinary } from "../config/cloudinary.js";
import prisma from "../config/prisma.js";

const GALLERY_CATEGORIES = [
  "ASSOCIATION",
  "POLITICAL_ACHIEVEMENT",
  "IMAGE",
  "DIRECTORY",
  "LETTER",
];

// ==========================
// Upload Image
// ==========================
export const uploadImage = async (req, res) => {
  let uploadedImage = null;

  try {
    const { title, description, category } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    if (!category || !GALLERY_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${GALLERY_CATEGORIES.join(", ")}`,
      });
    }

    uploadedImage = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "aicda/gallery",
      resource_type: "image",
    });

    const gallery = await prisma.gallery.create({
      data: {
        title: title?.trim() || req.file.originalname,
        description: description?.trim() || null,
        category,
        imageUrl: uploadedImage.secure_url,
        publicId: uploadedImage.public_id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      gallery,
    });
  } catch (error) {
    if (uploadedImage?.public_id) {
      await cloudinary.uploader.destroy(uploadedImage.public_id).catch(() => {});
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to upload image",
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
// Get Single Image
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
// Update Image
// ==========================
export const updateGalleryImage = async (req, res) => {
  let uploadedImage = null;

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

    if (title !== undefined)
      data.title = title.trim();

    if (description !== undefined)
      data.description = description.trim() || null;

    if (category !== undefined)
      data.category = category;

    if (req.file) {
      uploadedImage = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "aicda/gallery",
        resource_type: "image",
      });

      data.imageUrl = uploadedImage.secure_url;
      data.publicId = uploadedImage.public_id;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nothing to update",
      });
    }

    const updatedGallery = await prisma.gallery.update({
      where: {
        id: req.params.id,
      },
      data,
    });

    if (uploadedImage) {
      await cloudinary.uploader
        .destroy(gallery.publicId)
        .catch(() => {});
    }

    return res.status(200).json({
      success: true,
      message: "Gallery updated successfully",
      gallery: updatedGallery,
    });
  } catch (error) {
    if (uploadedImage?.public_id) {
      await cloudinary.uploader.destroy(uploadedImage.public_id).catch(() => {});
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update image",
    });
  }
};

// ==========================
// Delete Image
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

    await cloudinary.uploader.destroy(gallery.publicId);

    await prisma.gallery.delete({
      where: {
        id: req.params.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Gallery image deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to delete image",
    });
  }
};
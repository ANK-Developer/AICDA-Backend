import cloudinary from "../config/cloudinary.js";
import prisma from "../config/prisma.js";
import fs from "fs-extra";
import path from "path";

const categories = [
  "ASSOCIATION",
  "POLITICAL_ACHIEVEMENT",
  "IMAGE",
  "DIRECTORY",
  "LETTER",
];

export const uploadImage = async (req, res) => {
  let uploadResult;

  try {
    const { title, description, category } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    if (!category || !categories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${categories.join(", ")}`,
      });
    }

    const filePath = path.resolve(req.file.path);
    uploadResult = await cloudinary.uploader.upload(filePath, {
      folder: "aicda/gallery",
      resource_type: "image",
    });

    const gallery = await prisma.gallery.create({
      data: {
        title: title?.trim() || req.file.originalname,
        description: description?.trim() || null,
        category,
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      gallery,
    });
  } catch (error) {
    if (uploadResult?.public_id) {
      await cloudinary.uploader.destroy(uploadResult.public_id).catch(() => {});
    }

    console.error("Gallery Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to upload image",
    });
  } finally {
    if (req.file?.path) {
      await fs.remove(req.file.path).catch(() => {});
    }
  }
};

export const getGalleryImages = async (req, res) => {
  try {
    const category = req.params.category || req.query.category;

    if (category && !categories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${categories.join(", ")}`,
      });
    }

    const gallery = await prisma.gallery.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: gallery.length,
      gallery,
    });
  } catch (error) {
    console.error("Get Gallery Error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch gallery" });
  }
};

export const updateGalleryImage = async (req, res) => {
  let uploadResult;

  try {
    const gallery = await prisma.gallery.findUnique({ where: { id: req.params.id } });
    if (!gallery) {
      return res.status(404).json({ success: false, message: "Gallery image not found" });
    }

    const { category, title, description } = req.body;
    if (category !== undefined && !categories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${categories.join(", ")}`,
      });
    }

    const data = {};
    if (category !== undefined) data.category = category;
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description.trim() || null;

    if (req.file) {
      uploadResult = await cloudinary.uploader.upload(path.resolve(req.file.path), {
        folder: "aicda/gallery",
        resource_type: "image",
      });
      data.imageUrl = uploadResult.secure_url;
      data.publicId = uploadResult.public_id;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide a category, title, description, or image to update",
      });
    }

    const updatedGallery = await prisma.gallery.update({
      where: { id: gallery.id },
      data,
    });

    if (uploadResult) {
      await cloudinary.uploader.destroy(gallery.publicId).catch((error) => {
        console.error("Old Cloudinary image cleanup failed:", error.message);
      });
    }

    return res.status(200).json({
      success: true,
      message: "Gallery image updated successfully",
      gallery: updatedGallery,
    });
  } catch (error) {
    if (uploadResult?.public_id) {
      await cloudinary.uploader.destroy(uploadResult.public_id).catch(() => {});
    }
    console.error("Update Gallery Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Unable to update image" });
  } finally {
    if (req.file?.path) {
      await fs.remove(req.file.path).catch(() => {});
    }
  }
};

export const deleteGalleryImage = async (req, res) => {
  try {
    const gallery = await prisma.gallery.findUnique({ where: { id: req.params.id } });
    if (!gallery) {
      return res.status(404).json({ success: false, message: "Gallery image not found" });
    }

    await cloudinary.uploader.destroy(gallery.publicId);
    await prisma.gallery.delete({ where: { id: gallery.id } });

    return res.status(200).json({
      success: true,
      message: "Gallery image deleted successfully",
    });
  } catch (error) {
    console.error("Delete Gallery Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Unable to delete image" });
  }
};

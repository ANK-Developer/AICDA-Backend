import prisma from "../config/prisma.js";
import fs from "fs";
import path from "path";
import { BANNER_SECTION_LIMITS, isBannerSection } from "../utils/bannerSections.js";

const GALLERY_CATEGORIES = ["ASSOCIATION", "POLITICAL_ACHIEVEMENT", "IMAGE", "DIRECTORY", "LETTER", "BANNER"];

const getResourceType = (mimetype) => (mimetype.startsWith("video/") ? "video" : "image");

// Videos are not uploaded: the admin gives a link (YouTube, Vimeo or a direct video file URL).
const parseVideoUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

// Banners play as a slideshow in their admin-chosen order; everything else is newest first.
const galleryOrder = (category) =>
  category === "BANNER"
    ? [{ sortOrder: "asc" }, { createdAt: "asc" }]
    : [{ createdAt: "desc" }];

const removeLocalFile = (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith("/uploads/")) return;

  const filePath = path.join(process.cwd(), "src", fileUrl.replace("/uploads/", "uploads/"));

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

// ==========================
// Upload Image / Add Video (by URL)
// ==========================

export const uploadImage = async (req, res) => {
  try {
    const { title, description, category, resourceType: requestedType, videoUrl } = req.body;

    if (!category || !GALLERY_CATEGORIES.includes(category)) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});

      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${GALLERY_CATEGORIES.join(", ")}`,
      });
    }

    const isVideo = String(requestedType || "").toUpperCase() === "VIDEO";

    let fileUrl;
    let defaultTitle;

    if (isVideo) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});

      fileUrl = parseVideoUrl(videoUrl);

      if (!fileUrl) {
        return res.status(400).json({
          success: false,
          message: "A valid video URL (http or https) is required",
        });
      }

      defaultTitle = "Video";
    } else {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Image is required" });
      }

      if (getResourceType(req.file.mimetype) !== "image") {
        fs.unlink(req.file.path, () => {});

        return res.status(400).json({ success: false, message: "Selected file is not an image" });
      }

      fileUrl = `/uploads/${req.file.filename}`;
      defaultTitle = req.file.originalname;
    }

    let sortOrder = 0;

    if (category === "BANNER") {
      const section = title?.trim();

      if (isVideo || !isBannerSection(section)) {
        if (req.file?.path) fs.unlink(req.file.path, () => {});

        return res.status(400).json({
          success: false,
          message: "Choose a valid banner section and upload an image",
        });
      }

      const [count, last] = await Promise.all([
        prisma.gallery.count({ where: { category: "BANNER", title: section } }),
        prisma.gallery.aggregate({
          where: { category: "BANNER", title: section },
          _max: { sortOrder: true },
        }),
      ]);

      const limit = BANNER_SECTION_LIMITS[section];

      if (count >= limit) {
        fs.unlink(req.file.path, () => {});

        return res.status(400).json({
          success: false,
          message: `This section already has the maximum of ${limit} banner${limit === 1 ? "" : "s"}. Delete one to add another.`,
        });
      }

      sortOrder = (last._max.sortOrder ?? -1) + 1;
    }

    const gallery = await prisma.gallery.create({
      data: {
        title: title?.trim() || defaultTitle,
        description: description?.trim() || null,
        category,
        imageUrl: fileUrl,
        resourceType: isVideo ? "VIDEO" : "IMAGE",
        sortOrder,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Gallery item uploaded successfully",
      gallery,
    });
  } catch (error) {
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
      where: { isActive: true, ...(category && { category }) },
      orderBy: galleryOrder(category),
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
// Admin: all items (visible + hidden)
// ==========================

export const getAdminGallery = async (req, res) => {
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
      orderBy: galleryOrder(category),
    });

    return res.status(200).json({ success: true, count: gallery.length, gallery });
  } catch (error) {
    console.error(error);

    return res.status(500).json({ success: false, message: "Unable to fetch gallery" });
  }
};

// ==========================
// Admin: block / unblock (hide / show on the public site)
// ==========================

export const toggleGalleryVisibility = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive must be true or false" });
    }

    const existing = await prisma.gallery.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Gallery item not found" });
    }

    const gallery = await prisma.gallery.update({
      where: { id: req.params.id },
      data: { isActive },
    });

    return res.status(200).json({
      success: true,
      message: isActive ? "Gallery item is now visible" : "Gallery item is now hidden",
      gallery,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({ success: false, message: "Unable to update gallery item" });
  }
};

// ==========================
// Admin: reorder the banners of one section
// body: { section: "home", ids: [id, id, ...] } — ids in the wanted order
// ==========================

export const reorderBanners = async (req, res) => {
  try {
    const { section, ids } = req.body;

    if (!isBannerSection(section) || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "A valid section and ids are required" });
    }

    const existing = await prisma.gallery.findMany({
      where: { category: "BANNER", title: section },
      select: { id: true },
    });

    const sameSet =
      existing.length === ids.length &&
      new Set(ids).size === ids.length &&
      existing.every((item) => ids.includes(item.id));

    if (!sameSet) {
      return res.status(400).json({
        success: false,
        message: "The list does not match this section's banners. Refresh and try again.",
      });
    }

    await prisma.$transaction(
      ids.map((id, index) => prisma.gallery.update({ where: { id }, data: { sortOrder: index } })),
    );

    return res.status(200).json({ success: true, message: "Banner order saved" });
  } catch (error) {
    console.error(error);

    return res.status(500).json({ success: false, message: "Unable to save banner order" });
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

    if (!gallery || !gallery.isActive) {
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

    const { title, description, category, videoUrl } = req.body;

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

    if (gallery.resourceType === "VIDEO") {
      // Videos are links; a file upload is ignored.
      if (req.file?.path) fs.unlink(req.file.path, () => {});

      if (videoUrl !== undefined) {
        const parsed = parseVideoUrl(videoUrl);

        if (!parsed) {
          return res.status(400).json({ success: false, message: "A valid video URL (http or https) is required" });
        }

        data.imageUrl = parsed;
      }
    } else if (req.file) {
      if (getResourceType(req.file.mimetype) !== "image") {
        fs.unlink(req.file.path, () => {});

        return res.status(400).json({ success: false, message: "Selected file is not an image" });
      }

      data.imageUrl = `/uploads/${req.file.filename}`;
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

    // Delete old physical file (only for locally uploaded images)
    if (data.imageUrl && data.imageUrl !== gallery.imageUrl) {
      removeLocalFile(gallery.imageUrl);
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

    // Delete physical file from src/uploads (video links have none)
    removeLocalFile(gallery.imageUrl);

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

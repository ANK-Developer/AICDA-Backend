import prisma from "../config/prisma.js";
import cloudinary, { uploadBufferToCloudinary } from "../config/cloudinary.js";

const uploadImportantDateImage = async (file) => {
  if (!file) return null;
  return uploadBufferToCloudinary(file.buffer, {
    folder: "aicda/important-dates",
    resource_type: "image",
  });
};

export const createImportantDate = async (body, file) => {
  const uploaded = await uploadImportantDateImage(file);

  return prisma.importantDate.create({
    data: {
      title: body.title.trim(),
      date: new Date(body.date),
      description: body.description?.trim() || null,
      imageUrl: uploaded?.secure_url || null,
      imagePublicId: uploaded?.public_id || null,
    },
  });
};

export const getAllImportantDates = async () => {
  return prisma.importantDate.findMany({
    orderBy: { date: "asc" },
  });
};

export const getImportantDateById = async (id) => {
  return prisma.importantDate.findUnique({
    where: { id: Number(id) },
  });
};

export const updateImportantDate = async (id, body, file) => {
  const existing = await prisma.importantDate.findUnique({ where: { id: Number(id) } });

  if (!existing) {
    const error = new Error("Important date not found");
    error.status = 404;
    throw error;
  }

  const data = {};
  if (body.title !== undefined) data.title = body.title.trim();
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.description !== undefined) data.description = body.description?.trim() || null;

  const uploaded = await uploadImportantDateImage(file);
  if (uploaded) {
    data.imageUrl = uploaded.secure_url;
    data.imagePublicId = uploaded.public_id;
  }

  const updated = await prisma.importantDate.update({
    where: { id: Number(id) },
    data,
  });

  // Replacing the image — drop the old Cloudinary asset now that the new
  // one has saved successfully, so it doesn't linger unused.
  if (uploaded && existing.imagePublicId) {
    await cloudinary.uploader.destroy(existing.imagePublicId).catch(() => {});
  }

  return updated;
};

export const deleteImportantDate = async (id) => {
  const existing = await prisma.importantDate.findUnique({ where: { id: Number(id) } });

  if (!existing) {
    const error = new Error("Important date not found");
    error.status = 404;
    throw error;
  }

  if (existing.imagePublicId) {
    await cloudinary.uploader.destroy(existing.imagePublicId).catch(() => {});
  }

  return prisma.importantDate.delete({
    where: { id: Number(id) },
  });
};

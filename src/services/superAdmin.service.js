import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";

const superAdminSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
};

export const getSuperAdmins = async () => {
  return await prisma.admin.findMany({
    where: {
      role: "SUPER_ADMIN",
    },
    select: superAdminSelect,
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getSuperAdminById = async (id) => {
  return await prisma.admin.findUnique({
    where: { id },
    select: superAdminSelect,
  });
};

export const createSuperAdmin = async (data, creatorId) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  return await prisma.admin.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.trim().toLowerCase(),
      phone: data.phone || null,
      password: hashedPassword,
      createdById: creatorId,
    },
    select: superAdminSelect,
  });
};

export const updateSuperAdmin = async (id, data) => {
  const existing = await prisma.admin.findUnique({ where: { id } });

  if (!existing) {
    const error = new Error("Super admin not found");
    error.status = 404;
    throw error;
  }

  const updateData = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email ? data.email.trim().toLowerCase() : undefined,
    phone: data.phone,
  };

  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  return await prisma.admin.update({
    where: { id },
    data: updateData,
    select: superAdminSelect,
  });
};

export const toggleSuperAdminStatus = async (id) => {
  const admin = await prisma.admin.findUnique({ where: { id } });

  if (!admin) {
    const error = new Error("Super admin not found");
    error.status = 404;
    throw error;
  }

  return await prisma.admin.update({
    where: { id },
    data: { isActive: !admin.isActive },
    select: superAdminSelect,
  });
};

export const deleteSuperAdmin = async (id) => {
  const existing = await prisma.admin.findUnique({ where: { id } });

  if (!existing) {
    const error = new Error("Super admin not found");
    error.status = 404;
    throw error;
  }

  return await prisma.admin.delete({ where: { id } });
};

export const resetSuperAdminPassword = async (id, newPassword) => {
  const existing = await prisma.admin.findUnique({ where: { id } });

  if (!existing) {
    const error = new Error("Super admin not found");
    error.status = 404;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.admin.update({
    where: { id },
    data: { password: hashedPassword },
  });
};

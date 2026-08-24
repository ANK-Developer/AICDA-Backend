import prisma from "../config/prisma.js";

export const createImportantDate = async (body) => {
  return prisma.importantDate.create({
    data: {
      title: body.title.trim(),
      date: new Date(body.date),
      description: body.description?.trim() || null,
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

export const updateImportantDate = async (id, body) => {
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

  return prisma.importantDate.update({
    where: { id: Number(id) },
    data,
  });
};

export const deleteImportantDate = async (id) => {
  const existing = await prisma.importantDate.findUnique({ where: { id: Number(id) } });

  if (!existing) {
    const error = new Error("Important date not found");
    error.status = 404;
    throw error;
  }

  return prisma.importantDate.delete({
    where: { id: Number(id) },
  });
};

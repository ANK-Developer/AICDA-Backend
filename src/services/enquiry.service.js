import prisma from "../config/prisma.js";

export const createEnquiry = async (data) => {
  const enquiry = await prisma.enquiry.create({
    data: {
      requestType: data.requestType,
      fullName: data.fullName,
      mobile: data.mobile,
      email: data.email || null,
      companyName: data.companyName || null,
      city: data.city || null,
      state: data.state || null,
      message: data.message || null,
    },
  });

  return enquiry;
};

export const getAllEnquiries = async () => {
  return prisma.enquiry.findMany({
    orderBy: { createdAt: "desc" },
  });
};

export const deleteEnquiry = async (id) => {
  return prisma.enquiry.delete({
    where: { id: Number(id) },
  });
};
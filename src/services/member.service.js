import prisma from "../config/prisma.js";

const parseOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return Number(value);
};

export const createMember = async (req) => {
  const body = req.body;

  return prisma.member.create({
    data: {
      memberId: body.memberId,
      memberName: body.memberName,
      fatherName: body.fatherName || null,
      photo: req.file?.path || req.file?.originalname || null,
      residentialAddress: body.residentialAddress || null,
      mobile: body.mobile || null,
      residentialTelephone: body.residentialTelephone || null,
      panCardNo: body.panCardNo || null,
      designation: body.designation || null,
      companyName: body.companyName || null,
      companyAddress: body.companyAddress || null,
      companyTelephone: body.companyTelephone || null,
      packetNo: body.packetNo || null,
      dateOfJoining: body.dateOfJoining ? new Date(body.dateOfJoining) : null,
      aadharNo: body.aadharNo || null,
      stateId: parseOptionalNumber(body.stateId),
      cityId: parseOptionalNumber(body.cityId),
    },
  });
};

export const getAllMembers = async () => {
  return prisma.member.findMany({
    include: {
      state: true,
      city: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getPublicMembers = async () => {
  return prisma.member.findMany({
    where: { isActive: true },
    select: {
      id: true,
      memberId: true,
      memberName: true,
      designation: true,
      companyName: true,
      photo: true,
      state: { select: { stateName: true } },
      city: { select: { cityName: true } },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getMemberById = async (id) => {
  return prisma.member.findUnique({
    where: { id: Number(id) },
    include: {
      state: true,
      city: true,
    },
  });
};

export const updateMember = async (id, req) => {
  const body = req.body;

  const data = {
    memberId: body.memberId,
    memberName: body.memberName,
    fatherName: body.fatherName,
    photo: req.file?.path || req.file?.originalname,
    residentialAddress: body.residentialAddress,
    mobile: body.mobile,
    residentialTelephone: body.residentialTelephone,
    panCardNo: body.panCardNo,
    designation: body.designation,
    companyName: body.companyName,
    companyAddress: body.companyAddress,
    companyTelephone: body.companyTelephone,
    packetNo: body.packetNo,
    dateOfJoining: body.dateOfJoining ? new Date(body.dateOfJoining) : null,
    aadharNo: body.aadharNo,
    stateId: parseOptionalNumber(body.stateId),
    cityId: parseOptionalNumber(body.cityId),
  };

  Object.keys(data).forEach((key) => {
    if (data[key] === undefined) delete data[key];
  });

  return prisma.member.update({
    where: { id: Number(id) },
    data,
  });
};

export const toggleMemberStatus = async (id) => {
  const member = await prisma.member.findUnique({
    where: { id: Number(id) },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  return prisma.member.update({
    where: { id: Number(id) },
    data: { isActive: !member.isActive },
  });
};

export const deleteMember = async (id) => {
  return prisma.member.delete({
    where: { id: Number(id) },
  });
};
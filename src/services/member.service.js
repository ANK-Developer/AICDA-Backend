import prisma from "../config/prisma.js";
import { uploadBufferToCloudinary } from "../config/cloudinary.js";

const uploadMemberPhoto = async (file) => {
  if (!file) return null;
  const uploaded = await uploadBufferToCloudinary(file.buffer, {
    folder: "aicda/members",
    resource_type: "image",
  });
  return uploaded.secure_url;
};

// Members are entered by name ("Rajasthan" / "Alwar") rather than picked
// from a managed reference list, so we find-or-create the State/City rows
// behind the scenes instead of requiring stateId/cityId from the client.
const resolveLocationIds = async (stateName, cityName) => {
  const state = (stateName || "").trim();
  const city = (cityName || "").trim();

  let stateId = null;
  if (state) {
    const stateRow =
      (await prisma.state.findFirst({ where: { stateName: state } })) ||
      (await prisma.state.create({ data: { stateName: state } }));
    stateId = stateRow.id;
  }

  let cityId = null;
  if (city && stateId) {
    const cityRow =
      (await prisma.city.findFirst({ where: { cityName: city, stateId } })) ||
      (await prisma.city.create({ data: { cityName: city, stateId } }));
    cityId = cityRow.id;
  }

  return { stateId, cityId };
};

export const createMember = async (req) => {
  const body = req.body;
  const photo = await uploadMemberPhoto(req.file);
  const { stateId, cityId } = await resolveLocationIds(body.state, body.city);

  return prisma.member.create({
    data: {
      memberId: body.memberId,
      memberName: body.memberName,
      fatherName: body.fatherName || null,
      photo,
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
      validityFrom: body.validityFrom ? new Date(body.validityFrom) : null,
      validityTo: body.validityTo ? new Date(body.validityTo) : null,
      aadharNo: body.aadharNo || null,
      stateId,
      cityId,
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
  const members = await prisma.member.findMany({
    where: { isActive: true },
    select: {
      id: true,
      memberId: true,
      memberName: true,
      fatherName: true,
      designation: true,
      companyName: true,
      companyAddress: true,
      companyTelephone: true,
      residentialAddress: true,
      residentialTelephone: true,
      packetNo: true,
      dateOfJoining: true,
      validityFrom: true,
      validityTo: true,
      mobile: true,
      photo: true,
      state: { select: { stateName: true } },
      city: { select: { cityName: true } },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return members.map((member) => ({
    ...member,
    state: member.state?.stateName ?? null,
    city: member.city?.cityName ?? null,
  }));
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
  const existing = await prisma.member.findUnique({ where: { id: Number(id) } });

  if (!existing) {
    const error = new Error("Member not found");
    error.status = 404;
    throw error;
  }

  const body = req.body;
  const photo = req.file ? await uploadMemberPhoto(req.file) : undefined;
  const { stateId, cityId } =
    body.state !== undefined || body.city !== undefined
      ? await resolveLocationIds(body.state, body.city)
      : { stateId: undefined, cityId: undefined };

  const data = {
    memberId: body.memberId,
    memberName: body.memberName,
    fatherName: body.fatherName,
    photo,
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
    validityFrom: body.validityFrom ? new Date(body.validityFrom) : null,
    validityTo: body.validityTo ? new Date(body.validityTo) : null,
    aadharNo: body.aadharNo,
    stateId,
    cityId,
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
    const error = new Error("Member not found");
    error.status = 404;
    throw error;
  }

  return prisma.member.update({
    where: { id: Number(id) },
    data: { isActive: !member.isActive },
  });
};

export const deleteMember = async (id) => {
  const existing = await prisma.member.findUnique({ where: { id: Number(id) } });

  if (!existing) {
    const error = new Error("Member not found");
    error.status = 404;
    throw error;
  }

  return prisma.member.delete({
    where: { id: Number(id) },
  });
};
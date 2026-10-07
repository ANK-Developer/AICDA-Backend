import prisma from "../config/prisma.js";
import { resolveRenewalPeriod, validityFromForEdit, endOfDayIST } from "../utils/validity.js";
import { parseExpiringDays, parseStatusChange, statusCounts, statusFilterWhere, withStatus } from "../utils/membership.js";
import { asSpecialDateList, buildSpecialDate, parseSpecialDates, updateSpecialDateInList } from "../utils/specialDates.js";
const getLocalPhotoPath = (file) => {
  if (!file) return null;

  return `/uploads/${file.filename}`;
};
export const createMember = async (req) => {
  const body = req.body;
  const photo = req.file ? getLocalPhotoPath(req.file) : undefined;
  // A member created without payment has no validity yet. When the first payment
  // is entered, Valid From defaults to today and the payment date is today.
  const dateOfJoining = body.dateOfJoining ? new Date(body.dateOfJoining) : null;
  const period = body.validityTo
    ? resolveRenewalPeriod({
        previousValidityTo: null,
        createdAt: new Date(),
        validityFrom: body.validityFrom,
        validityTo: body.validityTo,
      })
    : null;
  const validityFrom = period?.validityFrom ?? null;
  const validityTo = period?.validityTo ?? null;

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        memberId: Number(body.memberId),
        memberName: body.memberName,
        fatherName: body.fatherName || null,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        specialDates: parseSpecialDates(body.specialDates) ?? [],
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
        dateOfJoining,
        validityFrom,
        validityTo,
        aadharNo: body.aadharNo || null,
        state: body.state || null,
        district: body.district || null,
        city: body.city || null,
      },
    });

    if (period) {
      await tx.memberRenewal.create({
        data: {
          memberId: member.id,
          amount: body.amount !== undefined && body.amount !== "" ? body.amount : null,
          paymentDate: period.paymentDate,
          validityFrom,
          validityTo,
          note: body.note || null,
        },
      });
    }

    return withStatus(member);
  });
};

const SORTABLE_MEMBER_FIELDS = ["createdAt", "updatedAt", "memberId", "memberName", "dateOfJoining", "validityFrom", "validityTo"];

// Supports: search (memberId/memberName/companyName/mobile/designation),
// status (active/inactive), state, district, city, page, limit, sortBy, order —
// mirrors partner.service.js's getAllPartners.
export const getAllMembers = async (query = {}) => {
  const { search, status, state, district, city, page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = query;

  const where = {};

  if (search) {
    const isNumeric = /^\d+$/.test(search.trim());
    where.OR = [...(isNumeric ? [{ memberId: Number(search.trim()) }] : []), { memberName: { contains: search } }, { companyName: { contains: search } }, { mobile: { contains: search } }, { designation: { contains: search } }];
  }

  // status: active | inactive | blocked | expired | pending | expiring (see
  // utils/membership.js). Worked out here, never in the browser.
  const expiringDays = parseExpiringDays(query.expiringDays);
  const statusWhere = statusFilterWhere(status, expiringDays);
  if (statusWhere) where.AND = [...(where.AND || []), statusWhere];

  if (state) where.state = state;
  if (district) where.district = district;
  if (city) where.city = city;

  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const sortField = SORTABLE_MEMBER_FIELDS.includes(sortBy) ? sortBy : "createdAt";
  const sortOrder = order === "asc" ? "asc" : "desc";

  const [members, total, stats] = await Promise.all([
      prisma.member.findMany({
        where,
        include: {
          _count: { select: { partners: true } },
        },
        orderBy: {
          [sortField]: sortOrder,
        },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),

      prisma.member.count({ where }),
      // Directory-wide counts, independent of the current search/status
      // filter — these back the summary cards.
      statusCounts(prisma.member, expiringDays),
  ]);

  return {
    members: members.map(withStatus),
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
    stats,
  };
};

export const getPublicMembers = async () => {
  const [members] = await Promise.all([
    prisma.member.findMany({
      // where: { isActive: true },
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
        isActive: true,
        state: true,
        city: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return members.map(withStatus);
};

// ======================================================
// GET PUBLIC MEMBER BY ID
// GET /api/v1/members/public/:id
//
// Same safe field selection as getPublicMembers (no PAN/Aadhaar/DOB),
// plus the member's partners so a shared link shows the full picture.
// ======================================================

export const getPublicMemberById = async (id) => {
  const [member] = await Promise.all([
    prisma.member.findUnique({
      where: { id: Number(id) },
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
        isActive: true,
        state: true,
        city: true,
        partners: {
          select: {
            id: true,
            partnerId: true,
            partnerName: true,
            designation: true,
            companyName: true,
            mobile: true,
            photo: true,
            isActive: true,
            validityTo: true,
          },
          orderBy: { partnerNumber: "asc" },
        },
      },
    }),
  ]);

  if (!member) return null;

  return {
    ...withStatus(member),
    partners: member.partners.map(withStatus),
  };
};

// Includes partners and renewal (payment) history so the admin details page
// can answer "who are their partners" and "when did they pay / renew".
export const getMemberById = async (id) => {
  const [member] = await Promise.all([
    prisma.member.findUnique({
      where: { id: Number(id) },
      include: {
        partners: {
          orderBy: { partnerNumber: "asc" },
        },
        renewals: {
          orderBy: [{ validityTo: "desc" }, { paymentDate: "desc" }],
        },
      },
    }),
  ]);

  if (!member) return member;

  return { ...withStatus(member), partners: member.partners.map(withStatus) };
};

export const updateMember = async (id, req) => {
  const existing = await prisma.member.findUnique({ where: { id: Number(id) } });

  if (!existing) {
    const error = new Error("Member not found");
    error.status = 404;
    throw error;
  }

  const body = req.body;
  const photo = req.file ? getLocalPhotoPath(req.file) : undefined;
  // validityFrom is never client-supplied — if validityTo is being changed
  // here (rather than through the dedicated renew endpoint), derive it the
  // same way renew does: the creation day for a first payment, the previous
  // expiry for an extension.
  const resolvedDateOfJoining = body.dateOfJoining !== undefined ? (body.dateOfJoining ? new Date(body.dateOfJoining) : null) : undefined;

  const resolvedValidityTo = body.validityTo !== undefined ? (body.validityTo ? endOfDayIST(body.validityTo) : null) : undefined;
  const resolvedValidityFrom = resolvedValidityTo === undefined ? undefined : resolvedValidityTo === null ? null : validityFromForEdit(existing, resolvedValidityTo);

  const data = {
    memberId: body.memberId !== undefined ? Number(body.memberId) : undefined,
    memberName: body.memberName,
    fatherName: body.fatherName,
    dateOfBirth: body.dateOfBirth !== undefined ? (body.dateOfBirth ? new Date(body.dateOfBirth) : null) : undefined,
    specialDates: parseSpecialDates(body.specialDates),
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
    dateOfJoining: resolvedDateOfJoining,
    validityFrom: resolvedValidityFrom,
    validityTo: resolvedValidityTo,
    aadharNo: body.aadharNo,
    state: body.state !== undefined ? body.state || null : undefined,
    district: body.district,
    city: body.city !== undefined ? body.city || null : undefined,
  };

  Object.keys(data).forEach((key) => {
    if (data[key] === undefined) delete data[key];
  });

  // Editing the member (rather than using the dedicated /renew endpoint)
  // can also change validityTo or record an amount paid — e.g. the admin
  // fixing the expiry date or logging a payment from the edit form. Log a
  // MemberRenewal the same way create/renew do, but only when something
  // renewal-worthy actually happened, so routine field edits don't spam
  // the payment history with no-op entries.
  const validityActuallyChanged = resolvedValidityTo && (!existing.validityTo || resolvedValidityTo.getTime() !== new Date(existing.validityTo).getTime());
  const amountProvided = body.amount !== undefined && body.amount !== "";
  const renewalValidityFrom = resolvedValidityFrom ?? existing.validityFrom;
  const renewalValidityTo = resolvedValidityTo ?? existing.validityTo;
  const shouldLogRenewal = (validityActuallyChanged || amountProvided) && renewalValidityFrom && renewalValidityTo;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.member.update({
      where: { id: Number(id) },
      data,
    });

    if (shouldLogRenewal) {
      await tx.memberRenewal.create({
        data: {
          memberId: Number(id),
          amount: amountProvided ? body.amount : null,
          validityFrom: renewalValidityFrom,
          validityTo: renewalValidityTo,
          note: body.note || null,
        },
      });
    }

    return withStatus(updated);
  });
};

// Manual status change by an admin. Deactivating needs a reason; the reason,
// the admin and the time are stored. Renewing or editing never touches this.
export const setMemberStatus = async (id, body, admin) => {
  const change = parseStatusChange(body, admin);

  const member = await prisma.member.findUnique({
    where: { id: Number(id) },
  });

  if (!member) {
    const error = new Error("Member not found");
    error.status = 404;
    throw error;
  }

  const updated = await prisma.member.update({
    where: { id: Number(id) },
    data: change,
  });

  return withStatus(updated);
};

export const renewMember = async (id, req) => {
  const member = await prisma.member.findUnique({
    where: { id: Number(id) },
  });

  if (!member) {
    const error = new Error("Member not found");
    error.status = 404;
    throw error;
  }

  const { validityFrom: requestedFrom, validityTo, amount, note } = req.body;

  // Valid From and Payment Date are optional — see resolveRenewalPeriod for the
  // defaults and the rules that keep the periods in order.
  const period = resolveRenewalPeriod({
    previousValidityTo: member.validityTo,
    createdAt: member.createdAt,
    validityFrom: requestedFrom,
    validityTo,
  });

  return prisma.$transaction(async (tx) => {
    const renewed = await tx.member.update({
      where: { id: Number(id) },
      data: {
        validityFrom: period.validityFrom,
        validityTo: period.validityTo,
      },
    });

    await tx.memberRenewal.create({
      data: {
        memberId: Number(id),
        amount: amount !== undefined && amount !== "" ? amount : null,
        paymentDate: period.paymentDate,
        validityFrom: period.validityFrom,
        validityTo: period.validityTo,
        note: note || null,
      },
    });

    return withStatus(renewed);
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

const findMemberSpecialDates = async (id) => {
  const member = await prisma.member.findUnique({
    where: { id: Number(id) },
    select: { specialDates: true },
  });

  if (!member) {
    const error = new Error("Member not found");
    error.status = 404;
    throw error;
  }

  return asSpecialDateList(member.specialDates);
};

export const addMemberSpecialDate = async (id, body) => {
  const specialDates = [...(await findMemberSpecialDates(id)), buildSpecialDate(body)];

  return prisma.member.update({
    where: { id: Number(id) },
    data: { specialDates },
    select: { specialDates: true },
  });
};

export const deleteMemberSpecialDate = async (id, dateId) => {
  const current = await findMemberSpecialDates(id);
  const specialDates = current.filter((entry) => entry.id !== dateId);

  if (specialDates.length === current.length) {
    const error = new Error("Special date not found");
    error.status = 404;
    throw error;
  }

  return prisma.member.update({
    where: { id: Number(id) },
    data: { specialDates },
    select: { specialDates: true },
  });
};

export const updateMemberSpecialDate = async (id, dateId, body) => {
  const specialDates = updateSpecialDateInList(await findMemberSpecialDates(id), dateId, body);

  if (!specialDates) {
    const error = new Error("Special date not found");
    error.status = 404;
    throw error;
  }

  return prisma.member.update({
    where: { id: Number(id) },
    data: { specialDates },
    select: { specialDates: true },
  });
};

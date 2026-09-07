import prisma from "../config/prisma.js";
import { resolveLocationIds } from "../utils/location.js";
import { isValidToday, nextValidityFrom } from "../utils/validity.js";

const getLocalPhotoPath = (file) => {
  if (!file) return null;

  return `/uploads/${file.filename}`;
};
export const createMember = async (req) => {
  const body = req.body;
  const [photo, { stateId, cityId }] = await Promise.all([
    req.file ? Promise.resolve(getLocalPhotoPath(req.file)) : Promise.resolve(undefined),

    body.state !== undefined || body.city !== undefined
      ? resolveLocationIds(body.state, body.city)
      : Promise.resolve({
          stateId: undefined,
          cityId: undefined,
        }),
  ]);
  // Validity always starts from the joining date (or today, if none given)
  // — never trusted from the client. Only the expiry (validityTo) is
  // admin-entered, when they record the offline payment.
  const dateOfJoining = body.dateOfJoining ? new Date(body.dateOfJoining) : null;
  const validityFrom = dateOfJoining || new Date();
  const validityTo = body.validityTo ? new Date(body.validityTo) : null;

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        memberId: Number(body.memberId),
        memberName: body.memberName,
        fatherName: body.fatherName || null,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
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
        validityFrom: validityTo ? validityFrom : null,
        validityTo,
        aadharNo: body.aadharNo || null,
        stateId,
        district: body.district || null,
        cityId,
      },
    });

    if (validityTo) {
      await tx.memberRenewal.create({
        data: {
          memberId: member.id,
          amount: body.amount !== undefined && body.amount !== "" ? body.amount : null,
          validityFrom,
          validityTo,
          note: body.note || null,
        },
      });
    }

    return member;
  });
};

// Validity isn't watched by a scheduler, so this sweep runs before every
// read and keeps isActive self-healing on expiry — mirrors
// partner.service.js's syncPartnerActiveStatus. It only ever turns an
// expired member off; it never turns one back on, otherwise a manual
// deactivation (toggleMemberStatus) would get silently reverted the next
// time the list is loaded, while the validity window is still current.
// Reactivation happens explicitly, via renew or by extending validityTo.
export const syncMemberActiveStatus = async () => {
  const now = new Date();

  await prisma.member.updateMany({
    where: {
      isActive: true,
      OR: [{ validityTo: null }, { validityTo: { lt: now } }],
    },
    data: { isActive: false },
  });
};

const SORTABLE_MEMBER_FIELDS = ["createdAt", "updatedAt", "memberId", "memberName", "dateOfJoining", "validityFrom", "validityTo"];

// Supports: search (memberId/memberName/companyName/mobile/designation),
// status (active/inactive), stateId, cityId, page, limit, sortBy, order —
// mirrors partner.service.js's getAllPartners.
export const getAllMembers = async (query = {}) => {
  const syncPromise = syncMemberActiveStatus();

  const { search, status, stateId, cityId, page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = query;

  const where = {};

  if (search) {
    const isNumeric = /^\d+$/.test(search.trim());
    where.OR = [...(isNumeric ? [{ memberId: Number(search.trim()) }] : []), { memberName: { contains: search } }, { companyName: { contains: search } }, { mobile: { contains: search } }, { designation: { contains: search } }];
  }

  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;

  if (stateId) where.stateId = Number(stateId);
  if (cityId) where.cityId = Number(cityId);

  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const sortField = SORTABLE_MEMBER_FIELDS.includes(sortBy) ? sortBy : "createdAt";
  const sortOrder = order === "asc" ? "asc" : "desc";

  const [, [members, total, activeCount, inactiveCount]] = await Promise.all([
    syncPromise,
    prisma.$transaction([
      prisma.member.findMany({
        where,
        include: {
          state: true,
          city: true,
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
      // filter — these back the "Total / Active / Inactive" summary bar.
      prisma.member.count({ where: { isActive: true } }),
      prisma.member.count({ where: { isActive: false } }),
    ]),
  ]);

  return {
    members,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
    stats: {
      total: activeCount + inactiveCount,
      active: activeCount,
      inactive: inactiveCount,
    },
  };
};

export const getPublicMembers = async () => {
  const syncPromise = syncMemberActiveStatus();

  const [, members] = await Promise.all([
    syncPromise,
    prisma.member.findMany({
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
    }),
  ]);

  return members.map((member) => ({
    ...member,
    state: member.state?.stateName ?? null,
    city: member.city?.cityName ?? null,
  }));
};

// Includes partners and renewal (payment) history so the admin details page
// can answer "who are their partners" and "when did they pay / renew".
export const getMemberById = async (id) => {
  const [, member] = await Promise.all([
    syncMemberActiveStatus(),
    prisma.member.findUnique({
      where: { id: Number(id) },
      include: {
        state: true,
        city: true,
        partners: {
          include: { state: true, city: true },
          orderBy: { partnerNumber: "asc" },
        },
        renewals: {
          orderBy: { paymentDate: "desc" },
        },
      },
    }),
  ]);

  return member;
};

export const updateMember = async (id, req) => {
  const existing = await prisma.member.findUnique({ where: { id: Number(id) } });

  if (!existing) {
    const error = new Error("Member not found");
    error.status = 404;
    throw error;
  }

  const body = req.body;
  const [photo, { stateId, cityId }] = await Promise.all([
    req.file ? Promise.resolve(getLocalPhotoPath(req.file)) : Promise.resolve(undefined),

    body.state !== undefined || body.city !== undefined
      ? resolveLocationIds(body.state, body.city)
      : Promise.resolve({
          stateId: undefined,
          cityId: undefined,
        }),
  ]);
  // validityFrom is never client-supplied — if validityTo is being changed
  // here (rather than through the dedicated renew endpoint), re-derive it
  // from the joining date the same way create does.
  const resolvedDateOfJoining = body.dateOfJoining !== undefined ? (body.dateOfJoining ? new Date(body.dateOfJoining) : null) : undefined;
  const effectiveDateOfJoining = resolvedDateOfJoining !== undefined ? resolvedDateOfJoining : existing.dateOfJoining;

  const resolvedValidityFrom = body.validityTo !== undefined ? (body.validityTo ? effectiveDateOfJoining || new Date() : null) : undefined;
  const resolvedValidityTo = body.validityTo !== undefined ? (body.validityTo ? new Date(body.validityTo) : null) : undefined;

  // Now that syncMemberActiveStatus never auto-reactivates (see that
  // function's comment), extending the expiry here — rather than through
  // /renew, which already sets isActive itself — has to flip isActive back
  // on explicitly. Only recompute when validityTo actually moved, so
  // resaving the form without touching the date can't undo a manual
  // toggleMemberStatus deactivation.
  const validityToChanged = body.validityTo !== undefined && (existing.validityTo ? existing.validityTo.getTime() : null) !== (resolvedValidityTo ? resolvedValidityTo.getTime() : null);

  const data = {
    memberId: body.memberId !== undefined ? Number(body.memberId) : undefined,
    memberName: body.memberName,
    fatherName: body.fatherName,
    dateOfBirth: body.dateOfBirth !== undefined ? (body.dateOfBirth ? new Date(body.dateOfBirth) : null) : undefined,
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
    stateId,
    district: body.district,
    cityId,
    ...(validityToChanged && {
      isActive: Boolean(resolvedValidityTo && resolvedValidityTo.getTime() >= Date.now()),
    }),
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

    return updated;
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

export const renewMember = async (id, req) => {
  const member = await prisma.member.findUnique({
    where: { id: Number(id) },
  });

  if (!member) {
    const error = new Error("Member not found");
    error.status = 404;
    throw error;
  }

  const { validityTo, amount, note } = req.body;
  const validityFrom = nextValidityFrom(member.validityTo);

  return prisma.$transaction(async (tx) => {
    const renewed = await tx.member.update({
      where: { id: Number(id) },
      data: {
        validityFrom,
        validityTo: new Date(validityTo),
        isActive: true,
      },
    });

    await tx.memberRenewal.create({
      data: {
        memberId: Number(id),
        amount: amount !== undefined && amount !== "" ? amount : null,
        validityFrom,
        validityTo: new Date(validityTo),
        note: note || null,
      },
    });

    return renewed;
  });
};

// Active members whose birthday (month/day) falls within the next 7 days,
// including today — backs the admin Important Dates panel's birthday
// reminders. Only active members are considered, since an expired
// membership isn't worth reminding the admin about.
export const getUpcomingBirthdays = async () => {
  const members = await prisma.member.findMany({
    where: {
      isActive: true,
      dateOfBirth: { not: null },
    },
    select: {
      id: true,
      memberId: true,
      memberName: true,
      dateOfBirth: true,
      photo: true,
    },
  });

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return members
    .map((member) => {
      const dob = new Date(member.dateOfBirth);

      let nextBirthday = new Date(todayOnly.getFullYear(), dob.getMonth(), dob.getDate());
      if (nextBirthday < todayOnly) {
        nextBirthday = new Date(todayOnly.getFullYear() + 1, dob.getMonth(), dob.getDate());
      }

      const daysLeft = Math.round((nextBirthday - todayOnly) / (1000 * 60 * 60 * 24));

      return { ...member, nextBirthday, daysLeft };
    })
    .filter((member) => member.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);
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

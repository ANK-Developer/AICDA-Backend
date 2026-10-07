import prisma from "../config/prisma.js";
import { resolveLocationIds } from "../utils/location.js";
import { resolveRenewalPeriod, validityFromForEdit, endOfDayIST } from "../utils/validity.js";
import { parseExpiringDays, parseStatusChange, statusCounts, statusFilterWhere, withStatus } from "../utils/membership.js";
import { asSpecialDateList, buildSpecialDate, parseSpecialDates, updateSpecialDateInList } from "../utils/specialDates.js";

// Admin UIs act on the numeric primary key (like the member module does),
// but the generated "123A" partnerId is also a valid, unique lookup — so
// routes accept either without the caller needing to know which one it is.
const findPartnerRecord = (identifier, extra = {}) => {
  const isNumericId = /^\d+$/.test(String(identifier));

  return prisma.partner.findFirst({
    where: isNumericId ? { id: Number(identifier) } : { partnerId: identifier },
    ...extra,
  });
};

// ======================================================
// GENERATE PARTNER ID
// 123 → 123A
// 123 → 123B
// ...
// 123 → 123Z, 123AA, 123AB, ..., 123AZ, 123BA, ...
//
// Base-26 "spreadsheet column" sequence (1-indexed), so it keeps working
// past the 26th partner for a member instead of overflowing into
// non-letter characters.
// ======================================================

const numberToLetters = (n) => {
  let letters = "";
  let remaining = n;
  while (remaining > 0) {
    remaining -= 1;
    letters = String.fromCharCode(65 + (remaining % 26)) + letters;
    remaining = Math.floor(remaining / 26);
  }
  return letters;
};

export const generatePartnerId = async (memberId, tx = prisma) => {
  const member = await tx.member.findUnique({
    where: {
      memberId: Number(memberId),
    },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  const lastPartner = await tx.partner.findFirst({
    where: {
      memberId: member.id,
    },
    orderBy: {
      partnerNumber: "desc",
    },
  });

  const partnerNumber = lastPartner ? lastPartner.partnerNumber + 1 : 1;

  const letters = numberToLetters(partnerNumber);

  const partnerId = `${member.memberId}${letters}`;

  return {
    member,
    partnerId,
    partnerNumber,
  };
};

// ======================================================
// CREATE PARTNER
// ======================================================

// Two admins creating partners for the same member at the same instant can
// both read the same "last partner number" before either write commits.
// Retrying inside the unique-constraint catch (rather than locking) keeps
// this cheap while still guaranteeing no two partners collide on
// [memberId, partnerNumber].
const MAX_PARTNER_ID_ATTEMPTS = 5;

export const createPartner = async (data) => {
  const {
    memberId,

    partnerName,
    fatherName,
    dateOfBirth,
    specialDates,
    photo,
    residentialAddress,
    mobile,
    residentialTelephone,

    panCardNo,
    aadharNo,
    designation,

    companyName,
    companyAddress,
    companyTelephone,
    packetNo,

    state,
    district,
    city,

    dateOfJoining,

    validityFrom: requestedFrom,
    validityTo,
    amount,
    note,
  } = data;

  // Partner's own state/city if given, otherwise fall back to the Member's.
  const locationGiven = state !== undefined || city !== undefined;
  const resolvedLocation = locationGiven ? await resolveLocationIds(state, city) : null;

  // A partner created without payment has no validity yet. When the first
  // payment is entered, Valid From defaults to today and the payment date is today.
  const resolvedDateOfJoining = dateOfJoining ? new Date(dateOfJoining) : null;
  const period = validityTo
    ? resolveRenewalPeriod({
        previousValidityTo: null,
        createdAt: new Date(),
        validityFrom: requestedFrom,
        validityTo,
      })
    : null;

  let attempt = 0;

  while (true) {
    attempt += 1;

    try {
      return await prisma.$transaction(async (tx) => {
        const { member, partnerId, partnerNumber } = await generatePartnerId(memberId, tx);

        const partner = await tx.partner.create({
          data: {
            // Automatically generated
            partnerId,
            partnerNumber,

            // Relationship
            memberId: member.id,

            // Partner information
            partnerName,
            fatherName,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            specialDates: parseSpecialDates(specialDates) ?? [],
            photo,
            residentialAddress,
            mobile,
            residentialTelephone,

            panCardNo,
            aadharNo,
            designation,

            // ------------------------------------------------
            // Common fields
            //
            // If frontend sends a value → use it.
            // Otherwise → copy Member value.
            // ------------------------------------------------

            companyName: companyName ?? member.companyName,

            companyAddress: companyAddress ?? member.companyAddress,

            companyTelephone: companyTelephone ?? member.companyTelephone,

            packetNo: packetNo ?? member.packetNo,

            stateId: locationGiven ? resolvedLocation.stateId : member.stateId,

            district: district !== undefined ? district || null : member.district,

            cityId: locationGiven ? resolvedLocation.cityId : member.cityId,

            // ------------------------------------------------
            // Dates — validityFrom is always backend-derived, never
            // client-supplied (see resolvedDateOfJoining/validityFrom above).
            // ------------------------------------------------

            dateOfJoining: resolvedDateOfJoining,

            validityFrom: period?.validityFrom ?? null,

            validityTo: period?.validityTo ?? null,
          },
        });

        if (period) {
          await tx.partnerRenewal.create({
            data: {
              partnerId: partner.id,
              amount: amount !== undefined && amount !== "" ? amount : null,
              paymentDate: period.paymentDate,
              validityFrom: period.validityFrom,
              validityTo: period.validityTo,
              note: note || null,
            },
          });
        }

        return withStatus(partner);
      });
    } catch (error) {
      // P2002 = unique constraint violation (partnerId or [memberId, partnerNumber])
      const isCollision = error.code === "P2002";

      if (!isCollision || attempt >= MAX_PARTNER_ID_ATTEMPTS) {
        throw error;
      }
      // Another request grabbed the same partner number first — retry with a fresh one.
    }
  }
};

// ======================================================
// GET PARTNER BY ID
// ======================================================

export const getPartnerById = async (identifier) => {
  const [partner] = await Promise.all([
    findPartnerRecord(identifier, {
      include: {
        member: {
          select: {
            id: true,
            memberId: true,
            memberName: true,
          },
        },

        state: true,
        city: true,
        renewals: { orderBy: [{ validityTo: "desc" }, { paymentDate: "desc" }] },
      },
    }),
  ]);

  if (!partner) {
    throw new Error("Partner not found");
  }

  return withStatus(partner);
};

// ======================================================
// GET PARTNERS BY MEMBER
// ======================================================

export const getPartnersByMember = async (memberId) => {
  const member = await prisma.member.findUnique({
    where: {
      memberId: Number(memberId),
    },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  const partners = await prisma.partner.findMany({
    where: {
      memberId: member.id,
    },

    include: {
      state: true,
      city: true,
    },

    orderBy: {
      partnerNumber: "asc",
    },
  });

  return partners.map(withStatus);
};

// ======================================================
// GET ALL PARTNERS
//
// Supports:
//   search   → partnerName / partnerId / mobile / panCardNo
//   status   → "active" | "inactive"
//   stateId, cityId, memberId → filters
//   page, limit               → pagination
//   sortBy, order              → sorting
// ======================================================

const SORTABLE_PARTNER_FIELDS = ["createdAt", "updatedAt", "partnerName", "partnerId", "dateOfJoining", "validityFrom", "validityTo"];

export const getAllPartners = async (query = {}) => {
  const { search, status, stateId, cityId, memberId, page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = query;

  const where = {};

  if (search) {
    const term = search.trim();
    const isNumeric = /^\d+$/.test(term);

    where.OR = [
      { partnerName: { contains: term } },
      { partnerId: { contains: term } },
      { mobile: { contains: term } },
      { panCardNo: { contains: term } },
      { companyName: { contains: term } },
      { designation: { contains: term } },
      { member: { memberName: { contains: term } } },
      ...(isNumeric ? [{ member: { memberId: Number(term) } }] : []),
    ];
  }

  // status: active | inactive | blocked | expired | pending | expiring (see
  // utils/membership.js). Worked out here, never in the browser.
  const expiringDays = parseExpiringDays(query.expiringDays);
  const statusWhere = statusFilterWhere(status, expiringDays);
  if (statusWhere) where.AND = [...(where.AND || []), statusWhere];

  if (stateId) where.stateId = Number(stateId);
  if (cityId) where.cityId = Number(cityId);

  if (memberId) {
    const member = await prisma.member.findUnique({
      where: { memberId: Number(memberId) },
      select: { id: true },
    });
    // No such member → force an empty result instead of ignoring the filter.
    where.memberId = member ? member.id : -1;
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const sortField = SORTABLE_PARTNER_FIELDS.includes(sortBy) ? sortBy : "createdAt";
  const sortOrder = order === "asc" ? "asc" : "desc";

  const [partners, total, stats] = await Promise.all([
      prisma.partner.findMany({
        where,

        include: {
          member: {
            select: {
              id: true,
              memberId: true,
              memberName: true,
            },
          },

          state: true,
          city: true,
        },

        orderBy: {
          [sortField]: sortOrder,
        },

        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      }),

      prisma.partner.count({ where }),
      statusCounts(prisma.partner, expiringDays),
  ]);

  return {
    partners: partners.map(withStatus),
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
    stats,
  };
};

// ======================================================
// GET PUBLIC PARTNERS
// GET /api/v1/partners/public
//
// Public-safe field selection only — no panCardNo / aadharNo, which
// `include` used to leak here (unlike getPublicMembers's `select`).
// ======================================================

const PUBLIC_PARTNER_SELECT = {
  id: true,
  partnerId: true,
  partnerName: true,
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
  member: {
    select: {
      id: true,
      memberId: true,
      memberName: true,
    },
  },
  state: { select: { stateName: true } },
  city: { select: { cityName: true } },
};

const withPublicPartnerLocation = (partner) => ({
  ...withStatus(partner),
  state: partner.state?.stateName ?? null,
  city: partner.city?.cityName ?? null,
});

export const getPublicPartners = async () => {
  const partners = await prisma.partner.findMany({
    select: PUBLIC_PARTNER_SELECT,
    orderBy: {
      createdAt: "desc",
    },
  });

  return partners.map(withPublicPartnerLocation);
};

// ======================================================
// GET PUBLIC PARTNER BY ID
// GET /api/v1/partners/public/:id
// ======================================================

export const getPublicPartnerById = async (identifier) => {
  const isNumericId = /^\d+$/.test(String(identifier));

  const partner = await prisma.partner.findFirst({
    where: isNumericId ? { id: Number(identifier) } : { partnerId: identifier },
    select: PUBLIC_PARTNER_SELECT,
  });

  if (!partner) return null;

  return withPublicPartnerLocation(partner);
};

// ======================================================
// UPDATE PARTNER
// ======================================================

export const updatePartner = async (identifier, data) => {
  // -----------------------------------------------
  // Check Partner exists
  // -----------------------------------------------

  const existingPartner = await findPartnerRecord(identifier);

  if (!existingPartner) {
    throw new Error("Partner not found");
  }

  // -----------------------------------------------
  // Allowed fields
  // -----------------------------------------------

  const {
    partnerName,
    fatherName,
    dateOfBirth,
    specialDates,
    photo,
    residentialAddress,
    mobile,
    residentialTelephone,

    panCardNo,
    aadharNo,
    designation,

    companyName,
    companyAddress,
    companyTelephone,
    packetNo,

    state,
    district,
    city,

    dateOfJoining,

    validityTo,
    amount,
    note,
  } = data;

  // Only re-resolve state/city if the client actually sent one of them.
  const locationGiven = state !== undefined || city !== undefined;
  const { stateId, cityId } = locationGiven ? await resolveLocationIds(state, city) : { stateId: undefined, cityId: undefined };

  // validityFrom is never client-supplied — if validityTo is being changed
  // here (rather than through the dedicated renew endpoint), derive it the
  // same way renew does: the creation day for a first payment, the previous
  // expiry for an extension.
  const resolvedDateOfJoining = dateOfJoining !== undefined ? (dateOfJoining ? new Date(dateOfJoining) : null) : undefined;

  const resolvedValidityTo = validityTo !== undefined ? (validityTo ? endOfDayIST(validityTo) : null) : undefined;
  const resolvedValidityFrom = resolvedValidityTo === undefined ? undefined : resolvedValidityTo === null ? null : validityFromForEdit(existingPartner, resolvedValidityTo);

  // Editing the partner (rather than using the dedicated /renew endpoint)
  // can also change validityTo or record an amount paid. Log a
  // PartnerRenewal the same way create/renew do, but only when something
  // renewal-worthy actually happened, so routine field edits don't spam
  // the payment history with no-op entries.
  const validityActuallyChanged = resolvedValidityTo && (!existingPartner.validityTo || resolvedValidityTo.getTime() !== new Date(existingPartner.validityTo).getTime());
  const amountProvided = amount !== undefined && amount !== "";
  const renewalValidityFrom = resolvedValidityFrom ?? existingPartner.validityFrom;
  const renewalValidityTo = resolvedValidityTo ?? existingPartner.validityTo;
  const shouldLogRenewal = (validityActuallyChanged || amountProvided) && renewalValidityFrom && renewalValidityTo;

  // -----------------------------------------------
  // Update Partner
  // -----------------------------------------------

  const updatedPartner = await prisma.$transaction(async (tx) => {
    const partner = await tx.partner.update({
      where: {
        id: existingPartner.id,
      },

      data: {
        partnerName,
        fatherName,
        dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : undefined,
        specialDates: parseSpecialDates(specialDates),
        photo,
        residentialAddress,
        mobile,
        residentialTelephone,

        panCardNo,
        aadharNo,
        designation,

        // These can be edited independently
        companyName,
        companyAddress,
        companyTelephone,
        packetNo,

        stateId,
        district,
        cityId,

        dateOfJoining: resolvedDateOfJoining,

        validityFrom: resolvedValidityFrom,

        validityTo: resolvedValidityTo,
      },

      include: {
        member: {
          select: {
            memberId: true,
            memberName: true,
          },
        },

        state: true,
        city: true,
      },
    });

    if (shouldLogRenewal) {
      await tx.partnerRenewal.create({
        data: {
          partnerId: existingPartner.id,
          amount: amountProvided ? amount : null,
          validityFrom: renewalValidityFrom,
          validityTo: renewalValidityTo,
          note: note || null,
        },
      });
    }

    return partner;
  });

  return withStatus(updatedPartner);
};

// ======================================================
// RENEW PARTNER
// ======================================================

export const renewPartner = async (identifier, data) => {
  const existingPartner = await findPartnerRecord(identifier);

  if (!existingPartner) {
    throw new Error("Partner not found");
  }

  const { validityFrom: requestedFrom, validityTo, amount, note } = data;

  // Valid From and Payment Date are optional — see resolveRenewalPeriod for the
  // defaults and the rules that keep the periods in order.
  const period = resolveRenewalPeriod({
    previousValidityTo: existingPartner.validityTo,
    createdAt: existingPartner.createdAt,
    validityFrom: requestedFrom,
    validityTo,
  });

  return prisma.$transaction(async (tx) => {
    const renewed = await tx.partner.update({
      where: {
        id: existingPartner.id,
      },

      data: {
        validityFrom: period.validityFrom,
        validityTo: period.validityTo,
      },

      include: {
        member: {
          select: {
            id: true,
            memberId: true,
            memberName: true,
          },
        },

        state: true,
        city: true,
      },
    });

    await tx.partnerRenewal.create({
      data: {
        partnerId: existingPartner.id,
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

// ======================================================
// SET PARTNER STATUS (manual, by an admin)
//
// Deactivating needs a reason; the reason, the admin and the time are stored.
// Renewing or editing never touches this.
// ======================================================

export const setPartnerStatus = async (identifier, body, admin) => {
  const change = parseStatusChange(body, admin);

  const partner = await findPartnerRecord(identifier);

  if (!partner) {
    throw new Error("Partner not found");
  }

  const updated = await prisma.partner.update({
    where: { id: partner.id },
    data: change,
    include: {
      member: {
        select: {
          id: true,
          memberId: true,
          memberName: true,
        },
      },

      state: true,
      city: true,
    },
  });

  return withStatus(updated);
};

// ======================================================
// DELETE PARTNER
// ======================================================

export const deletePartner = async (identifier) => {
  const existingPartner = await findPartnerRecord(identifier);

  if (!existingPartner) {
    throw new Error("Partner not found");
  }

  await prisma.partner.delete({
    where: {
      id: existingPartner.id,
    },
  });
};

// ======================================================
// SPECIAL DATES
// ======================================================

const findPartnerSpecialDates = async (identifier) => {
  const partner = await findPartnerRecord(identifier, { select: { id: true, specialDates: true } });

  if (!partner) {
    throw new Error("Partner not found");
  }

  return { id: partner.id, specialDates: asSpecialDateList(partner.specialDates) };
};

export const addPartnerSpecialDate = async (identifier, body) => {
  const { id, specialDates } = await findPartnerSpecialDates(identifier);

  return prisma.partner.update({
    where: { id },
    data: { specialDates: [...specialDates, buildSpecialDate(body)] },
    select: { specialDates: true },
  });
};

export const deletePartnerSpecialDate = async (identifier, dateId) => {
  const { id, specialDates } = await findPartnerSpecialDates(identifier);
  const remaining = specialDates.filter((entry) => entry.id !== dateId);

  if (remaining.length === specialDates.length) {
    throw new Error("Special date not found");
  }

  return prisma.partner.update({
    where: { id },
    data: { specialDates: remaining },
    select: { specialDates: true },
  });
};

export const updatePartnerSpecialDate = async (identifier, dateId, body) => {
  const { id, specialDates } = await findPartnerSpecialDates(identifier);
  const updated = updateSpecialDateInList(specialDates, dateId, body);

  if (!updated) {
    throw new Error("Special date not found");
  }

  return prisma.partner.update({
    where: { id },
    data: { specialDates: updated },
    select: { specialDates: true },
  });
};

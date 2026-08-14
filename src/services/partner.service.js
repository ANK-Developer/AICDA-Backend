import prisma from "../config/prisma.js";
import { uploadBufferToCloudinary } from "../config/cloudinary.js";
import { resolveLocationIds } from "../utils/location.js";
import { nextValidityFrom } from "../utils/validity.js";

export const uploadPartnerPhoto = async (file) => {
  if (!file) return null;
  const uploaded = await uploadBufferToCloudinary(file.buffer, {
    folder: "aicda/partners",
    resource_type: "image",
  });
  return uploaded.secure_url;
};


// Admin UIs act on the numeric primary key (like the member module does),
// but the generated "123A" partnerId is also a valid, unique lookup — so
// routes accept either without the caller needing to know which one it is.
const findPartnerRecord = (identifier, extra = {}) => {
  const isNumericId = /^\d+$/.test(String(identifier));

  return prisma.partner.findFirst({
    where: isNumericId
      ? { id: Number(identifier) }
      : { partnerId: identifier },
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

  const partnerNumber = lastPartner
    ? lastPartner.partnerNumber + 1
    : 1;

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
    city,

    dateOfJoining,

    validityTo,
    amount,
    note,
  } = data;

  // Partner's own state/city if given, otherwise fall back to the Member's.
  const locationGiven = state !== undefined || city !== undefined;
  const resolvedLocation = locationGiven
    ? await resolveLocationIds(state, city)
    : null;

  // Validity always starts from the joining date (or today, if none given)
  // — never trusted from the client. Only the expiry (validityTo) is
  // admin-entered, when they record the offline payment.
  const resolvedDateOfJoining = dateOfJoining ? new Date(dateOfJoining) : null;
  const validityFrom = resolvedDateOfJoining || new Date();

  let attempt = 0;

  while (true) {
    attempt += 1;

    try {
      return await prisma.$transaction(async (tx) => {
        const {
          member,
          partnerId,
          partnerNumber,
        } = await generatePartnerId(memberId, tx);

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

            companyName:
              companyName ?? member.companyName,

            companyAddress:
              companyAddress ?? member.companyAddress,

            companyTelephone:
              companyTelephone ??
              member.companyTelephone,

            packetNo:
              packetNo ?? member.packetNo,

            stateId: locationGiven
              ? resolvedLocation.stateId
              : member.stateId,

            cityId: locationGiven
              ? resolvedLocation.cityId
              : member.cityId,

            // ------------------------------------------------
            // Dates — validityFrom is always backend-derived, never
            // client-supplied (see resolvedDateOfJoining/validityFrom above).
            // ------------------------------------------------

            dateOfJoining: resolvedDateOfJoining,

            validityFrom: validityTo ? validityFrom : null,

            validityTo: validityTo
              ? new Date(validityTo)
              : null,

            // Backend controls this
            isActive: true,
          },
        });

        if (validityTo) {
          await tx.partnerRenewal.create({
            data: {
              partnerId: partner.id,
              amount: amount !== undefined && amount !== "" ? amount : null,
              validityFrom,
              validityTo: new Date(validityTo),
              note: note || null,
            },
          });
        }

        return partner;
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
  const [, partner] = await Promise.all([
    syncPartnerActiveStatus(),
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
        renewals: { orderBy: { paymentDate: "desc" } },
      },
    }),
  ]);


  if (!partner) {
    throw new Error("Partner not found");
  }


  return partner;
};


// ======================================================
// GET PARTNERS BY MEMBER
// ======================================================

export const getPartnersByMember = async (memberId) => {
  const [, member] = await Promise.all([
    syncPartnerActiveStatus(),
    prisma.member.findUnique({
      where: {
        memberId: Number(memberId),
      },
    }),
  ]);

  if (!member) {
    throw new Error("Member not found");
  }

  return prisma.partner.findMany({
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

const SORTABLE_PARTNER_FIELDS = [
  "createdAt",
  "updatedAt",
  "partnerName",
  "partnerId",
  "dateOfJoining",
  "validityFrom",
  "validityTo",
];

export const getAllPartners = async (query = {}) => {
  const syncPromise = syncPartnerActiveStatus();

  const {
    search,
    status,
    stateId,
    cityId,
    memberId,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    order = "desc",
  } = query;

  const where = {};

  if (search) {
    where.OR = [
      { partnerName: { contains: search } },
      { partnerId: { contains: search } },
      { mobile: { contains: search } },
      { panCardNo: { contains: search } },
    ];
  }

  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;

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

  const sortField = SORTABLE_PARTNER_FIELDS.includes(sortBy)
    ? sortBy
    : "createdAt";
  const sortOrder = order === "asc" ? "asc" : "desc";

  const [, [partners, total]] = await Promise.all([
    syncPromise,
    prisma.$transaction([
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
    ]),
  ]);

  return {
    partners,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    },
  };
};


// ======================================================
// AUTOMATIC ACTIVE / INACTIVE SWEEP
//
// Validity isn't watched by a scheduler, so this runs before every
// read and keeps isActive self-healing without a cron job.
// ======================================================

// Only ever turns an expired/not-yet-started partner off; it never turns
// one back on. Reactivating on every sweep would silently revert a manual
// deactivation (togglePartnerStatus) the next time the list is loaded,
// as long as the validity window was still current. Reactivation happens
// explicitly instead, via renew or by updatePartnerActiveStatus when
// validityTo is actually edited.
export const syncPartnerActiveStatus = async () => {
  const now = new Date();

  await prisma.partner.updateMany({
    where: {
      isActive: true,
      OR: [
        { validityFrom: null },
        { validityTo: null },
        { validityFrom: { gt: now } },
        { validityTo: { lt: now } },
      ],
    },
    data: { isActive: false },
  });
};


// ======================================================
// GET PARTNER STATUS
//
// Active when:
// validityFrom <= today <= validityTo
//
// Otherwise:
// Inactive
// ======================================================

export const getPartnerStatus = (
  validityFrom,
  validityTo
) => {

  if (!validityFrom || !validityTo) {
    return "inactive";
  }


  const now = new Date();

  const from = new Date(validityFrom);
  const to = new Date(validityTo);


  if (now >= from && now <= to) {
    return "active";
  }


  return "inactive";
};


// ======================================================
// UPDATE PARTNER
// ======================================================

export const updatePartner = async (
  identifier,
  data
) => {

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
    city,

    dateOfJoining,

    validityTo,
    amount,
    note,
  } = data;

  // Only re-resolve state/city if the client actually sent one of them.
  const locationGiven = state !== undefined || city !== undefined;
  const { stateId, cityId } = locationGiven
    ? await resolveLocationIds(state, city)
    : { stateId: undefined, cityId: undefined };

  // validityFrom is never client-supplied — if validityTo is being changed
  // here (rather than through the dedicated renew endpoint), re-derive it
  // from the joining date the same way create does.
  const resolvedDateOfJoining =
    dateOfJoining !== undefined
      ? dateOfJoining
        ? new Date(dateOfJoining)
        : null
      : undefined;
  const effectiveDateOfJoining =
    resolvedDateOfJoining !== undefined ? resolvedDateOfJoining : existingPartner.dateOfJoining;

  const resolvedValidityFrom =
    validityTo !== undefined
      ? validityTo
        ? effectiveDateOfJoining || new Date()
        : null
      : undefined;
  const resolvedValidityTo =
    validityTo !== undefined ? (validityTo ? new Date(validityTo) : null) : undefined;

  // Whether this edit actually moves validityTo (vs. resaving the form with
  // the same date, or not touching it at all) — recomputing isActive below
  // is guarded by this so a manual togglePartnerStatus deactivation can't
  // get silently undone by an unrelated field edit.
  const validityToChanged =
    validityTo !== undefined &&
    (existingPartner.validityTo ? existingPartner.validityTo.getTime() : null) !==
      (resolvedValidityTo ? resolvedValidityTo.getTime() : null);

  // Editing the partner (rather than using the dedicated /renew endpoint)
  // can also change validityTo or record an amount paid. Log a
  // PartnerRenewal the same way create/renew do, but only when something
  // renewal-worthy actually happened, so routine field edits don't spam
  // the payment history with no-op entries.
  const validityActuallyChanged =
    resolvedValidityTo &&
    (!existingPartner.validityTo ||
      resolvedValidityTo.getTime() !== new Date(existingPartner.validityTo).getTime());
  const amountProvided = amount !== undefined && amount !== "";
  const renewalValidityFrom = resolvedValidityFrom ?? existingPartner.validityFrom;
  const renewalValidityTo = resolvedValidityTo ?? existingPartner.validityTo;
  const shouldLogRenewal =
    (validityActuallyChanged || amountProvided) && renewalValidityFrom && renewalValidityTo;

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


  // Validity changed — recompute isActive immediately rather than waiting
  // for the next sweep so the response reflects the true status.
  if (validityToChanged) {
    const recalculated = await updatePartnerActiveStatus(updatedPartner);
    updatedPartner.isActive = recalculated.isActive;
  }


  return updatedPartner;
};


// ======================================================
// RENEW PARTNER
// ======================================================

export const renewPartner = async (identifier, data) => {
  const existingPartner = await findPartnerRecord(identifier);

  if (!existingPartner) {
    throw new Error("Partner not found");
  }

  const { validityTo, amount, note } = data;
  const validityFrom = nextValidityFrom(existingPartner.validityTo);

  return prisma.$transaction(async (tx) => {
    const renewed = await tx.partner.update({
      where: {
        id: existingPartner.id,
      },

      data: {
        validityFrom,
        validityTo: new Date(validityTo),
        isActive: true,
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
        validityFrom,
        validityTo: new Date(validityTo),
        note: note || null,
      },
    });

    return renewed;
  });
};


// ======================================================
// TOGGLE PARTNER STATUS (manual override)
// ======================================================

export const togglePartnerStatus = async (identifier) => {
  const partner = await findPartnerRecord(identifier);

  if (!partner) {
    throw new Error("Partner not found");
  }

  return prisma.partner.update({
    where: { id: partner.id },
    data: { isActive: !partner.isActive },
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
};


// ======================================================
// UPDATE PARTNER ACTIVE STATUS
// ======================================================
//
// Backend calculates status from validity, except for the manual
// override above — Frontend should not send isActive on create/update.
// ======================================================

export const updatePartnerActiveStatus = async (
  partner
) => {

  const status = getPartnerStatus(
    partner.validityFrom,
    partner.validityTo
  );


  const isActive = status === "active";


  // Only update DB if necessary
  if (partner.isActive !== isActive) {

    return await prisma.partner.update({
      where: {
        id: partner.id,
      },

      data: {
        isActive,
      },
    });

  }


  return partner;
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
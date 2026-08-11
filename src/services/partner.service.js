import prisma from "../config/prisma.js";


// ======================================================
// GENERATE PARTNER ID
// 123 → 123A
// 123 → 123B
// 123 → 123C
// ======================================================

export const generatePartnerId = async (memberId) => {
  const member = await prisma.member.findUnique({
    where: {
      memberId: Number(memberId),
    },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  const lastPartner = await prisma.partner.findFirst({
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

  const letter = String.fromCharCode(64 + partnerNumber);

  const partnerId = `${member.memberId}${letter}`;

  return {
    member,
    partnerId,
    partnerNumber,
  };
};


// ======================================================
// CREATE PARTNER
// ======================================================

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

    stateId,
    cityId,

    dateOfJoining,

    validityFrom,
    validityTo,
  } = data;


  // ----------------------------------------------------
  // Find Member + Generate Partner ID
  // ----------------------------------------------------

  const {
    member,
    partnerId,
    partnerNumber,
  } = await generatePartnerId(memberId);


  // ----------------------------------------------------
  // Create Partner
  // ----------------------------------------------------

  const partner = await prisma.partner.create({
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

      stateId:
        stateId ?? member.stateId,

      cityId:
        cityId ?? member.cityId,

      // ------------------------------------------------
      // Dates
      // ------------------------------------------------

      dateOfJoining: dateOfJoining
        ? new Date(dateOfJoining)
        : null,

      validityFrom: validityFrom
        ? new Date(validityFrom)
        : null,

      validityTo: validityTo
        ? new Date(validityTo)
        : null,

      // Backend controls this
      isActive: true,
    },
  });


  return partner;
};


// ======================================================
// GET PARTNER BY ID
// ======================================================

export const getPartnerById = async (partnerId) => {
  const partner = await prisma.partner.findUnique({
    where: {
      partnerId,
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


  if (!partner) {
    throw new Error("Partner not found");
  }


  return partner;
};


// ======================================================
// GET ALL PARTNERS
// ======================================================

export const getAllPartners = async () => {
  const partners = await prisma.partner.findMany({
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
      createdAt: "desc",
    },
  });


  return partners;
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
  partnerId,
  data
) => {

  // -----------------------------------------------
  // Check Partner exists
  // -----------------------------------------------

  const existingPartner =
    await prisma.partner.findUnique({
      where: {
        partnerId,
      },
    });


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

    stateId,
    cityId,

    dateOfJoining,

    validityFrom,
    validityTo,
  } = data;


  // -----------------------------------------------
  // Update Partner
  // -----------------------------------------------

  const updatedPartner =
    await prisma.partner.update({

      where: {
        partnerId,
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

        dateOfJoining:
          dateOfJoining !== undefined
            ? dateOfJoining
              ? new Date(dateOfJoining)
              : null
            : undefined,

        validityFrom:
          validityFrom !== undefined
            ? validityFrom
              ? new Date(validityFrom)
              : null
            : undefined,

        validityTo:
          validityTo !== undefined
            ? validityTo
              ? new Date(validityTo)
              : null
            : undefined,
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


  return updatedPartner;
};


// ======================================================
// UPDATE PARTNER ACTIVE STATUS
// ======================================================
//
// Backend calculates status from validity.
// Frontend should NOT send isActive.
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
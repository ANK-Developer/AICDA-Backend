import prisma from "../config/prisma.js";

import {
  createPartner as createPartnerService,
} from "../services/partner.service.js";


// ======================================================
// CREATE PARTNER
// POST /api/v1/partners
// ======================================================

export const createPartner = async (req, res) => {
  try {
    const partner = await createPartnerService(req.body);

    return res.status(201).json({
      success: true,
      message: "Partner created successfully",
      data: partner,
    });

  } catch (error) {
    console.error("Create Partner Error:", error);

    if (error.message === "Member not found") {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create partner",
      error: error.message,
    });
  }
};


// ======================================================
// GET PARTNER BY ID
// GET /api/v1/partners/:partnerId
// ======================================================

export const getPartnerById = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const partner = await prisma.partner.findUnique({
      where: {
        partnerId: partnerId,
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
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Partner fetched successfully",
      data: partner,
    });

  } catch (error) {
    console.error("Get Partner Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch partner",
      error: error.message,
    });
  }
};


// ======================================================
// GET ALL PARTNERS
// GET /api/v1/partners
// ======================================================

export const getAllPartners = async (req, res) => {
  try {
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

    return res.status(200).json({
      success: true,
      count: partners.length,
      data: partners,
    });

  } catch (error) {
    console.error("Get All Partners Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch partners",
      error: error.message,
    });
  }
};
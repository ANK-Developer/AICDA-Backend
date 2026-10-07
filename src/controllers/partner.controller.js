import * as partnerService from "../services/partner.service.js";

// Local disk upload (multer diskStorage under src/uploads) — same approach
// as member.service.js's getLocalPhotoPath, so partner photos are served
// the same way member photos are instead of going through Cloudinary.
const getLocalPhotoPath = (file) => {
  if (!file) return null;

  return `/uploads/${file.filename}`;
};

// ======================================================
// CREATE PARTNER
// POST /api/v1/partners
// ======================================================

export const createPartner = async (req, res, next) => {
  try {
    const photo = req.file ? getLocalPhotoPath(req.file) : null;

    const partner = await partnerService.createPartner({
      ...req.body,
      photo,
    });

    return res.status(201).json({
      success: true,
      message: "Partner created successfully",
      data: partner,
    });
  } catch (error) {
    if (error.message === "Member not found") {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    next(error);
  }
};

// ======================================================
// GET PARTNER BY ID
// GET /api/v1/partners/:partnerId
// ======================================================

export const getPartnerById = async (req, res, next) => {
  try {
    const { partnerId } = req.params;

    const partner = await partnerService.getPartnerById(partnerId);

    return res.status(200).json({
      success: true,
      message: "Partner fetched successfully",
      data: partner,
    });
  } catch (error) {
    if (error.message === "Partner not found") {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    next(error);
  }
};

// ======================================================
// GET ALL PARTNERS
// GET /api/v1/partners
//
// Query: search, status, state, district, city, memberId,
//        page, limit, sortBy, order
// ======================================================

export const getAllPartners = async (req, res, next) => {
  try {
    const { partners, pagination, stats } = await partnerService.getAllPartners(req.query);

    return res.status(200).json({
      success: true,
      count: partners.length,
      pagination,
      stats,
      data: partners,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET PUBLIC PARTNERS
// GET /api/v1/partners/public
// ======================================================

export const getPublicPartners = async (req, res, next) => {
  try {
    const partners = await partnerService.getPublicPartners();

    return res.status(200).json({
      success: true,
      message: "Public partners fetched successfully",
      count: partners.length,
      data: partners,
    });
  } catch (error) {
    console.error("getPublicPartners error:", error);
    next(error);
  }
};
// ======================================================
// GET PUBLIC PARTNER BY ID
// GET /api/v1/partners/public/:id
// ======================================================

export const getPublicPartnerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const partner = await partnerService.getPublicPartnerById(id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: partner,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET PARTNERS BY MEMBER
// GET /api/v1/partners/member/:memberId
// ======================================================

export const getPartnersByMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    const partners = await partnerService.getPartnersByMember(memberId);

    return res.status(200).json({
      success: true,
      count: partners.length,
      data: partners,
    });
  } catch (error) {
    if (error.message === "Member not found") {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    next(error);
  }
};

// ======================================================
// UPDATE PARTNER
// PATCH /api/v1/partners/:partnerId
// ======================================================

export const updatePartner = async (req, res, next) => {
  try {
    const { partnerId } = req.params;

    const photo = req.file ? getLocalPhotoPath(req.file) : undefined;

    const partner = await partnerService.updatePartner(partnerId, {
      ...req.body,
      ...(photo !== undefined && { photo }),
    });

    return res.status(200).json({
      success: true,
      message: "Partner updated successfully",
      data: partner,
    });
  } catch (error) {
    if (error.message === "Partner not found") {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    next(error);
  }
};

// ======================================================
// TOGGLE PARTNER STATUS
// PATCH /api/v1/partners/:partnerId/status
// ======================================================

export const togglePartnerStatus = async (req, res, next) => {
  try {
    const { partnerId } = req.params;

    const partner = await partnerService.setPartnerStatus(partnerId, req.body, req.admin);

    return res.status(200).json({
      success: true,
      message: partner.status.status === "ACTIVE" ? "Partner activated successfully" : "Partner deactivated successfully",
      data: partner,
    });
  } catch (error) {
    if (error.message === "Partner not found") {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    next(error);
  }
};

// ======================================================
// RENEW PARTNER
// PATCH /api/v1/partners/:partnerId/renew
// ======================================================

export const renewPartner = async (req, res, next) => {
  try {
    const { partnerId } = req.params;

    const partner = await partnerService.renewPartner(partnerId, req.body);

    return res.status(200).json({
      success: true,
      message: "Partner renewed successfully",
      data: partner,
    });
  } catch (error) {
    if (error.message === "Partner not found") {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    next(error);
  }
};

// ======================================================
// DELETE PARTNER
// DELETE /api/v1/partners/:partnerId
// ======================================================

export const deletePartner = async (req, res, next) => {
  try {
    const { partnerId } = req.params;

    await partnerService.deletePartner(partnerId);

    return res.status(200).json({
      success: true,
      message: "Partner deleted successfully",
    });
  } catch (error) {
    if (error.message === "Partner not found") {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    next(error);
  }
};

// ======================================================
// SPECIAL DATES
// POST   /api/v1/partners/:partnerId/special-dates
// DELETE /api/v1/partners/:partnerId/special-dates/:dateId
// ======================================================

const NOT_FOUND_MESSAGES = ["Partner not found", "Special date not found"];

export const addPartnerSpecialDate = async (req, res, next) => {
  try {
    const result = await partnerService.addPartnerSpecialDate(req.params.partnerId, req.body);

    return res.status(201).json({
      success: true,
      message: "Special date added successfully",
      data: result.specialDates,
    });
  } catch (error) {
    if (NOT_FOUND_MESSAGES.includes(error.message)) {
      return res.status(404).json({ success: false, message: error.message });
    }

    next(error);
  }
};

export const deletePartnerSpecialDate = async (req, res, next) => {
  try {
    const { partnerId, dateId } = req.params;
    const result = await partnerService.deletePartnerSpecialDate(partnerId, dateId);

    return res.status(200).json({
      success: true,
      message: "Special date deleted successfully",
      data: result.specialDates,
    });
  } catch (error) {
    if (NOT_FOUND_MESSAGES.includes(error.message)) {
      return res.status(404).json({ success: false, message: error.message });
    }

    next(error);
  }
};

export const updatePartnerSpecialDate = async (req, res, next) => {
  try {
    const { partnerId, dateId } = req.params;
    const result = await partnerService.updatePartnerSpecialDate(partnerId, dateId, req.body);

    return res.status(200).json({
      success: true,
      message: "Special date updated successfully",
      data: result.specialDates,
    });
  } catch (error) {
    if (NOT_FOUND_MESSAGES.includes(error.message)) {
      return res.status(404).json({ success: false, message: error.message });
    }

    next(error);
  }
};

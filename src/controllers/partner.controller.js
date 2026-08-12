import * as partnerService from "../services/partner.service.js";


// ======================================================
// CREATE PARTNER
// POST /api/v1/partners
// ======================================================

export const createPartner = async (req, res, next) => {
  try {
    const photo = req.file
      ? await partnerService.uploadPartnerPhoto(req.file)
      : null;

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
// Query: search, status, stateId, cityId, memberId,
//        page, limit, sortBy, order
// ======================================================

export const getAllPartners = async (req, res, next) => {
  try {
    const { partners, pagination } = await partnerService.getAllPartners(
      req.query
    );

    return res.status(200).json({
      success: true,
      count: partners.length,
      pagination,
      data: partners,
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

    const photo = req.file
      ? await partnerService.uploadPartnerPhoto(req.file)
      : undefined;

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

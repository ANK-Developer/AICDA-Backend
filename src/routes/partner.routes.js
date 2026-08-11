import express from "express";

import {
  createPartner,
  getAllPartners,
  getPartnerById,
  updatePartner,
} from "../controllers/partner.controller.js";

import {
  createPartnerSchema,
} from "../validation/partner.validation.js";

import {
  validate,
} from "../middleware/validate.middleware.js";

const router = express.Router();


// ======================================================
// CREATE PARTNER
// POST /api/v1/partners
// ======================================================

router.post(
  "/",
  validate(createPartnerSchema),
  createPartner
);


// ======================================================
// GET ALL PARTNERS
// GET /api/v1/partners
// ======================================================

router.get(
  "/",
  getAllPartners
);


// ======================================================
// GET SINGLE PARTNER
// GET /api/v1/partners/:partnerId
// ======================================================

router.get(
  "/:partnerId",
  getPartnerById
);


// ======================================================
// UPDATE PARTNER
// PATCH /api/v1/partners/:partnerId
// ======================================================

router.patch(
  "/:partnerId",
  updatePartner
);


export default router;
import express from "express";

import {
  createPartner,
  deletePartner,
  getAllPartners,
  getPartnerById,
  getPartnersByMember,
  renewPartner,
  togglePartnerStatus,
  updatePartner,
} from "../controllers/partner.controller.js";

import {
  createPartnerSchema,
  renewPartnerSchema,
  updatePartnerSchema,
} from "../validation/partner.validation.js";

import { validate } from "../middlewares/validate.js";
import upload from "../middlewares/upload.middleware.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/superAdmin.middlewares.js";

const router = express.Router();


// ======================================================
// CREATE PARTNER
// POST /api/v1/partners
// ======================================================

router.post(
  "/",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN"),
  upload.single("photo"),
  validate(createPartnerSchema),
  createPartner
);


// ======================================================
// GET ALL PARTNERS
// GET /api/v1/partners
// ======================================================

router.get(
  "/",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN"),
  getAllPartners
);


// ======================================================
// GET PARTNERS BY MEMBER
// GET /api/v1/partners/member/:memberId
//
// Registered before "/:partnerId" so "member" isn't
// swallowed as a partner ID.
// ======================================================

router.get(
  "/member/:memberId",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN"),
  getPartnersByMember
);


// ======================================================
// GET SINGLE PARTNER
// GET /api/v1/partners/:partnerId
// ======================================================

router.get(
  "/:partnerId",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN"),
  getPartnerById
);


// ======================================================
// UPDATE PARTNER
// PATCH /api/v1/partners/:partnerId
// ======================================================

router.patch(
  "/:partnerId",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN"),
  upload.single("photo"),
  validate(updatePartnerSchema),
  updatePartner
);


// ======================================================
// TOGGLE PARTNER STATUS
// PATCH /api/v1/partners/:partnerId/status
// ======================================================

router.patch(
  "/:partnerId/status",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN"),
  togglePartnerStatus
);


// ======================================================
// RENEW PARTNER
// PATCH /api/v1/partners/:partnerId/renew
// ======================================================

router.patch(
  "/:partnerId/renew",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN"),
  validate(renewPartnerSchema),
  renewPartner
);


// ======================================================
// DELETE PARTNER
// DELETE /api/v1/partners/:partnerId
// ======================================================

router.delete(
  "/:partnerId",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN"),
  deletePartner
);


export default router;

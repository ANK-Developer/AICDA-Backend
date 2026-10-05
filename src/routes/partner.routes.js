import express from "express";

import { addPartnerSpecialDate, createPartner, deletePartner, deletePartnerSpecialDate, getAllPartners, getPartnerById, getPartnersByMember, getPublicPartnerById, getPublicPartners, renewPartner, togglePartnerStatus, updatePartner, updatePartnerSpecialDate } from "../controllers/partner.controller.js";

import { createPartnerSchema, renewPartnerSchema, updatePartnerSchema } from "../validation/partner.validation.js";

import { validate } from "../middlewares/validate.js";
import { specialDateSchema } from "../validation/specialDate.validation.js";
import { uploadGalleryMedia } from "../middlewares/upload.middleware.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/superAdmin.middlewares.js";

const router = express.Router();

// ======================================================
// CREATE PARTNER
// POST /api/v1/partners
// ======================================================

router.post("/", isAuthenticated, authorizeRoles("SUPER_ADMIN"), uploadGalleryMedia.single("photo"), validate(createPartnerSchema), createPartner);

// ======================================================
// GET ALL PARTNERS
// GET /api/v1/partners
// ======================================================

router.get("/", isAuthenticated, authorizeRoles("SUPER_ADMIN"), getAllPartners);

router.get("/public", getPublicPartners);

router.get("/public/:id", getPublicPartnerById);

// ======================================================
// GET PARTNERS BY MEMBER
// GET /api/v1/partners/member/:memberId
//
// Registered before "/:partnerId" so "member" isn't
// swallowed as a partner ID.
// ======================================================

router.get("/member/:memberId", isAuthenticated, authorizeRoles("SUPER_ADMIN"), getPartnersByMember);

// ======================================================
// GET SINGLE PARTNER
// GET /api/v1/partners/:partnerId
// ======================================================

router.get("/:partnerId", isAuthenticated, authorizeRoles("SUPER_ADMIN"), getPartnerById);

// ======================================================
// UPDATE PARTNER
// PATCH /api/v1/partners/:partnerId
// ======================================================

router.patch("/:partnerId", isAuthenticated, authorizeRoles("SUPER_ADMIN"), uploadGalleryMedia.single("photo"), validate(updatePartnerSchema), updatePartner);

// ======================================================
// TOGGLE PARTNER STATUS
// PATCH /api/v1/partners/:partnerId/status
// ======================================================

router.patch("/:partnerId/status", isAuthenticated, authorizeRoles("SUPER_ADMIN"), togglePartnerStatus);

// ======================================================
// RENEW PARTNER
// PATCH /api/v1/partners/:partnerId/renew
// ======================================================

router.patch("/:partnerId/renew", isAuthenticated, authorizeRoles("SUPER_ADMIN"), validate(renewPartnerSchema), renewPartner);

// ======================================================
// SPECIAL DATES
// POST   /api/v1/partners/:partnerId/special-dates
// DELETE /api/v1/partners/:partnerId/special-dates/:dateId
// ======================================================

router.post("/:partnerId/special-dates", isAuthenticated, authorizeRoles("SUPER_ADMIN"), validate(specialDateSchema), addPartnerSpecialDate);

router.put("/:partnerId/special-dates/:dateId", isAuthenticated, authorizeRoles("SUPER_ADMIN"), validate(specialDateSchema), updatePartnerSpecialDate);

router.delete("/:partnerId/special-dates/:dateId", isAuthenticated, authorizeRoles("SUPER_ADMIN"), deletePartnerSpecialDate);

// ======================================================
// DELETE PARTNER
// DELETE /api/v1/partners/:partnerId
// ======================================================

router.delete("/:partnerId", isAuthenticated, authorizeRoles("SUPER_ADMIN"), deletePartner);

export default router;

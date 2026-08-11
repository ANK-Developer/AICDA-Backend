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


// CREATE
router.post(
  "/",
  validate(createPartnerSchema),
  createPartner
);


// GET ALL
router.get(
  "/",
  getAllPartners
);


// GET ONE
router.get(
  "/:partnerId",
  getPartnerById
);


// UPDATE
router.patch(
  "/:partnerId",
  updatePartner
);

export default router;
import express from "express";
import { changeEnquiryStatus, getEnquiries, submitEnquiry } from "../controllers/enquiry.controller.js";
import { validate } from "../middlewares/validate.js";
import { enquiryStatusValidation, enquiryValidation } from "../validation/enquiry.validation.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/superAdmin.middlewares.js";

const router = express.Router();

router.post("/", validate(enquiryValidation), submitEnquiry);
router.get("/", isAuthenticated, authorizeRoles("SUPER_ADMIN"), getEnquiries);
router.patch("/:id/status", isAuthenticated, authorizeRoles("SUPER_ADMIN"), validate(enquiryStatusValidation), changeEnquiryStatus);

export default router;

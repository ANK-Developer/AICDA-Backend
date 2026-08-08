import express from "express";
import { getEnquiries, removeEnquiry, submitEnquiry } from "../controllers/enquiry.controller.js";
import { validate } from "../middlewares/validate.js";
import { enquiryValidation } from "../validation/enquiry.validation.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/admin.middleware.js";

const router = express.Router();

router.post("/", validate(enquiryValidation), submitEnquiry);
router.get("/", isAuthenticated, authorizeRoles("SUPER_ADMIN"), getEnquiries);
router.delete("/:id", isAuthenticated, authorizeRoles("SUPER_ADMIN"), removeEnquiry);

export default router;
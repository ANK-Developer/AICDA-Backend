import express from "express";
import {
  getSuperAdmins,
  getSuperAdminById,
  createSuperAdmin,
  updateSuperAdmin,
  updateSuperAdminStatus,
  deleteSuperAdmin,
  resetSuperAdminPassword,
} from "../controllers/superAdmin.controllers.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/superAdmin.middlewares.js";
import { validate } from "../middlewares/validate.js";
import {
  createSuperAdminValidation,
  updateSuperAdminValidation,
  resetPasswordValidation,
} from "../validation/superAdmin.validation.js";

const router = express.Router();

router.use(isAuthenticated, authorizeRoles("SUPER_ADMIN"));

router.get("/", getSuperAdmins);
router.get("/:id", getSuperAdminById);
router.post("/create", validate(createSuperAdminValidation), createSuperAdmin);
router.patch("/:id", validate(updateSuperAdminValidation), updateSuperAdmin);
router.patch("/:id/status", updateSuperAdminStatus);
router.delete("/:id", deleteSuperAdmin);
router.post("/:id/reset-password", validate(resetPasswordValidation), resetSuperAdminPassword);

export default router;

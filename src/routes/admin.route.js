import express from "express";
import {
  createAdmin,
  deleteAdmin,
  getAllAdmins,
  getSingleAdmin,
  toggleAdminStatus,
  updateAdmin,
} from "../controllers/admin.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/admin.middleware.js";

const router = express.Router();

router.post(
  "/create",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN"),
  createAdmin
);

router.get("/", isAuthenticated, authorizeRoles("SUPER_ADMIN"), getAllAdmins);
router.get("/:id", isAuthenticated, authorizeRoles("SUPER_ADMIN"), getSingleAdmin);
router.patch("/:id", isAuthenticated, authorizeRoles("SUPER_ADMIN"), updateAdmin);
router.patch("/:id/status", isAuthenticated, authorizeRoles("SUPER_ADMIN"), toggleAdminStatus);
router.delete("/:id", isAuthenticated, authorizeRoles("SUPER_ADMIN"), deleteAdmin);

export default router;

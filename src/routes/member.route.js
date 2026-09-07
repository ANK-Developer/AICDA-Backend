import express from "express";
import * as memberController from "../controllers/member.controller.js";
import { uploadGalleryMedia } from "../middlewares/upload.middleware.js";import { validateMember, validateMemberRenew } from "../validation/member.validation.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/superAdmin.middlewares.js";

const router = express.Router();

router.post("/", isAuthenticated, authorizeRoles("SUPER_ADMIN"), uploadGalleryMedia.single("photo"), validateMember, memberController.createMember);
router.get("/", isAuthenticated, authorizeRoles("SUPER_ADMIN"), memberController.getAllMembers);
router.get("/public", memberController.getPublicMembers);
router.get("/:id", isAuthenticated, authorizeRoles("SUPER_ADMIN"), memberController.getMemberById);
router.put("/:id", isAuthenticated, authorizeRoles("SUPER_ADMIN"), uploadGalleryMedia.single("photo"), validateMember, memberController.updateMember);
router.patch("/:id/status", isAuthenticated, authorizeRoles("SUPER_ADMIN"), memberController.toggleMemberStatus);
router.patch("/:id/renew", isAuthenticated, authorizeRoles("SUPER_ADMIN"), validateMemberRenew, memberController.renewMember);
router.delete("/:id", isAuthenticated, authorizeRoles("SUPER_ADMIN"), memberController.deleteMember);

export default router;


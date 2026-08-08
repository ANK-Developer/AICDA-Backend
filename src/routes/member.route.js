import express from "express";
import * as memberController from "../controllers/member.controller.js";
import upload from "../middlewares/upload.middleware.js";
import { validateMember } from "../validation/member.validation.js";
import { isAuthenticated as authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, upload.single("photo"), validateMember, memberController.createMember);
router.get("/", authMiddleware, memberController.getAllMembers);
router.get("/public", memberController.getPublicMembers);
router.get("/:id", authMiddleware, memberController.getMemberById);
router.put("/:id", authMiddleware, upload.single("photo"), validateMember, memberController.updateMember);
router.patch("/:id/status", authMiddleware, memberController.toggleMemberStatus);
router.delete("/:id", authMiddleware, memberController.deleteMember);

export default router;




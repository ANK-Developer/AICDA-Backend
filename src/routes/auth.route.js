import express from "express";

import {
  login,
  logout,
  getMe,
  changePassword,
} from "../controllers/auth.controller.js";

import { isAuthenticated } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public
router.post("/login", login);

// Protected
router.post("/logout", isAuthenticated, logout);

router.get("/me", isAuthenticated, getMe);

router.post(
  "/change-password",
  isAuthenticated,
  changePassword
);

export default router;
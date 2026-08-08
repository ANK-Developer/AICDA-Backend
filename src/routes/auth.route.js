import express from "express";
import {
  login,
  logOut,
  getMe,
  changePassword,
} from "../controllers/auth.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/admin.middleware.js";

console.log("Auth Route File Loaded");

const router = express.Router();
router.get("/test", (req, res) => {
  res.send("Auth Route Working");
});
console.log("Loading Auth Routes...");
router.post("/login", login);

router.post("/logout", isAuthenticated, logOut);

router.get("/me", isAuthenticated, getMe);

router.post(
  "/change-password",
  isAuthenticated,
  authorizeRoles("SUPER_ADMIN"),
  changePassword
);

export default router;
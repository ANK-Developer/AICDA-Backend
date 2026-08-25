import express from "express";
import * as importantDateController from "../controllers/importantDate.controller.js";
import { validateImportantDate } from "../validation/importantDate.validation.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/superAdmin.middlewares.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

router.use(isAuthenticated, authorizeRoles("SUPER_ADMIN"));

router.post(
  "/",
  upload.single("image"),
  validateImportantDate,
  importantDateController.createImportantDate,
);
router.get("/", importantDateController.getAllImportantDates);
router.get("/birthdays/upcoming", importantDateController.getUpcomingBirthdays);
router.get("/:id", importantDateController.getImportantDateById);
router.put(
  "/:id",
  upload.single("image"),
  validateImportantDate,
  importantDateController.updateImportantDate,
);
router.delete("/:id", importantDateController.deleteImportantDate);

export default router;

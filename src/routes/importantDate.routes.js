import express from "express";
import * as importantDateController from "../controllers/importantDate.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/superAdmin.middlewares.js";

const router = express.Router();

router.use(isAuthenticated, authorizeRoles("SUPER_ADMIN"));

router.get("/", importantDateController.getImportantDates);

export default router;

import express from "express";
import { getCities } from "../controllers/location.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/superAdmin.middlewares.js";

const router = express.Router();

router.get("/cities", isAuthenticated, authorizeRoles("SUPER_ADMIN"), getCities);

export default router;

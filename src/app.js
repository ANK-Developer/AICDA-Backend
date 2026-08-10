import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

import galleryRoutes from "./routes/gallery.routes.js";
import memberRoutes from "./routes/member.route.js";
import enquiryRoutes from "./routes/enquiry.route.js";
import authRoutes from "./routes/auth.route.js";
import superAdminRoutes from "./routes/superAdmin.routs.js";

dotenv.config();

const app = express();

// Allow the frontend to call the API and send the login cookie.
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://192.168.1.39:8080",
      process.env.Frontend_URL,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AICDA Backend API is running",
  });
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/gallery", galleryRoutes);
app.use("/api/v1/members", memberRoutes);
app.use("/api/v1/enquiries", enquiryRoutes);
app.use("/api/v1/super-admin", superAdminRoutes);

// Fallback JSON error handler (e.g. errors passed via next(error) from member routes)
app.use((error, req, res, next) => {
  console.error(error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
});

export default app;

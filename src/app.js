import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

import galleryRoutes from "./routes/gallery.routes.js";
import authRoutes from "./routes/auth.route.js";
import adminRoutes from "./routes/admin.route.js";
import memberRoutes from "./routes/member.route.js";
import enquiryRoutes from "./routes/enquiry.route.js";

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
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/gallery", galleryRoutes);
app.use("/api/v1/members", memberRoutes);
app.use("/api/v1/enquiries", enquiryRoutes);

export default app;

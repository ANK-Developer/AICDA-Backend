import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import galleryRoutes from "./routes/gallery.routes.js";
import authRoutes from "./routes/auth.route.js";
import adminRoutes from "./routes/admin.route.js";

const app = express();

// Allow the frontend to call the API and send the login cookie.
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://192.168.1.39:8080",
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
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

export default app;

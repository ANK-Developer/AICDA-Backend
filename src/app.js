import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import partnerRoutes from "./routes/partner.routes.js";
import compression from "compression";
import galleryRoutes from "./routes/gallery.routes.js";
import memberRoutes from "./routes/member.route.js";
import enquiryRoutes from "./routes/enquiry.route.js";
import authRoutes from "./routes/auth.route.js";
import superAdminRoutes from "./routes/superAdmin.routs.js";
import locationRoutes from "./routes/location.routes.js";
import importantDateRoutes from "./routes/importantDate.routes.js";

dotenv.config();

const app = express();
app.use(compression());
// Allow the frontend to call the API and send the login cookie.
// LAN IPs (e.g. 192.168.x.x:8080) are allowed dynamically since the dev
// machine's address can change between networks/DHCP leases.
const LAN_ORIGIN = /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:8080$/;
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        origin === "http://localhost:8080" ||
        origin === process.env.Frontend_URL ||
        LAN_ORIGIN.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
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
app.use("/api/v1/locations", locationRoutes);
app.use("/api/v1/important-dates", importantDateRoutes);
app.use(
  "/api/v1/partners",
  partnerRoutes
);
// Fallback JSON error handler (e.g. errors passed via next(error) from member routes)
app.use((error, req, res, next) => {
  console.error(error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
});

export default app;

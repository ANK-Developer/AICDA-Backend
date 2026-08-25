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

  // Prisma unique-constraint violation (P2002) — surface the offending
  // field instead of leaking the raw Prisma error string to the client.
  // On MySQL, meta.target is the constraint name (e.g. "Member_memberId_key"),
  // not an array of field names like on Postgres, so pull the field out of it.
  if (error.code === "P2002") {
    const target = error.meta?.target;
    let field = "value";
    if (Array.isArray(target)) {
      field = target[0] || field;
    } else if (typeof target === "string") {
      field = target.match(/_([A-Za-z0-9]+)_key$/)?.[1] || target;
    }
    // Human-readable labels for the fields admins actually hit this on —
    // falls back to the raw field name for anything not listed here.
    const FIELD_LABELS = {
      memberId: "Member ID",
      partnerId: "Partner ID",
      email: "Email",
      phone: "Phone",
    };
    const label = FIELD_LABELS[field] || field;
    const value = req.body?.[field];
    return res.status(409).json({
      success: false,
      message: value
        ? `${label} "${value}" is already in use — please use a different ${label}.`
        : `This ${label} is already in use — please use a different ${label}.`,
    });
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
  });
});

export default app;

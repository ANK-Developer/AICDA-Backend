import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

export const isAuthenticated = async (req, res, next) => {
  try {
    const bearerHeader = req.headers?.authorization;
    const bearerToken = bearerHeader?.startsWith("Bearer ")
      ? bearerHeader.slice(7)
      : null;
    const token = req.cookies?.token || bearerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin account no longer exists",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    req.admin = admin;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

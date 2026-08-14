import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import generateToken from "../utils/generateToken.js";

// =====================================
// LOGIN
// POST /api/v1/auth/login
// =====================================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    console.log("LOGIN EMAIL:", email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const admin = await prisma.admin.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    console.log("ADMIN FOUND:", !!admin);

    if (!admin) {
      console.log("ADMIN NOT FOUND");

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("DATABASE EMAIL:", admin.email);
    console.log("DATABASE ROLE:", admin.role);
    console.log("DATABASE ACTIVE:", admin.isActive);

    const passwordMatch = await bcrypt.compare(
      password,
      admin.password
    );

    console.log("PASSWORD MATCH:", passwordMatch);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    // Only SUPER_ADMIN can access this panel
    if (admin.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can access this panel",
      });
    }

    const token = generateToken(admin.id);

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      admin: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================
// LOGOUT
// POST /api/v1/auth/logout
// =====================================
export const logout = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================
// GET CURRENT ADMIN
// GET /api/v1/auth/me
// =====================================
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    admin: req.admin,
  });
};

// =====================================
// CHANGE OWN PASSWORD
// POST /api/v1/auth/change-password
// =====================================
export const changePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body || {};

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password and confirm password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 6 characters long",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password and confirm password do not match",
      });
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    await prisma.admin.update({
      where: {
        id: req.admin.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
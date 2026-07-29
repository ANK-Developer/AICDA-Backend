import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";

const adminSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
};

const findAdmin = (id) =>
  prisma.admin.findFirst({
    where: { id, role: "ADMIN" },
    select: adminSelect,
  });

export const createAdmin = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    const existingAdmin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Email or phone already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        role: "ADMIN",
        createdById: req.admin.id,
      },
      select: adminSelect,
    });

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin,
    });
  } catch (error) {
    console.error("Create Admin Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      where: { role: "ADMIN" },
      select: adminSelect,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: admins.length,
      admins,
    });
  } catch (error) {
    console.error("Get All Admins Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSingleAdmin = async (req, res) => {
  try {
    const admin = await findAdmin(req.params.id);

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    return res.status(200).json({ success: true, admin });
  } catch (error) {
    console.error("Get Single Admin Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const updateAdmin = async (req, res) => {
  try {
    const admin = await findAdmin(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const { firstName, lastName, email, phone, password } = req.body;
    const data = {};

    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone || null;
    if (password !== undefined) data.password = await bcrypt.hash(password, 10);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "No fields provided to update" });
    }

    if (email || phone) {
      const duplicate = await prisma.admin.findFirst({
        where: {
          id: { not: req.params.id },
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      });

      if (duplicate) {
        return res.status(400).json({ success: false, message: "Email or phone already exists" });
      }
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id: req.params.id },
      data,
      select: adminSelect,
    });

    return res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Update Admin Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

export const toggleAdminStatus = async (req, res) => {
  try {
    const admin = await findAdmin(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const { isActive } = req.body;
    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive must be a boolean" });
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id: req.params.id },
      data: { isActive: isActive ?? !admin.isActive },
      select: adminSelect,
    });

    return res.status(200).json({
      success: true,
      message: `Admin ${updatedAdmin.isActive ? "activated" : "deactivated"} successfully`,
      admin: updatedAdmin,
    });
  } catch (error) {
    console.error("Toggle Admin Status Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const admin = await findAdmin(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    await prisma.admin.delete({ where: { id: req.params.id } });

    return res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Delete Admin Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

import * as superAdminService from "../services/superAdmin.service.js";

export const getSuperAdmins = async (req, res, next) => {
  try {
    const admins = await superAdminService.getSuperAdmins();

    return res.status(200).json({
      success: true,
      message: "Super admins fetched successfully",
      data: admins,
    });
  } catch (error) {
    next(error);
  }
};

export const getSuperAdminById = async (req, res, next) => {
  try {
    const admin = await superAdminService.getSuperAdminById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Super admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

export const createSuperAdmin = async (req, res, next) => {
  try {
    const admin = await superAdminService.createSuperAdmin(req.body, req.admin.id);

    return res.status(201).json({
      success: true,
      message: "Super admin created successfully",
      data: admin,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email or phone already in use",
      });
    }
    next(error);
  }
};

export const updateSuperAdmin = async (req, res, next) => {
  try {
    const admin = await superAdminService.updateSuperAdmin(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Super admin updated successfully",
      data: admin,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email or phone already in use",
      });
    }
    next(error);
  }
};

export const updateSuperAdminStatus = async (req, res, next) => {
  try {
    if (req.params.id === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own status",
      });
    }

    const admin = await superAdminService.toggleSuperAdminStatus(req.params.id);

    return res.status(200).json({
      success: true,
      message: admin.isActive
        ? "Super admin activated successfully"
        : "Super admin deactivated successfully",
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSuperAdmin = async (req, res, next) => {
  try {
    if (req.params.id === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    await superAdminService.deleteSuperAdmin(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Super admin deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const resetSuperAdminPassword = async (req, res, next) => {
  try {
    await superAdminService.resetSuperAdminPassword(req.params.id, req.body.newPassword);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

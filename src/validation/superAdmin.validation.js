import Joi from "joi";

export const createSuperAdminValidation = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({
    "any.required": "First name is required",
    "string.empty": "First name is required",
  }),

  lastName: Joi.string().min(2).max(50).required().messages({
    "any.required": "Last name is required",
    "string.empty": "Last name is required",
  }),

  email: Joi.string().email().required().messages({
    "any.required": "Email is required",
    "string.email": "Invalid email address",
  }),

  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .allow("")
    .optional()
    .messages({
      "string.pattern.base": "Phone number must be 10 digits",
    }),

  password: Joi.string().min(6).required().messages({
    "any.required": "Password is required",
    "string.min": "Password must be at least 6 characters long",
  }),
});

export const updateSuperAdminValidation = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),

  lastName: Joi.string().min(2).max(50).optional(),

  email: Joi.string().email().optional().messages({
    "string.email": "Invalid email address",
  }),

  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .allow("")
    .optional()
    .messages({
      "string.pattern.base": "Phone number must be 10 digits",
    }),
});

export const resetPasswordValidation = Joi.object({
  newPassword: Joi.string().min(6).required().messages({
    "any.required": "New password is required",
    "string.min": "New password must be at least 6 characters long",
  }),

  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.required": "Confirm password is required",
      "any.only": "New password and confirm password do not match",
    }),
});

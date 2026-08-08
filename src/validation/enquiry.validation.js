import Joi from "joi";

export const enquiryValidation = Joi.object({
  requestType: Joi.string().required().messages({
    "any.required": "Request type is required",
    "string.empty": "Request type is required",
  }),

  fullName: Joi.string().min(2).max(100).required().messages({
    "any.required": "Full name is required",
    "string.empty": "Full name is required",
  }),

  mobile: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "any.required": "Mobile number is required",
      "string.pattern.base": "Mobile number must be 10 digits",
    }),

  email: Joi.string().email().allow("").optional(),

  companyName: Joi.string().max(150).allow("").optional(),

  city: Joi.string().max(100).allow("").optional(),

  state: Joi.string().max(100).allow("").optional(),

  message: Joi.string().max(1000).allow("").optional(),
});

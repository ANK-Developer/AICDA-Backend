import Joi from "joi";

export const createPartnerSchema = Joi.object({
  memberId: Joi.number().integer().min(1).required().messages({
    "any.required": "Member ID is required",
    "number.base": "Member ID must be a number",
  }),

  partnerName: Joi.string().min(2).max(150).required().messages({
    "any.required": "Partner Name is required",
    "string.empty": "Partner Name is required",
  }),

  fatherName: Joi.string().max(150).allow("").optional(),
  residentialAddress: Joi.string().allow("").optional(),

  mobile: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .allow("")
    .optional()
    .messages({
      "string.pattern.base": "Mobile number must be exactly 10 digits",
    }),

  residentialTelephone: Joi.string().allow("").optional(),

  panCardNo: Joi.string().allow("").optional(),

  aadharNo: Joi.string().length(12).allow("").optional().messages({
    "string.length": "Aadhar must contain 12 digits",
  }),

  designation: Joi.string().max(100).allow("").optional(),

  companyName: Joi.string().max(150).allow("").optional(),
  companyAddress: Joi.string().allow("").optional(),
  companyTelephone: Joi.string().allow("").optional(),
  packetNo: Joi.string().allow("").optional(),

  state: Joi.string().max(100).allow("").optional(),
  city: Joi.string().max(100).allow("").optional(),

  dateOfJoining: Joi.date().iso().allow("").optional(),
  validityTo: Joi.date().iso().allow("").optional(),

  amount: Joi.number().min(0).optional(),
  note: Joi.string().allow("").optional(),
});

export const updatePartnerSchema = createPartnerSchema.fork(
  ["memberId", "partnerName"],
  (rule) => rule.optional()
);

export const renewPartnerSchema = Joi.object({
  validityTo: Joi.date().iso().required().messages({
    "any.required": "Validity To date is required",
  }),
  amount: Joi.number().min(0).optional(),
  note: Joi.string().allow("").optional(),
});

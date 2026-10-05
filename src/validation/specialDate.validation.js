import Joi from "joi";

export const specialDateSchema = Joi.object({
  date: Joi.date().iso().required().messages({
    "any.required": "Date is required",
    "date.base": "Invalid date",
    "date.format": "Invalid date",
  }),
  note: Joi.string().trim().max(191).allow("", null).optional().messages({
    "string.max": "Note must be 191 characters or fewer",
  }),
});

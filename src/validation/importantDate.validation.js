import { body, validationResult } from "express-validator";

export const validateImportantDate = [
  body("title").notEmpty().withMessage("Title is required"),

  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .isISO8601()
    .withMessage("Invalid date"),

  body("description").optional(),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    next();
  },
];

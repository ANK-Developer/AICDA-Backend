import {body,validationResult} from "express-validator";
export const validateMember=[

  body("memberId")
    .notEmpty()
    .withMessage("Member ID is required")
    .isInt()
    .withMessage("Member ID must be a number"),

  body("memberName")
    .notEmpty()
    .withMessage("Member Name is required"),

  body("mobile")
    .optional()
    .isMobilePhone("en-IN")
    .withMessage("Invalid Mobile Number"),

  body("aadharNo")
    .optional()
    .isLength({ min: 12, max: 12 })
    .withMessage("Aadhar must contain 12 digits"),

  body("panCardNo")
    .optional()
    .matches(/[A-Z]{5}[0-9]{4}[A-Z]{1}/)
    .withMessage("Invalid PAN Card"),

  body("validityFrom")
    .optional()
    .isISO8601()
    .withMessage("Invalid Validity From date"),

  body("validityTo")
    .optional()
    .isISO8601()
    .withMessage("Invalid Validity To date"),

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
]
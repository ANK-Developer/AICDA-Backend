import * as importantDateService from "../services/importantDate.service.js";

// GET /api/v1/important-dates
// Query: occasion, type, search, status, period, page, limit
export const getImportantDates = async (req, res, next) => {
  try {
    const { items, counts, pagination } = await importantDateService.getImportantDates(req.query);

    res.status(200).json({
      success: true,
      data: items,
      counts,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

import { searchCities } from "../utils/location.js";

export const getCities = async (req, res, next) => {
  try {
    const { search, state, district } = req.query;
    const cities = await searchCities(search, state, district);

    res.status(200).json({
      success: true,
      data: cities,
    });
  } catch (error) {
    next(error);
  }
};

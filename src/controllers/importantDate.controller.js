import * as importantDateService from "../services/importantDate.service.js";
import * as memberService from "../services/member.service.js";

export const createImportantDate = async (req, res, next) => {
  try {
    const importantDate = await importantDateService.createImportantDate(req.body);
    res.status(201).json({
      success: true,
      message: "Important date created successfully",
      data: importantDate,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllImportantDates = async (req, res, next) => {
  try {
    const dates = await importantDateService.getAllImportantDates();
    res.status(200).json({
      success: true,
      data: dates,
    });
  } catch (error) {
    next(error);
  }
};

export const getImportantDateById = async (req, res, next) => {
  try {
    const importantDate = await importantDateService.getImportantDateById(req.params.id);

    if (!importantDate) {
      return res.status(404).json({
        success: false,
        message: "Important date not found",
      });
    }

    res.status(200).json({
      success: true,
      data: importantDate,
    });
  } catch (error) {
    next(error);
  }
};

export const updateImportantDate = async (req, res, next) => {
  try {
    const importantDate = await importantDateService.updateImportantDate(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: "Important date updated successfully",
      data: importantDate,
    });
  } catch (error) {
    next(error);
  }
};

export const getUpcomingBirthdays = async (req, res, next) => {
  try {
    const birthdays = await memberService.getUpcomingBirthdays();
    res.status(200).json({
      success: true,
      data: birthdays,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteImportantDate = async (req, res, next) => {
  try {
    await importantDateService.deleteImportantDate(req.params.id);
    res.status(200).json({
      success: true,
      message: "Important date deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

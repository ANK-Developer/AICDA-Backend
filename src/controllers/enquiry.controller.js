import * as enquiryService from "../services/enquiry.service.js";

export const submitEnquiry = async (req, res) => {
  try {
    const enquiry = await enquiryService.createEnquiry(req.body);

    return res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("Submit enquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit enquiry",
    });
  }
};

export const getEnquiries = async (req, res) => {
  try {
    const enquiries = await enquiryService.getAllEnquiries();

    return res.status(200).json({
      success: true,
      count: enquiries.length,
      enquiries,
    });
  } catch (error) {
    console.error("Get enquiries error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load enquiries",
    });
  }
};

export const removeEnquiry = async (req, res) => {
  try {
    await enquiryService.deleteEnquiry(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Enquiry deleted successfully",
    });
  } catch (error) {
    console.error("Delete enquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete enquiry",
    });
  }
};
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

// GET /api/v1/enquiries
// Query: page, limit, search, status
export const getEnquiries = async (req, res) => {
  try {
    const { enquiries, stats, pagination } = await enquiryService.getAllEnquiries(req.query);

    return res.status(200).json({
      success: true,
      count: pagination.total,
      enquiries,
      stats,
      pagination,
    });
  } catch (error) {
    console.error("Get enquiries error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load enquiries",
    });
  }
};

// PATCH /api/v1/enquiries/:id/status   body: { status }
export const changeEnquiryStatus = async (req, res) => {
  try {
    const enquiry = await enquiryService.updateEnquiryStatus(req.params.id, req.body.status);

    return res.status(200).json({
      success: true,
      message: "Enquiry status updated successfully",
      data: enquiry,
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }

    console.error("Update enquiry status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update enquiry status",
    });
  }
};

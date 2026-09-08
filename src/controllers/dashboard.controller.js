import prisma from "../config/prisma.js";

export const getDashboardData = async (req, res) => {
  try {
    const [event, image, politicalAchievement] = await Promise.all([
      // Latest Event
      prisma.gallery.findFirst({
        where: {
          category: "ASSOCIATION",
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Latest Image
      prisma.gallery.findFirst({
        where: {
          category: "IMAGE",
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Latest Political Achievement
      prisma.gallery.findFirst({
        where: {
          category: "POLITICAL_ACHIEVEMENT",
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: {
        event,
        image,
        politicalAchievement,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message,
    });
  }
};

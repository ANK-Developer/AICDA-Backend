import prisma from "../config/prisma.js";

export const ENQUIRY_STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export const createEnquiry = async (data) => {
  const enquiry = await prisma.enquiry.create({
    data: {
      requestType: data.requestType,
      fullName: data.fullName,
      mobile: data.mobile,
      email: data.email || null,
      companyName: data.companyName || null,
      city: data.city || null,
      state: data.state || null,
      message: data.message || null,
    },
  });

  return enquiry;
};

// Query: page, limit, search (name / mobile / email / company / city / state /
// message), status. `stats` ignores the search and status filters so the
// header counters always show the totals for every enquiry.
export const getAllEnquiries = async (query = {}) => {
  const term = query.search?.trim();
  const status = ENQUIRY_STATUSES.includes(query.status) ? query.status : undefined;

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);

  const where = {
    ...(status && { status }),
    ...(term && {
      OR: [
        { fullName: { contains: term } },
        { mobile: { contains: term } },
        { email: { contains: term } },
        { companyName: { contains: term } },
        { city: { contains: term } },
        { state: { contains: term } },
        { message: { contains: term } },
      ],
    }),
  };

  const [enquiries, total, grouped] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.enquiry.count({ where }),
    prisma.enquiry.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const stats = { total: 0, NEW: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 };

  grouped.forEach((row) => {
    stats[row.status] = row._count._all;
    stats.total += row._count._all;
  });

  return {
    enquiries,
    stats,
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  };
};

export const updateEnquiryStatus = async (id, status) => {
  const existing = await prisma.enquiry.findUnique({ where: { id: Number(id) } });

  if (!existing) {
    const error = new Error("Enquiry not found");
    error.status = 404;
    throw error;
  }

  if (existing.status === status) return existing;

  return prisma.enquiry.update({ where: { id: existing.id }, data: { status } });
};

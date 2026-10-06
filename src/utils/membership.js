import { daysRemainingIST, istDay, startOfTodayIST } from "./validity.js";

// A member/partner has two independent statuses:
//
//  - membership: comes from the plan dates (valid / expired / payment pending).
//    Never stored; always calculated here, in IST.
//  - status: the admin's manual decision (ACTIVE / INACTIVE) with a reason and
//    who did it. Stored in `isActive` + statusReason / statusActionBy / statusActionAt.
//
// `isActive` in API responses is the combined, effective value, so clients never
// have to compare dates themselves.

export const buildMembership = (record) => {
  const validTo = record.validityTo ?? null;
  // Where the next renewal starts by default: the last valid-to day, or the day
  // the record was created when nothing has been paid yet.
  const nextValidFrom = istDay(validTo || record.createdAt);

  if (!validTo) {
    return {
      status: "PENDING",
      isValid: false,
      validFrom: record.validityFrom ?? null,
      validTo: null,
      daysRemaining: null,
      nextValidFrom,
    };
  }

  const daysRemaining = daysRemainingIST(validTo);
  const isValid = daysRemaining !== null && daysRemaining >= 0;

  return {
    status: isValid ? "VALID" : "EXPIRED",
    isValid,
    validFrom: record.validityFrom ?? null,
    validTo,
    daysRemaining,
    nextValidFrom,
  };
};

export const withStatus = (record) => {
  if (!record) return record;

  const { statusReason, statusActionBy, statusActionAt, ...rest } = record;
  const membership = buildMembership(record);
  const manuallyActive = record.isActive !== false;

  return {
    ...rest,
    isActive: manuallyActive && membership.isValid,
    membership,
    status: {
      status: manuallyActive ? "ACTIVE" : "INACTIVE",
      reason: statusReason ?? null,
      actionBy: statusActionBy ?? null,
      actionAt: statusActionAt ?? null,
    },
  };
};

// Prisma `where` fragments for the directory status filters. The four basic
// states never overlap, so they always add up to "all":
//   blocked  - the admin switched it off (wins over everything else)
//   expired  - not blocked, plan ended
//   pending  - not blocked, no payment / validity recorded yet
//   active   - not blocked, plan still running
export const activeWhere = () => ({
  isActive: true,
  validityTo: { gte: startOfTodayIST() },
});

export const blockedWhere = () => ({ isActive: false });

export const expiredWhere = () => ({
  isActive: true,
  validityTo: { lt: startOfTodayIST() },
});

export const pendingWhere = () => ({ isActive: true, validityTo: null });

export const inactiveWhere = () => ({
  OR: [{ isActive: false }, { validityTo: null }, { validityTo: { lt: startOfTodayIST() } }],
});

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EXPIRING_DAYS = 7;

export const parseExpiringDays = (value) => {
  const days = Math.floor(Number(value));
  return Number.isFinite(days) && days >= 0 ? Math.min(days, 365) : DEFAULT_EXPIRING_DAYS;
};

// Active and ending within the next `days` days (today included).
export const expiringWhere = (days = DEFAULT_EXPIRING_DAYS) => ({
  isActive: true,
  validityTo: {
    gte: startOfTodayIST(),
    lte: new Date(startOfTodayIST().getTime() + (parseExpiringDays(days) + 1) * DAY_MS - 1),
  },
});

const STATUS_FILTERS = {
  active: activeWhere,
  inactive: inactiveWhere,
  blocked: blockedWhere,
  expired: expiredWhere,
  pending: pendingWhere,
  expiring: expiringWhere,
};

// Returns the where fragment for a `status` query value, or null for "all" /
// anything unknown.
export const statusFilterWhere = (status, expiringDays) => {
  const build = STATUS_FILTERS[status];
  return build ? build(expiringDays) : null;
};

// Directory-wide counts for the summary cards, independent of search and filters.
export const statusCounts = async (delegate, expiringDays) => {
  const [active, blocked, expired, pending, expiring] = await Promise.all([
    delegate.count({ where: activeWhere() }),
    delegate.count({ where: blockedWhere() }),
    delegate.count({ where: expiredWhere() }),
    delegate.count({ where: pendingWhere() }),
    delegate.count({ where: expiringWhere(expiringDays) }),
  ]);

  return {
    total: active + blocked + expired + pending,
    active,
    inactive: blocked + expired + pending,
    blocked,
    expired,
    pending,
    expiring,
  };
};

// Normalises the body of a manual status change. Deactivating needs a reason.
export const parseStatusChange = (body = {}, admin) => {
  const { isActive, reason } = body;

  if (typeof isActive !== "boolean") {
    const error = new Error("isActive must be true or false");
    error.status = 400;
    throw error;
  }

  const cleanReason = typeof reason === "string" ? reason.trim() : "";

  if (!isActive && cleanReason.length < 3) {
    const error = new Error("A reason (at least 3 characters) is required to deactivate");
    error.status = 400;
    throw error;
  }

  if (cleanReason.length > 500) {
    const error = new Error("Reason must be 500 characters or fewer");
    error.status = 400;
    throw error;
  }

  const actionBy = [admin?.firstName, admin?.lastName].filter(Boolean).join(" ").trim() || admin?.email || null;

  return {
    isActive,
    statusReason: cleanReason || null,
    statusActionBy: actionBy,
    statusActionAt: new Date(),
  };
};

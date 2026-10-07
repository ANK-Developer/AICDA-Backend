import prisma from "../config/prisma.js";
import { asSpecialDateList } from "../utils/specialDates.js";
import { activeWhere, inactiveWhere, withStatus } from "../utils/membership.js";

// Important Dates are not stored on their own — they are derived from the
// dateOfBirth and specialDates (array) already on every Member and Partner, so
// the profile stays the single source of truth.

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const OCCASIONS = ["birthday", "special"];
const TYPES = ["member", "partner"];

// Days ahead covered by each period. "today" is the default view.
const PERIOD_DAYS = { today: 0, week: 7, month: 30 };

// Today's calendar date in IST as a UTC-midnight timestamp, so it compares
// cleanly against dates stored as UTC midnight (the way date inputs are saved).
const todayInIST = () => {
  const shifted = new Date(Date.now() + IST_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
};

// Next time the month/day of `date` occurs on or after `today`.
const nextOccurrence = (date, today) => {
  const source = new Date(date);
  const todayYear = new Date(today).getUTCFullYear();

  let next = Date.UTC(todayYear, source.getUTCMonth(), source.getUTCDate());
  if (next < today) {
    next = Date.UTC(todayYear + 1, source.getUTCMonth(), source.getUTCDate());
  }

  return next;
};

const SELECT_FIELDS = {
  id: true,
  photo: true,
  isActive: true,
  validityTo: true,
  dateOfBirth: true,
  specialDates: true,
};

const toEntries = (record, { type, name, code }, today) =>
  [
    { entryKey: "birthday", occasion: "birthday", date: record.dateOfBirth, note: null },
    ...asSpecialDateList(record.specialDates).map((special) => ({
      entryKey: `special-${special.id}`,
      occasion: "special",
      date: special.date,
      note: special.note,
    })),
  ]
    .filter((entry) => entry.date)
    .map((entry) => {
      const nextDate = nextOccurrence(entry.date, today);

      return {
        key: `${type}-${record.id}-${entry.entryKey}`,
        id: record.id,
        type,
        name,
        code,
        photo: record.photo,
        isActive: withStatus(record).isActive,
        occasion: entry.occasion,
        date: entry.date,
        note: entry.note,
        nextDate: new Date(nextDate),
        daysLeft: Math.round((nextDate - today) / DAY_MS),
      };
    });

// Query: occasion (birthday|special), type (member|partner), search (name or
// ID), status (active|inactive), period (today|week|month|all — default
// today), page, limit. `counts` always reflects the current type / status /
// search / period but ignores `occasion`, so the tab badges stay accurate.
export const getImportantDates = async (query = {}) => {
  const {
    occasion,
    type,
    search,
    status,
    period = "today",
    page = 1,
    limit = 10,
  } = query;

  const term = search?.trim();
  const isNumeric = term && /^\d+$/.test(term);
  const today = todayInIST();

  // Effective status (manual status + running membership), same as the directory lists.
  const statusFilter = status === "active" ? activeWhere() : status === "inactive" ? inactiveWhere() : {};

  const wantMembers = !TYPES.includes(type) || type === "member";
  const wantPartners = !TYPES.includes(type) || type === "partner";

  const [members, partners] = await Promise.all([
    wantMembers
      ? prisma.member.findMany({
          where: {
            ...statusFilter,
            ...(term && {
              AND: [
                {
                  OR: [{ memberName: { contains: term } }, ...(isNumeric ? [{ memberId: Number(term) }] : [])],
                },
              ],
            }),
          },
          select: { ...SELECT_FIELDS, memberId: true, memberName: true },
        })
      : [],
    wantPartners
      ? prisma.partner.findMany({
          where: {
            ...statusFilter,
            ...(term && {
              AND: [{ OR: [{ partnerName: { contains: term } }, { partnerId: { contains: term } }] }],
            }),
          },
          select: { ...SELECT_FIELDS, partnerId: true, partnerName: true },
        })
      : [],
  ]);

  const maxDays = PERIOD_DAYS[period];

  const entries = [
    ...members.flatMap((member) =>
      toEntries(member, { type: "member", name: member.memberName, code: String(member.memberId) }, today),
    ),
    ...partners.flatMap((partner) =>
      toEntries(partner, { type: "partner", name: partner.partnerName, code: partner.partnerId }, today),
    ),
  ].filter((entry) => maxDays === undefined || entry.daysLeft <= maxDays);

  const counts = {
    birthday: entries.filter((entry) => entry.occasion === "birthday").length,
    special: entries.filter((entry) => entry.occasion === "special").length,
  };

  const visible = (OCCASIONS.includes(occasion) ? entries.filter((entry) => entry.occasion === occasion) : entries).sort(
    (a, b) => a.daysLeft - b.daysLeft || a.name.localeCompare(b.name),
  );

  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 100);

  return {
    items: visible.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    counts,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total: visible.length,
      totalPages: Math.max(Math.ceil(visible.length / pageSize), 1),
    },
  };
};

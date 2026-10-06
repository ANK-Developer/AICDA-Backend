// Comparing raw Date objects (with time-of-day) against `now` can flip a
// member inactive hours early/late depending on server timezone vs. the
// admin's local day boundary. Everything here compares at local calendar-day
// granularity instead, so "valid through July 31" means valid all day July 31.
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const isValidToday = (validityTo) => {
  if (!validityTo) return false;
  const to = startOfDay(validityTo);
  if (Number.isNaN(to.getTime())) return false;
  return to >= startOfDay(new Date());
};

// Chains a renewal onto the previous validity period without gaps or overlap:
// starts the day after the prior expiry, or today if there was no prior
// period (new member) or the prior period already lapsed.
export const nextValidityFrom = (previousValidityTo) => {
  const today = startOfDay(new Date());
  if (!previousValidityTo) return today;
  const prevTo = startOfDay(previousValidityTo);
  if (Number.isNaN(prevTo.getTime()) || prevTo < today) return today;
  const next = new Date(prevTo);
  next.setDate(next.getDate() + 1);
  return next;
};

const IST_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "YYYY-MM-DD", a full ISO timestamp (as stored in the database and returned by
// the API) or a Date all name a calendar day. Returns that day in IST as
// "YYYY-MM-DD", or null when the value is not a real date.
const toISTDay = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : IST_DAY.format(value);
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    // Rejects impossible days such as 2026-02-31, which Date would roll over.
    const parsed = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text
      ? text
      : null;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : IST_DAY.format(parsed);
};

// Validity runs through the whole last day, so the stored expiry is the very end
// of that day in IST. Accepts a plain date or a full timestamp so a record that
// was read from the API and sent back unchanged never fails here.
export const endOfDayIST = (value) => {
  if (!value) return null;

  const day = toISTDay(value);

  if (!day) {
    const error = new Error("Invalid validity date");
    error.status = 400;
    throw error;
  }

  return new Date(`${day}T23:59:59.999+05:30`);
};

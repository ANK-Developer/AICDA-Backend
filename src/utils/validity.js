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

// Midnight (start) of the IST calendar day a date falls on.
export const startOfDayIST = (value) => {
  const day = toISTDay(value);

  if (!day) {
    const error = new Error("Invalid validity date");
    error.status = 400;
    throw error;
  }

  return new Date(`${day}T00:00:00.000+05:30`);
};

// Valid-from is never entered by the admin; the backend derives it.
//  - First payment (no previous expiry): the day the record was created.
//  - Renewal / extension: the previous expiry date, whether it is still running
//    or has already lapsed, so every plan period continues from the last one.
export const nextValidityFrom = (previousValidityTo, createdAt) =>
  startOfDayIST(previousValidityTo || createdAt);

// Valid-from to store when an edit form changes the expiry date. A later expiry
// is a renewal and continues from the old expiry; an equal or earlier one is just
// a correction and keeps the existing start.
export const validityFromForEdit = (existing, newValidityTo) => {
  if (!existing.validityTo) return nextValidityFrom(null, existing.createdAt);

  if (new Date(newValidityTo).getTime() > new Date(existing.validityTo).getTime()) {
    return nextValidityFrom(existing.validityTo, existing.createdAt);
  }

  return existing.validityFrom ?? nextValidityFrom(existing.validityTo, existing.createdAt);
};

// Midnight (start) of today in IST. A record is valid while its expiry is on or
// after this instant, i.e. through the whole last day.
export const startOfTodayIST = () => startOfDayIST(new Date());

// Whole IST calendar days from today to the expiry day: 0 on the last valid day,
// negative once expired, null when there is no (valid) expiry date.
export const daysRemainingIST = (validityTo) => {
  const target = validityTo ? toISTDay(validityTo) : null;
  const today = toISTDay(new Date());

  if (!target) return null;

  return Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
};

const formatDay = (day) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

// Works out and checks the period of a renewal. Valid From and Payment Date are
// optional in the request: Valid From defaults to the last valid-to (or the day
// the record was created, for a first payment). The payment date is never sent:
// it is always the moment the payment is recorded.
//
// Rules:
//  - Valid To is required and cannot be before Valid From.
//  - Valid From cannot be before the last valid-to (periods never overlap).
//  - While the last plan is still running, the new plan has to continue straight
//    from it, so there can be no gap inside a running plan.
//  - After the last plan has lapsed, Valid From may be any day from the last
//    valid-to up to today. The days in between stay Expired.
//  - Otherwise Valid From cannot be in the future.
export const resolveRenewalPeriod = ({ previousValidityTo, createdAt, validityFrom, validityTo }) => {
  const fail = (message) => {
    const error = new Error(message);
    error.status = 400;
    throw error;
  };

  if (!validityTo) fail("Validity To date is required");

  const to = endOfDayIST(validityTo);
  const from = validityFrom ? startOfDayIST(validityFrom) : nextValidityFrom(previousValidityTo, createdAt);

  const today = toISTDay(new Date());
  const fromDay = toISTDay(from);
  const toDay = toISTDay(to);

  if (toDay < fromDay) fail("Validity To cannot be before Valid From.");

  if (previousValidityTo) {
    const previousDay = toISTDay(previousValidityTo);

    if (fromDay < previousDay) {
      fail(`Valid From cannot be before the last valid-to date (${formatDay(previousDay)}).`);
    }

    if (previousDay >= today) {
      if (fromDay !== previousDay) {
        fail(
          `The current plan runs until ${formatDay(previousDay)}. Valid From must be ${formatDay(previousDay)}, so the new plan continues from it.`,
        );
      }
    } else if (fromDay > today) {
      fail("Valid From cannot be in the future.");
    }
  } else if (fromDay > today) {
    fail("Valid From cannot be in the future.");
  }

  return { validityFrom: from, validityTo: to, paymentDate: new Date() };
};

// The IST calendar day ("YYYY-MM-DD") of a date, or null when there is none.
export const istDay = (value) => (value ? toISTDay(value) : null);

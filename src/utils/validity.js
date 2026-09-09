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

export const endOfDayIST = (dateString) => {
  if (!dateString) return null;

  const date = new Date(`${dateString}T23:59:59.999+05:30`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid validity date");
  }

  return date;
};

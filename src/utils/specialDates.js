import { randomUUID } from "crypto";

// Members and partners can each have any number of special dates (anniversary,
// etc.), kept as a JSON array on the record: [{ id, date: "YYYY-MM-DD", note }].

export const asSpecialDateList = (value) => (Array.isArray(value) ? value : []);

export const buildSpecialDate = ({ date, note }) => ({
  id: randomUUID(),
  date: new Date(date).toISOString().slice(0, 10),
  note: note?.trim() || null,
});

// Form submissions (multipart) send the whole list as a JSON string. Returns a
// clean list, or undefined when the field was not sent so an update leaves the
// stored dates alone. Entries keep their id when they already have one.
export const parseSpecialDates = (raw) => {
  if (raw === undefined || raw === null) return undefined;

  let list = raw;

  if (typeof raw === "string") {
    if (!raw.trim()) return [];

    try {
      list = JSON.parse(raw);
    } catch {
      const error = new Error("Invalid special dates");
      error.status = 400;
      throw error;
    }
  }

  return asSpecialDateList(list)
    .filter((entry) => entry?.date && !Number.isNaN(new Date(entry.date).getTime()))
    .map((entry) => ({ ...buildSpecialDate(entry), ...(entry.id && { id: String(entry.id) }) }));
};

export const updateSpecialDateInList = (list, dateId, { date, note }) => {
  const index = list.findIndex((entry) => entry.id === dateId);

  if (index === -1) return null;

  return list.map((entry, position) =>
    position === index ? { ...entry, ...buildSpecialDate({ date, note }), id: entry.id } : entry,
  );
};

import prisma from "../config/prisma.js";

// Members and Partners are entered by name ("Rajasthan" / "Alwar") rather
// than picked from a managed reference list, so we find-or-create the
// State/City rows behind the scenes instead of requiring stateId/cityId
// from the client.
export const resolveLocationIds = async (stateName, cityName) => {
  const state = (stateName || "").trim();
  const city = (cityName || "").trim();

  let stateId = null;
  if (state) {
    const stateRow = await prisma.state.upsert({
      where: { stateName: state },
      update: {},
      create: { stateName: state },
    });
    stateId = stateRow.id;
  }

  let cityId = null;
  if (city && stateId) {
    const cityRow = await prisma.city.upsert({
      where: { cityName_stateId: { cityName: city, stateId } },
      update: {},
      create: { cityName: city, stateId },
    });
    cityId = cityRow.id;
  }

  return { stateId, cityId };
};

// Backs the admin's searchable City field — cities are only known once an
// admin has entered one for some Member/Partner, so this searches the
// existing City table (across all states) rather than a canonical external
// dataset. Freeform entry is still allowed on the form; new city names get
// upserted the same way on save.
//
// `state` narrows to that state's cities. `district` narrows further to cities
// already used by a Member in that district (or a Partner of one) — City itself
// has no district column.
export const searchCities = async (search, state, district) => {
  const where = {};
  if (search) where.cityName = { contains: search };
  if (state) where.state = { stateName: state };
  if (district) {
    where.OR = [{ members: { some: { district } } }, { partners: { some: { member: { district } } } }];
  }

  return prisma.city.findMany({
    where,
    take: 100,
    orderBy: { cityName: "asc" },
  });
};

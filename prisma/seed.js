import { PrismaClient } from "@prisma/client";
import { buildPasswordFields } from "../src/utils/passwordCrypto.js";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is missing in .env");
  }

  const existing = await prisma.admin.findUnique({
    where: {
      email: "superadmin@gmail.com",
    },
  });

  if (existing) {
    console.log("Super Admin already exists");
    return;
  }

  await prisma.admin.create({
    data: {
      firstName: "Super",
      lastName: "Admin",
      email: "superadmin@gmail.com",
      phone: "9999999999",
      ...(await buildPasswordFields(adminPassword)),
      role: "SUPER_ADMIN",
    },
  });

  console.log("Super Admin Created");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

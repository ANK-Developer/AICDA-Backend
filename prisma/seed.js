import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  const existing = await prisma.admin.findUnique({
    where: {
      email: "admin@gmail.com",
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
      password: hashedPassword,
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
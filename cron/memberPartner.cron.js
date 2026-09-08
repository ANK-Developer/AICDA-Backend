import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const startMemberPartnerCron = () => {
  // Runs every day at 12:00 AM IST
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        const now = new Date();

        console.log(`[CRON] Validity check started at ${now.toISOString()}`);

        // ==========================================
        // DEACTIVATE EXPIRED MEMBERS
        // ==========================================

        const expiredMembers = await prisma.member.updateMany({
          where: {
            isActive: true,
            validityTo: {
              lt: now,
            },
          },
          data: {
            isActive: false,
          },
        });

        // ==========================================
        // DEACTIVATE EXPIRED PARTNERS
        // ==========================================

        const expiredPartners = await prisma.partner.updateMany({
          where: {
            isActive: true,
            validityTo: {
              lt: now,
            },
          },
          data: {
            isActive: false,
          },
        });

        console.log(`[CRON] Members deactivated: ${expiredMembers.count}`);

        console.log(`[CRON] Partners deactivated: ${expiredPartners.count}`);

        console.log("[CRON] Validity check completed successfully");
      } catch (error) {
        console.error("[CRON] Validity check failed:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  console.log("[CRON] Member/Partner cron scheduled for 12:00 AM IST");
};

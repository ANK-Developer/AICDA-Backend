-- CreateTable
CREATE TABLE "MemberRenewal" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2),
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validityFrom" TIMESTAMP(3) NOT NULL,
    "validityTo" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberRenewal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRenewal" (
    "id" SERIAL NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2),
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validityFrom" TIMESTAMP(3) NOT NULL,
    "validityTo" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerRenewal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MemberRenewal" ADD CONSTRAINT "MemberRenewal_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRenewal" ADD CONSTRAINT "PartnerRenewal_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

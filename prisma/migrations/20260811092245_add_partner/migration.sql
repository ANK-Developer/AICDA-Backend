-- CreateTable
CREATE TABLE "Partner" (
    "id" SERIAL NOT NULL,
    "partnerId" TEXT NOT NULL,
    "partnerNumber" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "partnerName" TEXT NOT NULL,
    "fatherName" TEXT,
    "photo" TEXT,
    "residentialAddress" TEXT,
    "mobile" TEXT,
    "residentialTelephone" TEXT,
    "panCardNo" TEXT,
    "aadharNo" TEXT,
    "designation" TEXT,
    "companyName" TEXT,
    "companyAddress" TEXT,
    "companyTelephone" TEXT,
    "packetNo" TEXT,
    "stateId" INTEGER,
    "cityId" INTEGER,
    "dateOfJoining" TIMESTAMP(3),
    "validityFrom" TIMESTAMP(3),
    "validityTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Partner_partnerId_key" ON "Partner"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_memberId_partnerNumber_key" ON "Partner"("memberId", "partnerNumber");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

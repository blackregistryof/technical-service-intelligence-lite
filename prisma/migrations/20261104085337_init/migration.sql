-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('FAULT_CALL', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('OPEN', 'HOLD', 'CLOSED');

-- CreateTable
CREATE TABLE "atms" (
    "id" TEXT NOT NULL,
    "atmNumber" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "atms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "atmId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "workType" "WorkType" NOT NULL,
    "status" "WorkOrderStatus" NOT NULL,
    "registeredAt" TIMESTAMPTZ(3) NOT NULL,
    "faultCode" TEXT,
    "originalDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_visits" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "visitedAt" TIMESTAMPTZ(3) NOT NULL,
    "actions" TEXT NOT NULL,
    "originalComment" TEXT,
    "resolutionCode" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "technician_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_dictionary" (
    "id" TEXT NOT NULL,
    "codeType" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "code_dictionary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "atms_atmNumber_key" ON "atms"("atmNumber");

-- CreateIndex
CREATE INDEX "work_orders_status_registeredAt_idx" ON "work_orders"("status", "registeredAt");

-- CreateIndex
CREATE INDEX "work_orders_atmId_registeredAt_idx" ON "work_orders"("atmId", "registeredAt");

-- CreateIndex
CREATE INDEX "work_orders_workType_registeredAt_idx" ON "work_orders"("workType", "registeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_sourceSystem_externalId_key" ON "work_orders"("sourceSystem", "externalId");

-- CreateIndex
CREATE INDEX "technician_visits_workOrderId_visitedAt_idx" ON "technician_visits"("workOrderId", "visitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "code_dictionary_codeType_code_key" ON "code_dictionary"("codeType", "code");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_atmId_fkey" FOREIGN KEY ("atmId") REFERENCES "atms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_visits" ADD CONSTRAINT "technician_visits_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

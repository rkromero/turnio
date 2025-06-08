-- Agregar nuevo enum para tipos de eventos de cliente
CREATE TYPE "ClientEventType" AS ENUM ('ATTENDED', 'NO_SHOW', 'CANCELLED_LATE', 'CANCELLED_GOOD');

-- Crear tabla de scoring de clientes
CREATE TABLE "client_scores" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "totalPoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "starRating" INTEGER,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "attendedCount" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_scores_pkey" PRIMARY KEY ("id")
);

-- Crear tabla de historial de eventos de cliente
CREATE TABLE "client_history" (
    "id" TEXT NOT NULL,
    "clientScoreId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "eventType" "ClientEventType" NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_history_pkey" PRIMARY KEY ("id")
);

-- Crear índices únicos
CREATE UNIQUE INDEX "client_scores_email_key" ON "client_scores"("email");
CREATE UNIQUE INDEX "client_scores_phone_key" ON "client_scores"("phone");

-- Agregar foreign key
ALTER TABLE "client_history" ADD CONSTRAINT "client_history_clientScoreId_fkey" FOREIGN KEY ("clientScoreId") REFERENCES "client_scores"("id") ON DELETE CASCADE ON UPDATE CASCADE; 
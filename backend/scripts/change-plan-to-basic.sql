-- Script para cambiar el plan de octubre@turnio.com a BASIC
-- IMPORTANTE: Ejecutar este script en Railway PostgreSQL

-- 1. Primero verificamos el usuario y su negocio actual
SELECT 
  u.id as user_id,
  u.email,
  u."businessId",
  b.name as business_name,
  b."planType" as current_plan,
  b."maxAppointments"
FROM "User" u
JOIN "Business" b ON u."businessId" = b.id
WHERE u.email = 'octubre@turnio.com';

-- 2. Actualizar el plan a BASIC
UPDATE "Business"
SET 
  "planType" = 'BASIC',
  "maxAppointments" = 100,
  "updatedAt" = NOW()
WHERE id IN (
  SELECT "businessId" 
  FROM "User" 
  WHERE email = 'octubre@turnio.com'
);

-- 3. Verificar el cambio
SELECT 
  u.id as user_id,
  u.email,
  u."businessId",
  b.name as business_name,
  b."planType" as new_plan,
  b."maxAppointments",
  b."updatedAt"
FROM "User" u
JOIN "Business" b ON u."businessId" = b.id
WHERE u.email = 'octubre@turnio.com';

-- 4. Opcional: Crear una suscripción activa si no existe
-- (Comentado por seguridad - descomentar solo si es necesario)
/*
INSERT INTO "Subscription" (
  "businessId",
  "planType",
  "status",
  "startDate",
  "nextBillingDate",
  "billingCycle",
  "amount",
  "createdAt",
  "updatedAt"
)
SELECT 
  b.id,
  'BASIC',
  'ACTIVE',
  NOW(),
  NOW() + INTERVAL '1 month',
  'MONTHLY',
  100,
  NOW(),
  NOW()
FROM "Business" b
JOIN "User" u ON u."businessId" = b.id
WHERE u.email = 'octubre@turnio.com'
AND NOT EXISTS (
  SELECT 1 FROM "Subscription" 
  WHERE "businessId" = b.id 
  AND status = 'ACTIVE'
);
*/


# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project: Turnio

Full-stack SaaS appointment booking platform for Argentina. Multi-tenant: each business gets its own account, employees, services, branches, and public booking page.

---

## Commands

### Backend (`/backend`)

```bash
npm run dev              # Development server (port 3000, nodemon)
npm start                # Production server
npm test                 # Run all Jest tests
npm run test:watch       # Jest watch mode
npm run test:payment     # Run payment validation tests only
npx prisma studio        # Open Prisma GUI (port 5555)
npx prisma migrate dev --name <name>   # Create and apply a migration
npx prisma generate      # Regenerate Prisma client after schema changes
```

### Frontend (`/frontend`)

```bash
npm run dev              # Vite dev server (port 5173)
npm run build            # Production build
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
```

### Run a single test

```bash
cd backend && npx jest test/<file>.test.js
```

---

## Architecture

### Monorepo layout

```
turnio/
├── backend/          # Express.js API
│   └── src/
│       ├── config/       # DB connection (Prisma client singleton)
│       ├── controllers/  # Request handlers
│       ├── routes/       # Express routers
│       ├── middleware/   # auth.js (JWT verify), errorHandler.js
│       ├── services/     # Business logic (payments, notifications, subscriptions, risk)
│       ├── utils/        # logger.js (Winston)
│       └── templates/    # Email HTML templates
├── frontend/         # React + TypeScript + Vite SPA
│   └── src/
│       ├── pages/        # Route-level components
│       ├── components/   # Reusable UI components
│       ├── context/      # AuthContext (JWT state)
│       ├── services/     # Axios API calls
│       ├── hooks/        # Custom hooks
│       └── types/        # TypeScript interfaces
├── scripts/          # DB and utility scripts (run from root or backend/)
└── test/             # Backend Jest tests (also under backend/test/)
```

### Backend request flow

```
Route → Middleware (auth.js verifies JWT) → Controller → Service → Prisma → PostgreSQL
```

Controllers are thin: they validate input and call services. Business logic lives in `services/`.

### Key services

| Service | Responsibility |
|---|---|
| `mercadoPagoService.js` | Payment creation, webhook processing, plan upgrades |
| `subscriptionService.js` | Plan lifecycle, trial management, feature gating |
| `subscriptionAutoService.js` | Automatic recurring billing scheduler |
| `notificationService.js` | Email (Mailgun/Nodemailer), reminder scheduling |
| `riskPredictionService.js` | Client no-show scoring |
| `mercadoPagoOAuthService.js` | OAuth flow for business MP accounts |

### Database

Managed by Prisma ORM. Schema at `backend/prisma/schema.prisma`. Core models:

- **Business** — tenant root, has `slug` for public booking URL
- **User** — belongs to Business, roles: `ADMIN` / `EMPLOYEE`
- **Branch** — physical locations per Business
- **Service** — bookable services per Business/Branch
- **Appointment** — core booking record, links Client + Service + User + Branch
- **Client** — external clients (not platform users), scored by `ClientScoring`
- **Subscription** — plan state per Business (FREE / BASIC / PROFESSIONAL / ENTERPRISE)
- **AppointmentPayment** / **Payment** — payment records tied to MercadoPago

### Authentication

JWT-based. `POST /api/auth/login` returns a token. Frontend stores it and passes it as `Authorization: Bearer <token>`. `middleware/auth.js` verifies and injects `req.user`.

### Public booking flow

No auth required. Endpoints under `/api/public/:slug/` and `/api/appointments/public/:slug/`. The `slug` identifies the Business.

### MercadoPago integration

Two integration modes:
1. **Platform payments** — businesses pay Turnio for subscriptions (webhook at `/api/mercadopago/webhook`)
2. **Business payments** — businesses collect from their clients via MercadoPago OAuth (marketplace model)

Webhook processing is idempotent: payment IDs are checked before applying state changes.

---

## Environment variables

Backend requires a `.env` in `backend/`. Key variables:

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
NODE_ENV=development|production
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
MERCADOPAGO_ACCESS_TOKEN=...
MERCADOPAGO_PUBLIC_KEY=...
MP_CLIENT_ID=...
MP_CLIENT_SECRET=...
ENABLE_SUBSCRIPTION_SCHEDULER=true
PORT=3000
```

Frontend requires `frontend/.env`:

```
VITE_API_URL=http://localhost:3000
```

---

## Deployment

- **Backend + DB:** Railway. Auto-deploys from `main`. Config in `nixpacks.toml` and `Procfile`.
- **Frontend:** Vercel or Railway.
- Production domain: `turnio.com.ar`. CORS is configured to allow this origin.

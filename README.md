# 🧠 TurnIO - Plataforma SaaS de Gestión de Turnos

## 🎯 Descripción
TurnIO es una aplicación web tipo SaaS donde cada negocio (peluquería, veterinaria, estética, etc.) puede:
- Registrarse en segundos
- Pagar un plan o usar una versión gratuita
- Usar su propio panel para gestionar turnos, servicios y clientes
- Recibir reservas de sus clientes online, desde una URL personalizada

## 🛠️ Tecnologías

### Frontend
- React + Vite
- TailwindCSS para estilos
- Axios para HTTP requests
- React Router para navegación

### Backend
- Node.js + Express.js
- PostgreSQL (Railway)
- Prisma ORM
- JWT para autenticación
- bcrypt para hash de contraseñas

### Servicios Externos
- Railway (deployment y base de datos)
- SendGrid (emails)
- Twilio/Zenvia (notificaciones)
- Stripe/MercadoPago (pagos)

## 📁 Estructura del Proyecto

```
turnio/
├── frontend/          # React app con Vite
├── backend/           # Express API con Prisma
└── README.md         # Este archivo
```

## 🚀 Instalación y Desarrollo

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Variables de Entorno

### Backend (.env)
```
DATABASE_URL=
JWT_SECRET=
SENDGRID_API_KEY=
STRIPE_SECRET_KEY=
```

## 🌐 URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 🧩 Funcionalidades Principales
- ✅ Multitenencia por negocio
- ✅ Registro y autenticación
- ✅ Gestión de turnos con calendario
- ✅ Reservas online públicas
- ✅ Gestión de servicios y horarios
- ✅ Recordatorios automáticos
- ✅ Reportes y estadísticas
- ✅ Planes freemium y de pago

## 📐 Base de Datos
- **businesses**: Información de cada negocio
- **users**: Usuarios del sistema (admin/empleado)
- **appointments**: Turnos y citas
- **services**: Servicios ofrecidos por negocio 
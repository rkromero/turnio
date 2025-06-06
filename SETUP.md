# 🚀 TurnIO - Instrucciones de Configuración

## 📋 Variables de Entorno Requeridas

### Backend (.env)
Crea el archivo `backend/.env` con estas variables:

```env
# Base de datos (Railway PostgreSQL)
DATABASE_URL="postgresql://usuario:contraseña@host:puerto/database"

# JWT Secret (genera uno aleatorio)
JWT_SECRET="tu_jwt_secret_muy_seguro_aqui"

# URLs
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"

# Servicios externos (opcional por ahora)
SENDGRID_API_KEY="tu_sendgrid_api_key"
STRIPE_SECRET_KEY="tu_stripe_secret_key"
TWILIO_ACCOUNT_SID="tu_twilio_sid"
TWILIO_AUTH_TOKEN="tu_twilio_token"
```

### Frontend (.env)
Crea el archivo `frontend/.env` con estas variables:

```env
VITE_API_URL="http://localhost:3000"
```

## 🗄️ Configuración de Base de Datos

### Opción 1: Railway (Recomendado para producción)
1. Ve a [Railway.app](https://railway.app)
2. Crea una nueva aplicación
3. Agrega un servicio PostgreSQL
4. Copia la URL de conexión y úsala en `DATABASE_URL`

### Opción 2: Base de datos local
```bash
# Instalar PostgreSQL localmente
# Luego usar:
DATABASE_URL="postgresql://localhost:5432/turnio"
```

## 🛠️ Instalación y Ejecución

### 1. Instalar dependencias

```bash
# Backend
cd backend
npm install

# Frontend (en otra terminal)
cd frontend
npm install
```

### 2. Configurar la base de datos

```bash
cd backend

# Generar el cliente Prisma
npx prisma generate

# Crear y aplicar migraciones
npx prisma migrate dev --name init

# (Opcional) Explorar la base de datos
npx prisma studio
```

### 3. Ejecutar el proyecto

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm run dev
```

## 🌐 URLs del Proyecto

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Prisma Studio**: http://localhost:5555

## 🧪 Probar el Proyecto

1. **Registrar un negocio**:
   - Ve a http://localhost:5173/register
   - Completa el formulario
   - Serás redirigido al dashboard

2. **Login**:
   - Ve a http://localhost:5173/login
   - Usa las credenciales que registraste

3. **Dashboard**:
   - Explora las funcionalidades básicas
   - Ve tu URL de reservas personalizada

## 📚 Endpoints de la API

### Autenticación
- `POST /api/auth/register` - Registrar negocio
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/profile` - Obtener perfil

### Turnos
- `GET /api/appointments` - Listar turnos
- `POST /api/appointments` - Crear turno
- `PUT /api/appointments/:id` - Actualizar turno
- `DELETE /api/appointments/:id` - Cancelar turno

### Servicios
- `GET /api/services` - Listar servicios
- `POST /api/services` - Crear servicio
- `PUT /api/services/:id` - Actualizar servicio
- `DELETE /api/services/:id` - Eliminar servicio

### Reservas Públicas
- `GET /api/appointments/public/:slug/available-slots` - Slots disponibles
- `POST /api/public/:slug/book` - Reservar turno público

## 🚀 Deployment

### Railway (Backend + Database)
1. Conecta tu repositorio a Railway
2. Configura las variables de entorno
3. Railway desplegará automáticamente

### Vercel (Frontend)
1. Conecta tu repositorio a Vercel
2. Configura `VITE_API_URL` con la URL de tu backend
3. Vercel desplegará automáticamente

## 🔧 Desarrollo

### Estructura del Proyecto
```
turnio/
├── backend/                 # API con Express + Prisma
│   ├── src/
│   │   ├── controllers/     # Lógica de rutas
│   │   ├── middleware/      # Autenticación, etc.
│   │   ├── routes/          # Definición de rutas
│   │   ├── services/        # Lógica de negocio
│   │   ├── utils/           # Utilidades
│   │   └── config/          # Configuración
│   ├── prisma/
│   │   └── schema.prisma    # Esquema de base de datos
│   └── package.json
├── frontend/                # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Páginas principales
│   │   ├── context/         # Context API (Auth)
│   │   ├── services/        # API calls
│   │   ├── types/           # Tipos TypeScript
│   │   └── utils/           # Utilidades
│   └── package.json
└── README.md
```

## ⚡ Próximos Pasos

1. **Completar funcionalidades**:
   - Gestión de servicios
   - Calendario de turnos
   - Reservas públicas completas
   - Notificaciones

2. **Mejorar UI/UX**:
   - Dashboard más completo
   - Calendario visual
   - Responsive design

3. **Integraciones**:
   - Pagos con Stripe
   - Emails con SendGrid
   - SMS con Twilio

4. **Features avanzadas**:
   - Reportes y estadísticas
   - Multi-usuarios por negocio
   - Recordatorios automáticos

## 🐛 Problemas Comunes

### Error de conexión a la base de datos
- Verifica que `DATABASE_URL` esté correcta
- Asegúrate de que PostgreSQL esté ejecutándose

### Error de CORS
- Verifica que `FRONTEND_URL` esté configurada en el backend
- Asegúrate de que las URLs coincidan

### Error de autenticación
- Verifica que `JWT_SECRET` esté configurado
- Revisa que las cookies estén habilitadas

¡Tu plataforma SaaS TurnIO está lista para usar! 🎉 
# 🛒 E-Commerce Backend - Documentație Completă

## 📋 Cuprins

- [Instalare Rapidă](#instalare-rapidă)
- [Probleme Rezolvate](#probleme-rezolvate)
- [Arhitectură](#arhitectură)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

## 🚀 Instalare Rapidă

### Setup Complet (Recomandat)

```bash
npm run setup
```

Această comandă va:

1. Instala toate dependențele
2. Porni PostgreSQL în Docker
3. Rula migrațiile de bază de date
4. Genera Prisma Client

### Setup Manual

```bash
# 1. Instalare dependențe
npm install

# 2. Configurare .env
copy .env.example .env
# Editează .env și schimbă JWT_SECRET!

# 3. Pornire PostgreSQL
npm run docker:up

# 4. Migrații + Generare Prisma
npm run prisma:migrate
npm run prisma:generate

# 5. (Opțional) Seed database
npm run prisma:seed

# 6. Pornire server
npm run dev
```

## ✅ Probleme Rezolvate

### 1. **Validare Variabile de Mediu**

- ✅ Validare automată cu Zod la pornire
- ✅ Mesaje de eroare clare pentru variabile lipsă
- ✅ Type-safety pentru environment variables

### 2. **Conexiune Bază de Date**

- ✅ Verificare conexiune la pornire
- ✅ Connection pooling optimizat
- ✅ Retry logic pentru conexiuni
- ✅ Graceful shutdown cu cleanup

### 3. **Serviciu Valute**

- ✅ Retry logic (3 încercări) pentru API-uri externe
- ✅ Timeout-uri configurate (10s)
- ✅ Fallback când API-urile eșuează
- ✅ Verificare DB înainte de actualizare
- ✅ Non-blocking la pornire

### 4. **Socket.IO**

- ✅ Inițializare corectă ÎNAINTE de rute
- ✅ Ping/pong configurate (60s timeout)
- ✅ CORS configurat corect
- ✅ Authentication middleware

### 5. **Error Handling**

- ✅ Global error handler cu logging
- ✅ Error handling pentru fiecare rută
- ✅ Stack traces în development
- ✅ Mesaje user-friendly în production

### 6. **Rate Limiting**

- ✅ Global: 200 req/min (mai permisiv)
- ✅ Auth endpoints: 10 req/min (strict)
- ✅ Configurabil per rută

### 7. **Health Checks**

- ✅ `/health` - status complet (DB, memory, uptime)
- ✅ `/ping` - keep-alive simplu
- ✅ Verificare DB în health check

### 8. **Securitate**

- ✅ Helmet.js pentru headers
- ✅ CORS configurat corect
- ✅ JWT secret validation
- ✅ File upload limits (5MB)
- ✅ Request ID tracking

### 9. **Docker**

- ✅ Credențiale din environment variables
- ✅ Health check pentru PostgreSQL
- ✅ Volume persistence
- ✅ Comenzi npm pentru Docker

### 10. **Logging**

- ✅ Structured logging cu Pino
- ✅ Pretty print în development
- ✅ Request/response logging
- ✅ Error stack traces

## 🏗️ Arhitectură

```
backend/
├── src/
│   ├── index.ts                    # Entry point cu toate fix-urile
│   ├── routes/                     # API routes
│   │   ├── auth.routes.ts         # Autentificare
│   │   ├── cart.routes.ts         # Coș cumpărături
│   │   ├── order.routes.ts        # Comenzi
│   │   └── ...
│   ├── services/                   # Business logic
│   │   ├── currency.service.ts    # Serviciu valute (cu retry)
│   │   ├── auth.service.ts
│   │   └── ...
│   ├── middleware/                 # Middleware-uri
│   │   ├── auth.middleware.ts
│   │   └── admin.middleware.ts
│   ├── utils/                      # Utilități
│   │   ├── prisma.ts              # Prisma client (cu error handling)
│   │   ├── env-validator.ts       # Validare env vars
│   │   ├── logger.ts              # Logging utility
│   │   └── startup-checks.ts      # Verificări la pornire
│   ├── schemas/                    # Zod schemas
│   └── jobs/                       # Cron jobs
│       └── currency-update.job.ts # Update cursuri (cu retry)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/uploads/                 # Fișiere uploadate
├── .env                           # Variabile de mediu
├── docker-compose.yml             # PostgreSQL setup
└── SETUP.md                       # Ghid detaliat
```

## 🔌 API Endpoints

### Public

- `GET /health` - Health check
- `GET /ping` - Keep-alive
- `GET /api/public/*` - Endpoint-uri publice

### Auth (Rate limited: 10/min)

- `POST /api/auth/register` - Înregistrare
- `POST /api/auth/login` - Autentificare
- `POST /api/auth/refresh` - Refresh token

### Products

- `GET /api/data/products` - Listă produse
- `GET /api/data/products/:id` - Detalii produs
- `POST /api/admin/products` - Creare produs (admin)

### Cart

- `GET /api/cart` - Coș utilizator
- `POST /api/cart/items` - Adaugă în coș
- `DELETE /api/cart/items/:id` - Șterge din coș

### Orders

- `GET /api/orders` - Comenzile utilizatorului
- `POST /api/orders` - Creare comandă
- `GET /api/admin/orders` - Toate comenzile (admin)

### Currency

- `GET /api/currencies` - Listă monede
- `POST /api/currencies/update-rates` - Update cursuri (admin)
- `GET /api/currencies/convert` - Conversie valutară

### Uploads

- `POST /api/upload/product` - Upload imagine produs
- `POST /api/upload/avatar` - Upload avatar

## 🐛 Troubleshooting

### Eroare: "Validarea variabilelor de mediu a eșuat"

```bash
# Verifică .env
cat .env

# Asigură-te că JWT_SECRET are minim 32 caractere
# Exemplu valid:
JWT_SECRET="my-super-secret-jwt-key-with-32-chars-minimum-length"
```

### Eroare: "Nu se poate conecta la baza de date"

```bash
# Verifică Docker
docker ps

# Dacă nu rulează, pornește-l
npm run docker:up

# Verifică logs
npm run docker:logs

# Restart PostgreSQL
npm run docker:down
npm run docker:up
```

### Eroare: "PrismaClient not found"

```bash
npm run prisma:generate
```

### Eroare: "Port 3001 already in use"

```bash
# Schimbă PORT în .env
PORT=3002

# Sau găsește procesul care folosește portul
netstat -ano | findstr :3001
# Oprește procesul cu PID-ul găsit
taskkill /PID <PID> /F
```

### Cursurile valutare nu se actualizează

```bash
# Verifică logs la pornire
# Ar trebui să vezi:
# ✅ Cursuri BNR actualizate la pornire: X monede
# ✅ Cursuri API actualizate la pornire: Y monede

# Dacă vezi erori, verifică conexiunea la internet
# API-urile folosite:
# - https://www.bnr.ro/nbrfxrates.xml (BNR)
# - https://api.exchangerate-api.com/v4/latest/RON (Backup)
```

### Socket.IO nu funcționează

```bash
# Verifică CORS în .env
CORS_ORIGIN="http://localhost:3000"

# Verifică că frontend-ul folosește același URL
# În frontend/.env.local:
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📊 Monitoring

### Verificare Status

```bash
# Health check complet
curl http://localhost:3001/health

# Răspuns așteptat:
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-02-09T10:00:00.000Z",
  "uptime": 123.45,
  "memory": {...},
  "env": "development"
}
```

### Logs

```bash
# Backend logs (în terminal unde rulează npm run dev)
# Ar trebui să vezi:
🚀 Pornire server...
📊 Verificare conexiune bază de date...
✅ Conexiune la baza de date stabilită cu succes
🔌 Înregistrare plugin-uri...
💬 Inițializare Socket.IO...
🛣️  Înregistrare rute...
✅ Toate rutele au fost înregistrate cu succes
🌐 Pornire server HTTP...

✅ Server pornit cu succes!
🚀 HTTP: http://localhost:3001
💬 Socket.IO: ws://localhost:3001
🌍 CORS: http://localhost:3000
📊 Environment: development
```

## 🔒 Securitate

### Checklist Producție

- [ ] Schimbă `JWT_SECRET` cu o valoare sigură
- [ ] Actualizează `CORS_ORIGIN` cu URL-ul frontend-ului
- [ ] Setează `NODE_ENV=production`
- [ ] Folosește HTTPS
- [ ] Configurează rate limiting mai strict
- [ ] Activează logging în producție
- [ ] Backup regulat pentru baza de date
- [ ] Monitorizare și alerting

## 📝 Comenzi Utile

```bash
# Development
npm run dev                    # Pornește serverul
npm run start:check            # Generează Prisma + pornește

# Database
npm run prisma:studio          # GUI pentru DB
npm run prisma:migrate         # Rulează migrații
npm run prisma:generate        # Generează client
npm run prisma:seed            # Populează DB

# Docker
npm run docker:up              # Pornește PostgreSQL
npm run docker:down            # Oprește PostgreSQL
npm run docker:logs            # Vezi logs

# Build & Production
npm run build                  # Compilează TypeScript
npm start                      # Pornește din build

# Testing
npm test                       # Rulează teste
npm run test:watch             # Teste în watch mode
npm run test:coverage          # Coverage report
```

## 🆘 Suport

Pentru probleme sau întrebări:

1. Verifică [SETUP.md](./SETUP.md) pentru ghid detaliat
2. Verifică logs-urile pentru erori specifice
3. Verifică că toate serviciile rulează (Docker, PostgreSQL)
4. Verifică că toate variabilele de mediu sunt setate corect

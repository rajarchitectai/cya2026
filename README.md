# CYA Admin — Bank Account Monitoring & Alert System

Monitor linked bank accounts via Plaid and receive real-time SMS/email alerts when transactions match your configured rules.

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | MongoDB |
| Auth | JWT (Passport.js) |
| Banking | Plaid API |
| SMS | Twilio |
| Email | SendGrid |
| Worker | node-cron (integrated in backend) |
| Container | Docker + Docker Compose |

---

## Quick Start (Local)

### Prerequisites
- Docker + Docker Compose
- A [Plaid developer account](https://dashboard.plaid.com) (free sandbox)
- Twilio and SendGrid accounts (optional — alerts still save without them)

### 1. Clone and configure

```bash
cp .env.example .env
# Fill in your Plaid, Twilio, SendGrid credentials, and JWT_SECRET
```

### 2. Start with Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

### 3. Development mode (hot reload)

```bash
# Terminal 1 — backend with nodemon
cd backend && npm install && npm run dev

# Terminal 2 — frontend with Vite HMR
cd frontend && npm install && npm run dev
```

Frontend dev server: http://localhost:5173 (proxies `/api` to `localhost:5000`)

---

## Deployment

### Option A — Single VPS (cheapest, ~$6/month)
Any Hetzner/DigitalOcean/Linode VPS with Docker installed:

```bash
# Copy project, create .env, then:
docker compose up -d --build
```

Add Nginx reverse proxy + Let's Encrypt for HTTPS.

### Option B — Managed Cloud (free tiers)

| Service | Provider | Cost |
|---|---|---|
| Backend | [Railway](https://railway.app) or [Render](https://render.com) | Free tier |
| Frontend | [Vercel](https://vercel.com) or [Netlify](https://netlify.com) | Free |
| MongoDB | [MongoDB Atlas](https://www.mongodb.com/atlas) M0 cluster | Free |

For this setup, set `NODE_ENV=production` and update `FRONTEND_URL` and `MONGODB_URI` accordingly.

### Option C — Single container (backend serves frontend)

```bash
# Build frontend first
cd frontend && npm run build

# Set NODE_ENV=production in .env
# Backend will serve frontend/dist as static files
cd backend && node src/server.js
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET  | `/api/auth/me` | Get current user |

### Plaid / Accounts
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/plaid/link-token` | Create Plaid Link token |
| GET  | `/api/plaid/accounts` | List linked accounts |
| POST | `/api/plaid/accounts/add` | Link account (exchange public token) |
| DELETE | `/api/plaid/accounts/:id` | Unlink account |
| POST | `/api/plaid/accounts/:id/import` | Import 2-year transaction history |
| GET  | `/api/plaid/accounts/:id/transactions` | Get stored transactions |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET  | `/api/alerts` | List user's alerts |
| POST | `/api/alerts` | Create / update alert |
| PATCH | `/api/alerts/:id/toggle` | Enable / disable alert |
| DELETE | `/api/alerts/:id` | Delete alert |

---

## Alert Templates

When configuring alert messages, use these placeholders:

| Placeholder | Value |
|---|---|
| `<<Deposit Date>>` | Transaction date (YYYY-MM-DD) |
| `<<Deposit Amount>>` | Absolute transaction amount |
| `<<Deposit Description>>` | Merchant / transaction name |

Example SMS: `Alert: <<Deposit Description>> $<<Deposit Amount>> on <<Deposit Date>>`

---

## Environment Variables

See `.env.example` for all required variables. The minimum required to run are:

```
MONGODB_URI
JWT_SECRET
PLAID_CLIENT_ID
PLAID_SECRET
```

SMS and email notifications are skipped gracefully if Twilio/SendGrid credentials are absent.

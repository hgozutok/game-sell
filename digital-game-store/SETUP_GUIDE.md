# Digital Game Store - Complete Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (recommended)

### 1. Clone and Install

```bash
cd digital-game-store
npm install

cd ../storefront
npm install
```

### 2. Start Infrastructure

```bash
cd digital-game-store
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 3. Configure Environment

**Backend** (`digital-game-store/.env`):
```bash
cp .env.example .env
# Edit .env with your configuration
```

**Storefront** (`storefront/.env.local`):
```bash
cp .env.example .env.local
# Add your backend URL and publishable key
```

### 4. Run Database Migrations

```bash
cd digital-game-store
npm run db:migrate
```

### 5. Create Admin User

```bash
npx medusa user -e admin@example.com -p supersecret
```

### 6. Create Publishable API Key

1. Start the backend: `npm run dev`
2. Access Medusa Admin: `http://localhost:9000/app`
3. Go to Settings → Publishable API Keys
4. Create a new key for your storefront
5. Copy the key to `storefront/.env.local`

### 7. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd digital-game-store
npm run dev
```

**Terminal 2 - Storefront:**
```bash
cd storefront
npm run dev
```

**Terminal 3 - Worker (Optional for scheduled jobs):**
```bash
cd digital-game-store
npm run start:worker
```

## 🔧 Payment Provider Setup

### Stripe

1. Create account at https://stripe.com
2. Get API keys from Dashboard
3. Add to `.env`:
```bash
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
4. Configure webhook endpoint: `https://yourdomain.com/hooks/payment/stripe`

### PayPal

1. Create developer account at https://developer.paypal.com
2. Create app and get credentials
3. Add to `.env`:
```bash
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox
```

### Mollie

1. Create account at https://www.mollie.com
2. Get API key from dashboard
3. Add to `.env`:
```bash
MOLLIE_API_KEY=test_...
```

### Bank Transfer (UK)

1. Configure bank details in `src/modules/payment-providers/bank-transfer/index.ts`
2. Payment provider is enabled by default
3. Admin verifies payments via: `POST /admin/bank-transfer/verify`

## 📦 Product Import Setup

### CodesWholesale

1. Sign up at https://codeswholesale.com
2. Get API credentials
3. Add to `.env`:
```bash
CWS_CLIENT_ID=...
CWS_CLIENT_SECRET=...
```

### Kinguin

1. Sign up at https://www.kinguin.net
2. Get API key
3. Add to `.env`:
```bash
KINGUIN_API_KEY=...
```

### Import Products

```bash
POST /admin/products/import
{
  "provider": "codesWholesale",
  "search_query": "cyberpunk",
  "apply_margin": true,
  "category_id": "cat_123"
}
```

## 🎨 Customization

### 1. Set Pricing Rules

```bash
POST /admin/pricing-rules
{
  "category_name": "Action Games",
  "margin_percentage": 25,
  "priority": 10
}
```

### 2. Configure Store Settings

```bash
POST /admin/settings
{
  "key": "theme.header.logo",
  "value": "https://yourcdn.com/logo.png",
  "category": "theme"
}
```

### 3. Add Slider Items

```bash
POST /admin/slider
{
  "title": "Summer Sale",
  "subtitle": "Up to 80% off",
  "image_url": "https://yourcdn.com/banner.jpg",
  "link_url": "/deals",
  "button_text": "Shop Now",
  "order": 1
}
```

### 4. Configure Currencies

```bash
POST /admin/currency
{
  "code": "EUR",
  "is_default": false
}
```

## 🔄 Scheduled Jobs

The product sync job runs daily at 2 AM to update prices and availability.

To run manually:
```bash
# Via API
POST /admin/products/sync

# Via CLI (when worker is running)
# Job runs automatically based on cron schedule
```

## 🛠️ Admin Panel

### Using Medusa Admin

Access at: `http://localhost:9000/app`

Features:
- Product management
- Order management
- Customer management
- Pricing rules
- Store settings
- Slider management

### Custom Admin Dashboard (Optional)

Build a custom React admin dashboard:

```bash
cd admin-dashboard
npm create vite@latest . -- --template react-ts
npm install
```

Use the admin API endpoints to manage:
- `/admin/pricing-rules`
- `/admin/settings`
- `/admin/slider`
- `/admin/products/import`
- `/admin/currency`

## 📊 Monitoring

### Logs

**Backend logs:**
```bash
tail -f digital-game-store/logs/app.log
```

**Worker logs:**
```bash
tail -f digital-game-store/logs/worker.log
```

### Redis Queue (BullMQ)

Use RedisInsight or similar tool to monitor job queues:
- Connection: `localhost:6379`
- Queues: `product-sync`, `email-notifications`

### Database

```bash
psql -h localhost -U postgres -d medusa-store
```

## 🚀 Production Deployment

### 1. Build

```bash
# Backend
cd digital-game-store
npm run build

# Storefront
cd storefront
npm run build
```

### 2. Environment

Update `.env` with production values:
- Use production PostgreSQL/Redis
- Enable SSL
- Set secure JWT/Cookie secrets
- Configure production payment keys
- Set up CDN for images

### 3. Run

```bash
# Backend
npm run start

# Worker
npm run start:worker

# Storefront
npm run start
```

### 4. Reverse Proxy (Nginx)

```nginx
# Backend API
location /api {
    proxy_pass http://localhost:9000;
}

# Storefront
location / {
    proxy_pass http://localhost:3000;
}
```

### 5. SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🔐 Security Checklist

- [ ] Change default JWT_SECRET and COOKIE_SECRET
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable Stripe webhook signature verification
- [ ] Secure Redis with password
- [ ] Use PostgreSQL SSL connection
- [ ] Set up firewall rules
- [ ] Enable logging and monitoring
- [ ] Regular security updates

## 📞 Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@digitalgamestore.com

## 🎯 Next Steps

1. ✅ Complete setup steps above
2. ✅ Import test products
3. ✅ Configure payment providers
4. ✅ Test checkout flow
5. ✅ Set up product sync
6. ✅ Customize theme and branding
7. ✅ Deploy to production

---

**Happy Selling! 🎮**


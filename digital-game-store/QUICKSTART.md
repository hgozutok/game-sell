# Quick Start Guide

Get the Digital Game Store platform running locally in under 10 minutes.

## Prerequisites

- Node.js 20+
- Docker Desktop
- Git

## Step 1: Clone and Setup (2 minutes)

```bash
# Clone repository
git clone <repository-url>
cd digital-game-store

# Copy environment file
cp .env.example .env

# Install dependencies
npm install
```

## Step 2: Start Services (3 minutes)

```bash
# Start PostgreSQL and Redis with Docker
docker-compose up -d postgres redis

# Wait for services to be ready (about 30 seconds)
docker-compose ps
```

## Step 3: Setup Database (2 minutes)

```bash
# Run migrations
npm run db:migrate

# (Optional) Seed with sample data
npm run db:seed
```

## Step 4: Start Backend (1 minute)

```bash
# Start Medusa backend
npm run dev
```

Backend will be available at:
- **API**: http://localhost:9000
- **Admin Panel**: http://localhost:7001

## Step 5: Start Storefront (2 minutes)

In a new terminal:

```bash
cd storefront
npm install
cp .env.local.example .env.local
npm run dev
```

Storefront will be available at:
- **Storefront**: http://localhost:3000

## Step 6: Start Workers (Optional)

For key fulfillment processing:

```bash
npm run start:worker
```

---

## Verify Installation

### 1. Check API Health

```bash
curl http://localhost:9000/health
# Should return: {"status":"ok"}
```

### 2. Access Admin Panel

1. Open http://localhost:7001
2. Create admin user:
   ```bash
   npm run user -- --email admin@example.com --password supersecret
   ```
3. Login with credentials

### 3. Test Storefront

1. Open http://localhost:3000
2. Should see homepage with categories

---

## Quick Test: Create a Digital Product

### Via Admin API

```bash
# Create a product
curl -X POST http://localhost:9000/admin/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Game",
    "description": "A test digital game",
    "metadata": {
      "is_digital": true,
      "platform": "Steam",
      "region": "GLOBAL"
    }
  }'
```

### Import Digital Keys

```bash
curl -X POST http://localhost:9000/admin/digital-keys/bulk-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "keys": [
      {
        "key_code": "XXXXX-XXXXX-XXXXX",
        "product_id": "prod_01H...",
        "provider": "manual",
        "platform": "Steam",
        "region": "GLOBAL"
      }
    ]
  }'
```

---

## Common Issues

### Port Already in Use

```bash
# Check what's using the port
lsof -i :9000

# Kill the process or change port in .env
PORT=9001
```

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Redis Connection Error

```bash
# Check Redis
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
# Should return: PONG
```

### Module Not Found

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

1. **Configure External Services**
   - Set up Stripe API keys
   - Configure SendGrid for emails
   - Add CodesWholesale/Kinguin credentials

2. **Import Product Catalog**
   - Create products via Admin Panel
   - Import digital keys
   - Set up pricing

3. **Customize Storefront**
   - Edit components in `storefront/src/components`
   - Modify styles in `storefront/src/app/globals.css`
   - Add custom pages

4. **Test Complete Flow**
   - Browse products
   - Add to cart
   - Complete checkout
   - Receive keys

---

## Useful Commands

```bash
# Backend
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm test                 # Run tests
npm run db:migrate       # Run database migrations

# Storefront
cd storefront
npm run dev              # Start development
npm run build            # Build for production
npm run start            # Start production

# Docker
docker-compose up -d     # Start all services
docker-compose down      # Stop all services
docker-compose logs -f   # View logs
docker-compose restart   # Restart services
```

---

## Development Workflow

1. Make changes to code
2. Backend auto-reloads (watch mode)
3. Storefront auto-reloads (Fast Refresh)
4. Test changes locally
5. Run tests: `npm test`
6. Commit and push

---

## Documentation

- [Full README](./README.md)
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Email Templates](./docs/EMAIL_TEMPLATES.md)

---

## Support

- **Issues**: Open a GitHub issue
- **Questions**: Check documentation
- **Community**: Join our Discord

---

## Production Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET and COOKIE_SECRET
- [ ] Configure production database
- [ ] Set up Redis in production
- [ ] Add real Stripe API keys
- [ ] Configure SendGrid with production credentials
- [ ] Add CodesWholesale/Kinguin production API keys
- [ ] Enable HTTPS/SSL
- [ ] Set up monitoring and alerting
- [ ] Configure backups
- [ ] Load test the system
- [ ] Run security audit

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for complete production setup.


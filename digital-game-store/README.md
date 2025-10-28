# Digital Game Key E-Commerce Platform

A scalable e-commerce platform built with Medusa JS for selling digital game keys. Supports automated key procurement from CodesWholesale and Kinguin APIs with instant delivery.

## Features

- 🎮 Digital game key management and distribution
- 🔄 Automated key procurement from multiple providers (CodesWholesale, Kinguin)
- 📦 BullMQ-powered queue system for handling 100K+ orders
- 📧 Instant email delivery of game keys
- 🛒 Full e-commerce functionality with cart, checkout, and payments
- 📊 Admin dashboard for inventory and order management
- 🔐 Secure key storage and delivery
- 🚀 Horizontally scalable architecture

## Tech Stack

### Backend
- **Medusa v2.11.1** - E-commerce framework
- **PostgreSQL** - Primary database
- **Redis** - Caching, sessions, and queue storage
- **BullMQ** - Job queue processing
- **Node.js 20+** - Runtime

### Frontend
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - Server state management

### External Services
- **CodesWholesale API** - Primary key supplier
- **Kinguin API** - Fallback key supplier
- **SendGrid** - Email delivery
- **Stripe** - Payment processing

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd digital-game-store
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with:
   - Database credentials
   - Redis URL
   - Stripe API keys
   - SendGrid API key
   - CodesWholesale credentials
   - Kinguin API key

4. Start services with Docker Compose:
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
npm run db:migrate
```

6. Start the development server:
```bash
npm run dev
```

The backend will be available at:
- **API**: http://localhost:9000
- **Admin Panel**: http://localhost:7001

### Starting BullMQ Workers

Workers are automatically started with Docker Compose. For manual start:

```bash
npm run start:worker
```

## Project Structure

```
digital-game-store/
├── src/
│   ├── modules/
│   │   ├── key-inventory/          # Digital key management module
│   │   ├── key-provider-codesWholesale/  # CodesWholesale integration
│   │   └── key-provider-kinguin/   # Kinguin integration
│   ├── workflows/
│   │   └── fulfill-digital-order.ts # Order fulfillment workflow
│   ├── subscribers/
│   │   └── order-placed.ts         # Order event handler
│   ├── jobs/
│   │   └── worker.ts               # BullMQ workers
│   └── api/
│       ├── admin/
│       │   └── digital-keys/       # Admin key management endpoints
│       └── store/
│           ├── customers/          # Customer key retrieval
│           └── orders/             # Order key endpoints
├── medusa-config.ts                # Medusa configuration
├── docker-compose.yml              # Docker services
└── package.json
```

## API Endpoints

### Admin Endpoints

- `GET /admin/digital-keys` - List all digital keys
- `POST /admin/digital-keys/bulk-import` - Bulk import keys
- `GET /admin/digital-keys/:id` - Get specific key
- `POST /admin/digital-keys/:id` - Update key
- `DELETE /admin/digital-keys/:id` - Revoke key

### Store Endpoints

- `GET /store/customers/me/digital-keys` - Get customer's keys
- `GET /store/orders/:id/digital-keys` - Get keys for an order

## Workflows

### Order Fulfillment Flow

1. Customer places order for digital products
2. `order.placed` event triggers subscriber
3. Workflow attempts to assign keys from inventory
4. If insufficient inventory, fetches keys from providers:
   - Try CodesWholesale first
   - Fallback to Kinguin if CodesWholesale fails
5. Keys are assigned to order and customer
6. Email sent with game keys
7. Keys marked as delivered

## Scaling

### Database
- Use PostgreSQL read replicas for product queries
- Connection pooling (50-100 connections)
- Proper indexing on key status, product_id, order_id

### Redis
- Product catalog cache (1 hour TTL)
- Session cache (24 hour TTL)
- Inventory counts (5 minute TTL)

### Workers
- Run 10-20 workers in development
- Scale to 50+ workers in production
- Rate limiting: 100 jobs/second

### Load Balancing
- Multiple Medusa instances behind load balancer
- Separate worker pool from API servers
- CDN for static assets

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Load testing
artillery run load-test-config.yml
```

## Deployment

See deployment documentation in `/docs/deployment.md` for production setup with:
- AWS ECS/Fargate
- RDS PostgreSQL
- ElastiCache Redis
- CloudFront CDN
- Load Balancer configuration

## Monitoring

Recommended monitoring stack:
- **Logs**: CloudWatch / Datadog
- **Metrics**: Prometheus + Grafana
- **APM**: New Relic / Datadog APM
- **Error Tracking**: Sentry

## License

MIT

## Support

For issues and questions, please open a GitHub issue.


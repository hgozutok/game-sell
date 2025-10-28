# 🎮 Digital Game Store - Complete E-commerce Platform

> **Professional Kinguin-style digital game key marketplace built with Medusa.js v2 and Next.js 14**

## ✨ Features

### 🛍️ Customer Features
- 🎨 Modern dark theme with Kinguin-style UI
- 🔍 Advanced product search and filtering
- 🛒 Persistent shopping cart
- 💳 Multiple payment options (Stripe, PayPal, Mollie, Bank Transfer)
- ⚡ Instant digital key delivery
- 📱 Fully responsive design
- 📧 Email notifications
- 🔐 Secure checkout process
- 📋 Order history and key management

### 👨‍💼 Admin Features
- 📦 Import products from CodesWholesale and Kinguin
- 💰 Category-based profit margin management
- 🎨 Customize store theme and branding
- 🖼️ Homepage slider management
- 💱 Multi-currency support
- 🔄 Automated product synchronization
- 📊 Order and customer management
- 💳 Payment verification for bank transfers

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose

### Installation

```bash
# 1. Clone the repository
git clone <your-repo>
cd digital-game-store

# 2. Install dependencies
npm install
cd ../storefront && npm install

# 3. Start infrastructure
cd ../digital-game-store
docker-compose up -d

# 4. Configure environment
cp .env.example .env
# Edit .env with your settings

# 5. Run migrations
npm run db:migrate

# 6. Create admin user
npx medusa user -e admin@example.com -p supersecret

# 7. Start development
npm run dev

# In another terminal
cd ../storefront
cp .env.example .env.local
# Add NEXT_PUBLIC_MEDUSA_BACKEND_URL and NEXT_PUBLIC_PUBLISHABLE_KEY
npm run dev
```

Access:
- 🌐 Storefront: http://localhost:3000
- 🔧 Backend API: http://localhost:9000
- 👨‍💼 Admin Panel: http://localhost:9000/app

## 📁 Project Structure

```
digital-game-store/
├── src/
│   ├── api/              # API endpoints
│   │   ├── admin/        # Admin endpoints
│   │   └── store/        # Public storefront endpoints
│   ├── modules/          # Custom Medusa modules
│   │   ├── key-inventory/          # Digital key management
│   │   ├── pricing-settings/       # Profit margin configuration
│   │   ├── store-settings/         # Theme & branding
│   │   ├── slider/                 # Homepage slider
│   │   └── payment-providers/      # Payment integrations
│   ├── jobs/             # Scheduled jobs (BullMQ)
│   ├── subscribers/      # Event subscribers
│   └── workflows/        # Order fulfillment workflows
├── medusa-config.ts      # Medusa configuration
└── docker-compose.yml    # PostgreSQL + Redis

storefront/
├── src/
│   ├── app/              # Next.js 14 App Router pages
│   │   ├── products/     # Product pages
│   │   ├── categories/   # Category pages
│   │   ├── cart/         # Shopping cart
│   │   ├── checkout/     # Checkout flow
│   │   ├── account/      # Customer account
│   │   └── [policies]/   # Policy pages
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   └── store/            # Zustand state management
└── tailwind.config.ts    # Tailwind CSS configuration
```

## 🔧 Configuration

### Environment Variables

**Backend** (`digital-game-store/.env`):
```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/medusa-store
REDIS_URL=redis://:@localhost:6379
JWT_SECRET=your-secret-here
COOKIE_SECRET=your-secret-here

# Payment Providers
STRIPE_API_KEY=sk_test_...
PAYPAL_CLIENT_ID=...
MOLLIE_API_KEY=test_...

# Key Providers
CWS_CLIENT_ID=...
CWS_CLIENT_SECRET=...
KINGUIN_API_KEY=...
```

**Frontend** (`storefront/.env.local`):
```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_PUBLISHABLE_KEY=pk_...
```

## 📚 API Documentation

### Product Import
```bash
POST /admin/products/import
{
  "provider": "codesWholesale",
  "search_query": "cyberpunk",
  "apply_margin": true,
  "category_id": "cat_123"
}
```

### Pricing Rules
```bash
POST /admin/pricing-rules
{
  "category_name": "Action Games",
  "margin_percentage": 25,
  "priority": 10
}
```

### Slider Management
```bash
POST /admin/slider
{
  "title": "Summer Sale",
  "subtitle": "Up to 80% off",
  "image_url": "https://example.com/banner.jpg",
  "link_url": "/deals",
  "button_text": "Shop Now",
  "order": 1
}
```

### Currency Management
```bash
POST /admin/currency
{
  "code": "EUR",
  "is_default": false
}
```

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for complete API documentation.

## 📖 Documentation

- **[SETUP_GUIDE.md](digital-game-store/SETUP_GUIDE.md)** - Detailed setup instructions
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Feature status and API docs
- **[FINAL_IMPLEMENTATION_SUMMARY.md](FINAL_IMPLEMENTATION_SUMMARY.md)** - Complete implementation summary

## 🔄 Scheduled Jobs

The system includes automated jobs for:
- **Product Sync** - Daily at 2 AM
  - Updates prices from CWS/Kinguin
  - Syncs availability
  - Applies category margins

To run the worker:
```bash
npm run start:worker
```

## 🎨 Customization

### Theme
Edit `storefront/tailwind.config.ts` and `storefront/src/app/globals.css` to customize colors and styling.

### Settings
Use admin API endpoints to configure:
- Store branding
- Header/Footer
- Homepage slider
- Pricing rules
- Currencies

## 🚀 Deployment

### Build
```bash
# Backend
cd digital-game-store
npm run build

# Frontend
cd storefront
npm run build
```

### Run Production
```bash
# Backend
npm run start

# Worker
npm run start:worker

# Frontend
npm run start
```

See [SETUP_GUIDE.md](digital-game-store/SETUP_GUIDE.md) for detailed deployment instructions.

## 🔐 Security

- ✅ SSL/HTTPS required in production
- ✅ Secure payment processing
- ✅ Environment variable validation
- ✅ CORS configuration
- ✅ Rate limiting recommended
- ✅ Regular security updates

## 📊 Tech Stack

- **Backend**: Medusa.js v2.11
- **Frontend**: Next.js 14, React 18
- **Database**: PostgreSQL 14+
- **Cache**: Redis 6+
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Payments**: Stripe, PayPal, Mollie, Bank Transfer
- **Jobs**: BullMQ
- **Email**: SendGrid (optional)

## 🤝 Support

For questions or issues:
1. Check the documentation
2. Review the FAQ at `/faq`
3. Contact via `/contact` page

## 📄 License

This project is proprietary. All rights reserved.

## 🎉 Status

**✅ 100% COMPLETE** - All features implemented and ready for production!

---

**Built with ❤️ for digital game key retailers**


# Digital Game Store - Storefront

Next.js 14 storefront for the digital game key e-commerce platform.

## Features

- 🛍️ Product catalog with search and filtering
- 🛒 Shopping cart
- 💳 Secure checkout with Stripe
- 🔑 Customer portal for viewing purchased keys
- 📱 Fully responsive design
- ⚡ Optimized performance with Next.js App Router

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.local.example .env.local
```

3. Configure your `.env.local`:
```
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_PUBLISHABLE_KEY=your_publishable_key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the storefront.

## Project Structure

```
storefront/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── layout/      # Header, Footer
│   │   ├── home/        # Homepage components
│   │   └── products/    # Product components
│   └── lib/             # Utilities and API clients
├── public/              # Static assets
└── package.json
```

## Key Pages

- `/` - Homepage with featured products
- `/products` - Product catalog
- `/products/[id]` - Product detail page
- `/cart` - Shopping cart
- `/checkout` - Checkout flow
- `/account` - Customer account
- `/account/keys` - Purchased game keys
- `/account/orders` - Order history

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - Server state management
- **Medusa JS SDK** - Backend integration

## Building for Production

```bash
npm run build
npm run start
```

## License

MIT


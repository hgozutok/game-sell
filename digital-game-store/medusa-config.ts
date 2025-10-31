import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/medusa-store",
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000,http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:7001,http://localhost:7000,http://localhost:3000,http://localhost:8000",
      authCors: process.env.AUTH_CORS || "http://localhost:7001,http://localhost:7000,http://localhost:3000,http://localhost:8000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    workerMode: process.env.WORKER_MODE === "server" ? "server" : "shared",
  },
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  },
  modules: {
    cache: {
      resolve: "@medusajs/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL || "redis://:@localhost:6379",
        ttl: 30,
      },
    },
    eventBus: {
      resolve: "@medusajs/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL || "redis://:@localhost:6379",
      },
    },
    pricingSettings: {
      resolve: "./src/modules/pricing-settings",
    },
    storeSettings: {
      resolve: "./src/modules/store-settings",
    },
    slider: {
      resolve: "./src/modules/slider",
    },
    codesWholesale: {
      resolve: "./src/modules/key-provider-codesWholesale",
    },
    kinguin: {
      resolve: "./src/modules/key-provider-kinguin",
    },
    keyInventory: {
      resolve: "./src/modules/key-inventory",
    },
    backgroundJobs: {
      resolve: "./src/modules/background-jobs",
    },
    userPreferences: {
      resolve: "./src/modules/user-preferences",
    },
    paypalPayment: {
      resolve: "./src/modules/payment-providers/paypal",
      options: {
        api_key: process.env.PAYPAL_CLIENT_ID,
        api_secret: process.env.PAYPAL_CLIENT_SECRET,
        sandbox: process.env.PAYPAL_SANDBOX === "true",
      },
    },
    molliePayment: {
      resolve: "./src/modules/payment-providers/mollie",
      options: {
        api_key: process.env.MOLLIE_API_KEY,
      },
    },
    bankTransferPayment: {
      resolve: "./src/modules/payment-providers/bank-transfer",
      options: {},
    },
  },
})

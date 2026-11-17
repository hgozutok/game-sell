import { defineConfig } from "@medusajs/framework/utils"
import path from "path"
import fs from "fs"

// Admin eklentileri @tanstack/react-query'yi kokteki surumden cozuyor; dashboard ise
// kendi kopyasini kullaniyor. Iki ayri modul olunca QueryClientProvider context'i
// bulunamiyor ve eklenti sayfalari "No QueryClient set" hatasiyla cokuyor.
// Cozum: her iki tarafi dashboard'in kopyasina yonlendir.
const dashboardReactQuery = path.resolve(
  process.cwd(),
  "node_modules/@medusajs/dashboard/node_modules/@tanstack/react-query"
)

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/medusa-store",
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000,http://localhost:8000,http://localhost:13000,http://localhost:13100,https://hupiplay.uk,https://www.hupiplay.uk",
      adminCors: process.env.ADMIN_CORS || "http://localhost:7001,http://localhost:7000,http://localhost:3000,http://localhost:8000,http://localhost:13000,http://localhost:13100,https://hupiplay.uk,https://www.hupiplay.uk",
      authCors: process.env.AUTH_CORS || "http://localhost:7001,http://localhost:7000,http://localhost:3000,http://localhost:8000,http://localhost:13000,http://localhost:13100,https://hupiplay.uk,https://www.hupiplay.uk",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    workerMode: process.env.WORKER_MODE === "server" ? "server" : process.env.WORKER_MODE === "worker" ? "worker" : "shared",
    // Production modda cookie secure=true gelir (HTTPS zorunlu); lokal HTTP'de
    // admin login loop'a dusmemesi icin acikca kapatilir.
    ...(process.env.NODE_ENV !== "production"
      ? {}
      : { cookieOptions: { secure: false, sameSite: "lax" } }),
  },
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
    // Medusa hook'un dondurdugu config'i mergeConfig(base, custom) ile birlestirir;
    // ayni obje donderilirse plugins dizisi kopyalanir ve react() iki kez eklenir ->
    // admin dev'de "inWebWorker has already been declared" hatasi. Sadece delta dondur.
    vite: (config) => {
      if (!fs.existsSync(dashboardReactQuery)) {
        return {}
      }
      return {
        resolve: {
          alias: {
            ...((config.resolve?.alias ?? {}) as Record<string, string>),
            "@tanstack/react-query": dashboardReactQuery,
          },
        },
      }
    },
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
    workflows: {
      resolve: "@medusajs/workflow-engine-redis",
      options: {
        redis: {
          url: process.env.REDIS_URL || "redis://:@localhost:6379",
        },
      },
    },
    notification: {
      resolve: "@medusajs/notification",
      options: {
        providers: [
          ...(process.env.SENDGRID_API_KEY
            ? [
                {
                  resolve: "@medusajs/notification-sendgrid",
                  id: "sendgrid",
                  options: {
                    api_key: process.env.SENDGRID_API_KEY,
                    from: process.env.SENDGRID_FROM_EMAIL || "orders@example.com",
                  },
                },
              ]
            : []),
          {
            // Dev fallback: maili loga yazar, akis calisir
            resolve: "./src/modules/notification-logger",
            id: "logger",
          },
        ],
      },
    },
    fulfillment: {
      resolve: "@medusajs/fulfillment",
      options: {
        providers: [
          {
            // Dijital teslimat — fiziksel kargo yok (ana sayfadan indirilen key)
            resolve: "./src/modules/fulfillment-digital",
            id: "digital",
          },
        ],
      },
    },
    payment: {
      resolve: "@medusajs/payment",
      options: {
        providers: [
          // Stripe anahtari yoksa provider yuklenmez (dev); eklendiginde otomatik aktif olur.
          ...(process.env.STRIPE_API_KEY
            ? [
                {
                  resolve: "@medusajs/payment-stripe",
                  id: "stripe",
                  options: {
                    api_key: process.env.STRIPE_API_KEY,
                    webhooks: {
                      secret: process.env.STRIPE_WEBHOOK_SECRET,
                    },
                  },
                },
              ]
            : []),
          {
            resolve: "./src/modules/payment-providers/paypal",
            id: "paypal",
          },
          {
            resolve: "./src/modules/payment-providers/mollie",
            id: "mollie",
          },
          {
            resolve: "./src/modules/payment-providers/bank-transfer",
            id: "bank-transfer",
          },
        ],
      },
    },
    pricingSettings: {
      resolve: "./src/modules/pricing-settings",
    },
    storeSettings: {
      resolve: "./src/modules/store-settings",
    },
    emailTemplate: {
      resolve: "./src/modules/email-template",
    },
    slider: {
      resolve: "./src/modules/slider",
    },
    codesWholesale: {
      resolve: "./src/modules/key-provider-codesWholesale",
    },
    kinguin: {
      resolve: "./src/modules/kinguin",
    },
    keyProviderKinguin: {
      resolve: "./src/modules/key-provider-kinguin",
    },
    auditLog: {
      resolve: "./src/modules/audit-log",
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
  },
})

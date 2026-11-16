# Uretim Docker imaji — multi-stage.
# Yerelde dogrulanan akis: npm run build (tsc + medusa build + admin sync)
# -> `medusa start` proje kokunden dist/ + public/admin servis eder.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# medusa build admin bundle'ini dist/public/admin altina yazar;
# sync-admin-public.js bunu public/admin'e tasir (medusa start /app yolunu
# public/admin uzerinden servis eder).
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# medusa start medusa-config.ts'i okur ve dist/ + node_modules kullanir
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY medusa-config.ts package.json tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

# Konteyner baslarken migration'lari uygula, publishable key garantiye al,
# sonra sunucuyu kaldir. (db hazir olsun diye compose healthcheck'e bagli)
CMD ["sh", "-c", "npx medusa db:migrate --execute-safe-links && (npx medusa exec ./scripts/ensure-publishable-key.ts || true) && npx medusa start"]

EXPOSE 9000

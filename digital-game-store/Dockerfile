# Uretim Docker imaji — multi-stage.
# Yerelde dogrulanan akis: npm run build (tsc + medusa build + admin sync)
# -> `medusa start` proje kokunden dist/ + public/admin servis eder.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Admin paneli api adresini BUILD zamaninda bundle'a gomulur (medusa-config.ts
# admin.backendUrl). Calisma aninda degistirilemez; bu yüzden compose'dan
# arg olarak aktarilir (https://api.hupiplay.uk gibi).
ARG MEDUSA_BACKEND_URL=http://localhost:9000
ENV MEDUSA_BACKEND_URL=${MEDUSA_BACKEND_URL}
# medusa build admin bundle'ini dist/public/admin altina yazar;
# sync-admin-public.js bunu public/admin'e tasir (medusa start /app yolunu
# public/admin uzerinden servis eder).
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# medusa start medusa-config.ts'i okur ve dist/ + node_modules kullanir
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY medusa-config.ts package.json tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
# Yuklenen statik dosyalar (logo vb.) /static yolundan servis edilir;
# bu klasor imaja girmezse magaza logosu VPS'te 404 doner.
COPY static ./static

# Konteyner baslarken migration'lari uygula, publishable key garantiye al,
# sonra sunucuyu kaldir. (db hazir olsun diye compose healthcheck'e bagli)
CMD ["sh", "-c", "npx medusa db:migrate --execute-safe-links && (npx medusa exec ./scripts/ensure-publishable-key.ts || true) && npx medusa start"]

EXPOSE 9000

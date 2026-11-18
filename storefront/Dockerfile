# Uretim Docker imaji — Next.js standalone output.
# NEXT_PUBLIC_* degerleri BUILD zamaninda client bundle'ina islenir:
#   docker build --build-arg NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.example.com ...
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Tarayicinin baglanacagi backend adresi ve publishable key (build-time)
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
ARG NEXT_PUBLIC_PUBLISHABLE_KEY=
# Kanonik/sitemap adresi; .env.local gibi dosyalara bagimli kalmasin
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_PUBLISHABLE_KEY=$NEXT_PUBLIC_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Sunucu tarafindan okunan degisken (runtime): SSR istekleri backend'e
# konteyner adiyla gider; tarayici bundle'i build-arg'daki adresi kullanir.
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://backend:9000

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Build sirasinda olusan fetch cache'i (backend'e erisilemeyen build ortamindan
# gelen bos degerler) runtime'a tasinmasin
RUN rm -rf .next/cache/fetch-cache

CMD ["node", "server.js"]

EXPOSE 3000

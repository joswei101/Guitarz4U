# Production image for Guitarz4U (Next.js standalone-free, simple and robust)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate && npx next build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 1001 app && mkdir -p /app/storage && chown app /app/storage
COPY --from=build --chown=app /app ./
USER app
EXPOSE 3000
# Apply pending migrations, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -p 3000"]

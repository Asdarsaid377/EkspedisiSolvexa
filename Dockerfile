# syntax=docker/dockerfile:1

# Alpine (musl libc) dipakai utk stage runtime saja — SWC (native binary
# Next.js) gagal load di Alpine/ARM64 (symbol relocation error), jadi
# stage deps & builder pakai Debian slim (glibc) yang stabil untuk build.

# ── Stage 1: dependencies ──────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build ──────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* di-inline ke bundle client SAAT BUILD, bukan runtime —
# harus diteruskan sebagai build arg (mis. --build-arg
# NEXT_PUBLIC_SUPABASE_URL=...) kalau nilainya beda dari default.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_WA_TOKO
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_WA_TOKO=$NEXT_PUBLIC_WA_TOKO \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3007 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# next.config.js pakai output: "standalone" — hanya file yang
# dibutuhkan runtime yang di-copy, bukan node_modules penuh.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3007

# SUPABASE_SERVICE_ROLE_KEY & ANTHROPIC_API_KEY sengaja TIDAK di-bake di
# sini — pass sebagai runtime env (docker run -e / docker-compose
# environment) supaya secret tidak ikut ke dalam image/layer cache.
CMD ["node", "server.js"]

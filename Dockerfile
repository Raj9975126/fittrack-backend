# Multi-stage Dockerfile
# Managed by Raj (DevOps & Backend Lead)

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["npm", "start"]

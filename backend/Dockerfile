FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache cairo jpeg pango giflib

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

RUN mkdir -p uploads/documents uploads/temp uploads/exports logs

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npx ts-node prisma/seed.ts || true && node dist/main"]

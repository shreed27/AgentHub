FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production image, copy all the files and run next
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Set permissions for data directory
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Set user
USER nextjs

EXPOSE 4000
ENV PORT=4000

CMD ["npx", "tsx", "src/index.ts"]

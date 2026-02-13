# Production image, copy all the files and run next
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production

# Copy dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 4001
ENV PORT=4001

CMD ["npx", "tsx", "src/server.ts"]

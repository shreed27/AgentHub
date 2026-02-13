# Production image, copy all the files and run next
FROM node:22 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV CLODDS_STATE_DIR=/data
ENV CLODDS_WORKSPACE=/data/workspace

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Copy dependencies
COPY package.json ./
# Force fresh install to avoid cross-platform lockfile issues
RUN npm install --omit=dev

# Copy source code
COPY . .

# Setup directories
RUN mkdir -p /data /data/workspace \
  && chown -R node:node /data

USER node

EXPOSE 18789
ENV PORT=18789

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:18789/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npx", "tsx", "src/index.ts"]

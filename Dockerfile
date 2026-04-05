# Stage 1: Build frontend with Vite
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies (including native modules like better-sqlite3)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy backend source files
COPY server.js auth.js platforms.js scheduler.js engagement-engine.js ai-media.js db.js ./
COPY video/ ./video/

# Create data directories
RUN mkdir -p uploads output data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]

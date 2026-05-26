# Build stage for React/Vite frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files (make lockfile optional with *)
COPY package.json ./
COPY package-lock.json* ./

# Copy source files needed for the build
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY client/ ./client/
COPY shared/ ./shared/
COPY attached_assets/ ./attached_assets/
COPY postcss.config.cjs ./postcss.config.cjs
COPY postcss.config.js ./postcss.config.js

# Install dependencies
RUN npm ci

# Build the static site
RUN npm run build

# Production runtime stage
FROM node:20-alpine
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy static site artifacts from builder
COPY --from=builder /app/dist/public ./public

# Copy static server
COPY server.js ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]


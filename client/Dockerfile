# Build stage for React/Vite frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files (make lockfile optional with *)
COPY package.json ./
COPY package-lock.json* ./

# Copy client directory
COPY client/ ./client/

# Install dependencies (make lockfile optional)
RUN npm ci 2>/dev/null || npm install

# Build the client
WORKDIR /app/client
RUN npm run build

# Production runtime stage
FROM node:20-alpine
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy server file for static file serving
COPY server.js ./

# Copy built frontend from builder
COPY --from=builder /app/client/dist ./client/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "server.js"]

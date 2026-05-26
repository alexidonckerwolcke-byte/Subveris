###
# Multi-stage Dockerfile
# - Frontend stage: build the Vite frontend located in `client/` (output normalized to `dist/public`).
# - Backend stage: build the TypeScript backend located in `server/` (assumes `npm run build` outputs `dist`).
# - Runtime stage: install production deps for the server and run the compiled server, serving static files from `public/`.
###

FROM node:20-alpine AS frontend-builder
WORKDIR /app/client

# Install frontend dependencies (make lockfile optional)
COPY client/package.json ./
COPY client/package-lock.json* ./

# Copy frontend sources
COPY client/ ./

# Build frontend and normalize output to `dist/public` so runtime stage can always copy `public/`.
RUN npm ci --silent && \
    npm run build && \
    if [ -d dist ] && [ ! -d dist/public ]; then mkdir -p dist/public && cp -R dist/* dist/public/ || true; fi


FROM node:20-alpine AS backend-builder
WORKDIR /app/server

# Copy server package files (lockfile optional) and source
COPY server/package.json ./
COPY server/package-lock.json* ./
COPY server/ ./

# Install server deps and build TypeScript server (expects `npm run build` to produce `dist`)
RUN npm ci --silent && npm run build


FROM node:20-alpine AS runtime
WORKDIR /app

# Small tools for proper signal handling and healthchecks
RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=3000
ENV SERVER_ENTRY=server/dist/index.js

# Copy built frontend -> runtime `./public`
COPY --from=frontend-builder /app/client/dist/public ./public

# Copy built backend artifacts
COPY --from=backend-builder /app/server/dist ./server/dist

# Copy server package files so we can install production deps in runtime
COPY server/package.json server/package-lock.json* ./server/  

# Install only production dependencies for the server (immutable, repeatable)
RUN cd server && npm ci --omit=dev --silent || true

# Expose port
EXPOSE 3000

# Simple healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
# Default command runs the compiled server entry. Override with a different command if needed.
CMD ["node", "server/dist/index.js"]


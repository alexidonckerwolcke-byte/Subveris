# syntax=docker/dockerfile:1

# Builder stage: install dependencies and build the Vite client.
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package metadata and install all dependencies for the build.
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the full repo and build the client.
COPY . ./
RUN npm run build && \
    rm -rf /app/public && \
    mv /app/dist/public /app/public && \
    npm prune --production


# Runtime stage: use the built static assets and the root server.
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]


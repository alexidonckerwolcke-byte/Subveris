# Dockerfile for server application
# multi-stage build: compile TypeScript then run

FROM node:20-alpine AS builder
WORKDIR /app

# copy only package files to leverage cache
COPY package.json package-lock.json tsconfig.json .
COPY server/package.json server/package-lock.json ./server/

# install dependencies (including dev for build)
RUN npm ci

# copy source
COPY . .

# build output (script/build.ts should compile to dist)
RUN npm run build

# -------------------------
FROM node:20-alpine AS runner
WORKDIR /app

# only keep production deps
COPY package.json package-lock.json .
RUN npm ci --omit=dev

# copy built files and needed assets
COPY --from=builder /app/dist ./dist

# expose port
ENV PORT=5000
EXPOSE 5000

# default command
CMD ["node", "dist/index.cjs"]

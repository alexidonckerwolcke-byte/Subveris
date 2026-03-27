# Dockerfile for frontend client
FROM node:20-alpine AS build
WORKDIR /app
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
# copy custom nginx config if needed
# EXPOSE default port 80

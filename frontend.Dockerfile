# ---- Build stage ----
FROM node:20-alpine AS build

ARG APP_URL=http://localhost

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY angular.json tsconfig.json tsconfig.app.json ./
COPY src/ ./src/
COPY public/ ./public/

# Bake production redirect URI into the Angular build
RUN sed -i "s|https://your-production-domain.com|${APP_URL}|g" src/environments/environment.prod.ts

RUN npx ng build --configuration production

# ---- Serve stage ----
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ng-tailadmin/browser /usr/share/nginx/html

EXPOSE 80

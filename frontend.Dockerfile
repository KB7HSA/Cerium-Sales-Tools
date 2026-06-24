# ---- Build stage ----
FROM node:20-alpine AS build

ARG APP_URL=http://localhost
ARG AZURE_AD_CLIENT_ID
ARG AZURE_AD_TENANT_ID

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY angular.json tsconfig.json tsconfig.app.json .postcssrc.json ./
COPY deploy/write-frontend-env.mjs ./deploy/write-frontend-env.mjs
COPY src/ ./src/
COPY public/ ./public/

# Bake APP_URL + Azure AD settings into the Angular production environment
ENV APP_URL=${APP_URL}
ENV AZURE_AD_CLIENT_ID=${AZURE_AD_CLIENT_ID}
ENV AZURE_AD_TENANT_ID=${AZURE_AD_TENANT_ID}
RUN node deploy/write-frontend-env.mjs src/environments/environment.prod.ts

RUN npx ng build --configuration production

# ---- Serve stage ----
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ng-tailadmin/browser /usr/share/nginx/html

EXPOSE 80

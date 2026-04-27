# syntax=docker/dockerfile:1
# Targets: `api` (Express), `web` (nginx + Vite static assets).
# From repo root: docker compose up --build

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS api-builder
COPY tsconfig.json ./
COPY server ./server
RUN npm run api:build

FROM node:22-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=api-builder /app/api-dist/index.mjs ./api-dist/index.mjs
EXPOSE 8787
CMD ["node", "api-dist/index.mjs"]

FROM deps AS web-builder
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_AUTH_SITE_URL
ARG VITE_API_BASE_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY \
    VITE_AUTH_SITE_URL=$VITE_AUTH_SITE_URL \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
RUN npm run build

FROM nginx:1.27-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

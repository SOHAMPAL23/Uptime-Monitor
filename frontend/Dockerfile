# ── Frontend (React + Vite) ──────────────────────────────────────────────────
# Stage 1: build the static bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build          # outputs to /app/dist


# Stage 2: serve with nginx
FROM nginx:1.27-alpine

# Custom nginx config that also proxies /urls and /health-checks to the backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

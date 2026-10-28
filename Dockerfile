# ============================================================
# Stage 1: Build frontend (Vite + React)
# ============================================================
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend

# Instal dependensi terlebih dahulu agar layer cache efektif.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# VITE_API_BASE_URL dibake ke bundle saat build.
# "/api" aman karena backend Go menyajikan frontend statis juga
# (semua request dari origin yang sama, tidak perlu CORS).
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2: Build backend (Go)
# ============================================================
FROM golang:1.27-alpine AS backend-build
WORKDIR /app/backend

# Download dependensi terlebih dahulu agar layer cache efektif.
COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/main

# ============================================================
# Stage 3: Image final (ringan, hanya berisi binary + aset)
# ============================================================
FROM alpine:3.20
RUN adduser -D -u 1001 appuser

WORKDIR /app
COPY --from=backend-build /app/server ./server
COPY --from=backend-build /app/backend/migrations ./migrations
COPY --from=frontend-build /app/frontend/dist ./public

USER appuser

ENV APP_PORT=8080
ENV STATIC_DIR=/app/public

EXPOSE 8080
CMD ["./server"]

# Build stage
FROM node:22-alpine AS builder

# Thư mục làm việc trong container
WORKDIR /app

# Copy package files trước để cache layer
COPY package*.json ./

# Cài đặt tất cả dependencies (bao gồm dev để build)
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy toàn bộ source vào container
COPY . .

# Build NestJS project
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Port mà app sẽ chạy (NestJS mặc định là 8080)
EXPOSE 8080

# Lệnh khởi động app ở chế độ production
CMD ["npm", "run", "start:prod"] 
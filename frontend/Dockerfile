# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage — lightweight nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Replace default nginx config with our SPA + API proxy config
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# Stage 1: Build Frontend (Node.js)
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Build Backend (PHP & Composer)
FROM composer:2 AS composer-builder
WORKDIR /app
COPY composer*.json ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --ignore-platform-reqs
COPY . .
RUN composer dump-autoload --optimize

# Stage 3: Final Production Image
FROM php:8.3-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    postgresql-dev \
    libpng-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    icu-dev

# Install PHP extensions required by Laravel & Excel
RUN docker-php-ext-install pdo_pgsql pgsql gd zip intl

# Configure Nginx
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Set working directory
WORKDIR /var/www/html

# Copy application from builders
COPY --from=composer-builder --chown=www-data:www-data /app /var/www/html
COPY --from=frontend-builder --chown=www-data:www-data /app/public/build /var/www/html/public/build

# Setup permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Copy entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Environment variables for production
ENV APP_ENV=production
ENV APP_DEBUG=false

EXPOSE 8080

ENTRYPOINT ["entrypoint.sh"]

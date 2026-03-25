#!/bin/sh

# Exit on error
set -e

echo "🚀 Starting TaskFlow AI Entrypoint..."

# Clear and Cache configuration
echo "📦 Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations
echo "🗄️ Running database migrations..."
# Check if DB is reachable before migrating
# (Optional: Add a loop to wait for DB)
php artisan migrate --force

echo "🔥 Starting PHP-FPM..."
php-fpm -D

echo "🌐 Starting Nginx..."
nginx -g "daemon off;"

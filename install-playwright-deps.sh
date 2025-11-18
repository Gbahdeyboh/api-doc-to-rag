#!/bin/bash
# Install Playwright system dependencies for Railway/Linux

set -e

echo "Installing Playwright system dependencies..."

# Install system dependencies required by Playwright
# Railway uses Debian-based images, so we use apt-get
if command -v apt-get &> /dev/null; then
    apt-get update && apt-get install -y \
        libnss3 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libxkbcommon-x11-0 \
        libxcomposite1 \
        libxrandr2 \
        libgbm1 \
        libpango-1.0-0 \
        libasound2 \
        libxdamage1 \
        libxfixes3 \
        libxext6 \
        libx11-6 \
        libxcb1 \
        libxkbcommon0 \
        libglib2.0-0 \
        libgobject-2.0-0 \
        libnspr4 \
        libnss3 \
        libnssutil3 \
        libdbus-1-3 \
        libgio-2.0-0 \
        libexpat1 \
        libatspi2.0-0 \
        || echo "Warning: Some packages failed to install, continuing..."
fi

echo "Installing Playwright browsers..."
cd server
npx playwright install chromium || echo "Warning: Playwright install had issues, continuing..."

echo "Playwright setup completed"


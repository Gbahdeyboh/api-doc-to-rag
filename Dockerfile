# Use Node.js 20 base image (required for @vercel/oidc dependency)
FROM node:20-slim

# Install Playwright system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
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
    libnspr4 \
    libdbus-1-3 \
    libexpat1 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

COPY package.json yarn.lock ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN yarn install --frozen-lockfile

# Copy application code
COPY . .

# Install Playwright browsers (must be after dependencies are installed)
RUN cd server && npx playwright install chromium && cd ..

RUN yarn client:build


EXPOSE 8080

# Set NODE_ENV for production runtime
ENV NODE_ENV=production

# Start command (only server - workers run in separate Railway service)
CMD ["yarn", "start"]

# Use Node.js base image
FROM node:18-slim

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

# Install Yarn globally
RUN npm install -g yarn

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy application code
COPY . .

# Install Playwright browsers
RUN cd server && npx playwright install chromium && cd ..

# Build frontend
RUN yarn client:build

# Expose port
EXPOSE 8080

# Start command (only server - workers run in separate Railway service)
CMD ["yarn", "start"]


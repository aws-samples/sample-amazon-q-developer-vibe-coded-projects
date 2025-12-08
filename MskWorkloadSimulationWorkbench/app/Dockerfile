# Multi-platform Node.js Dockerfile for MSK Express App
# Compatible with both Apple Silicon (M1/M2) and AWS x86_64

# Use Node.js 20 LTS with Alpine for smaller image size
# Support both arm64 (Apple Silicon) and amd64 (AWS/Intel)
FROM --platform=$BUILDPLATFORM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Install dependencies (use install instead of ci for workspace compatibility)
RUN npm install --only=production && npm cache clean --force

# Production stage - multi-platform support
FROM --platform=$TARGETPLATFORM node:22-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application and dependencies from base stage
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs dist ./dist
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Expose the application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["node", "dist/index.js"]

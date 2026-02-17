# Build stage for React frontend
# Use host platform to avoid QEMU emulation (output is arch-independent JS/CSS)
FROM --platform=$BUILDPLATFORM node:20-alpine3.21 AS frontend-build

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install dependencies
RUN npm install

# Copy client source
COPY client/ ./

# Build the frontend
RUN npm run build

# Production stage
FROM node:20-alpine3.21 AS production

WORKDIR /app

# Upgrade busybox, install procps, and add build tools for native addon compilation (ARM64)
RUN apk upgrade --no-cache busybox && \
    apk add --no-cache procps && \
    apk add --no-cache --virtual .build-deps python3 make g++

# Copy server package files
COPY server/package*.json ./

# Install production dependencies only, then remove npm and build tools
RUN npm install --omit=dev && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
RUN apk del .build-deps

# Copy server source
COPY server/src ./src

# Copy built frontend from build stage
COPY --from=frontend-build /app/client/dist ./client/dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose the port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the server
CMD ["node", "src/index.js"]

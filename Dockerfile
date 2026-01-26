# Build stage for React frontend
FROM node:20-alpine3.21 AS frontend-build

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

# Upgrade busybox and install procps for proper process monitoring
RUN apk upgrade --no-cache busybox && \
    apk add --no-cache procps

# Copy server package files
COPY server/package*.json ./

# Install production dependencies only, then remove npm to eliminate its bundled vulnerable packages
RUN npm install --omit=dev && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

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

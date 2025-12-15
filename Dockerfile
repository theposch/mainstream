# ===========================================
# Mainstream - Production Dockerfile
# ===========================================
# Two-stage build for optimal image size:
# 1. Builder: installs all deps, compiles app
# 2. Runner: minimal image with standalone output
# Final image: ~200MB (vs ~1GB without multi-stage)

# Stage 1: Builder
# Install all dependencies (including dev) for the build process
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and install all dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies for Sharp (image processing)
RUN apk add --no-cache \
    libc6-compat \
    vips-dev \
    fftw-dev \
    && rm -rf /var/cache/apk/*

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create uploads directory with correct permissions
# chown entire public directory so nextjs user can write to uploads
RUN mkdir -p ./public/uploads/full ./public/uploads/medium ./public/uploads/thumbnails
RUN chown -R nextjs:nodejs ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]


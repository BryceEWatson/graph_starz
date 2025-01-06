# Build stage
FROM node:20-alpine AS builder

# Add build arguments for secrets (only needed for build time)
ARG ANTHROPIC_API_KEY
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG NEO4J_URI
ARG NEO4J_USER
ARG NEO4J_PASSWORD
ARG GCS_BUCKET_NAME
ARG FRONTEND_URL
ARG NEXTAUTH_SECRET
ARG AUTO_WHITELISTED_EMAILS
ARG NODE_ENV=production

# Set working directory
WORKDIR /app

# Set build-time environment
ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1

# Print build info
RUN echo "Build Info:" && \
    echo "  Node Version: $(node -v)" && \
    echo "  NPM Version: $(npm -v)" && \
    echo "  NODE_ENV: $NODE_ENV"

# Install dependencies first (for better caching)
COPY package.json yarn.lock ./

# Install dependencies with proper caching
RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn \
    yarn install --frozen-lockfile --production=false && \
    echo "✓ Dependencies installed"

# Copy source code
COPY . .

# Print source files for debugging
RUN echo "Source files in src/lib/storage:" && \
    ls -la src/lib/storage/

# Build the application in standalone mode
RUN yarn build:prod

# Production stage
FROM node:20-alpine AS runner

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Set working directory
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

# Copy only the necessary files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]

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
ARG NODE_ENV=development

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package.json yarn.lock ./

# Install dependencies with proper caching
RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn \
    yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Verify test_images directory (fail fast if missing)
RUN if [ ! -d "./test_images" ]; then \
        echo "ERROR: test_images directory not found!" && \
        ls -la && \
        exit 1; \
    fi

# Build application
RUN yarn build

# Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/test_images ./test_images

# Set production environment variables
ARG ANTHROPIC_API_KEY
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG NEO4J_URI
ARG NEO4J_USER
ARG NEO4J_PASSWORD
ARG GCS_BUCKET_NAME
ARG FRONTEND_URL
ARG NEXTAUTH_SECRET
ARG NODE_ENV=production

# Set environment variables without defaults to ensure they are provided
ENV ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET \
    NEO4J_URI=$NEO4J_URI \
    NEO4J_USER=$NEO4J_USER \
    NEO4J_PASSWORD=$NEO4J_PASSWORD \
    GCS_BUCKET_NAME=$GCS_BUCKET_NAME \
    FRONTEND_URL=$FRONTEND_URL \
    NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
    NEXTAUTH_URL=$FRONTEND_URL \
    NODE_ENV=$NODE_ENV \
    DEBUG=app:* \
    NEXT_TELEMETRY_DISABLED=1

# Set the command to run the application
CMD ["yarn", "start"]

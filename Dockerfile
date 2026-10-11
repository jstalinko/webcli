# Stage 1: Build stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install native compilation build dependencies for node-pty and better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    gcc \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package.json package-lock.json* ./
COPY client/package.json client/package-lock.json* ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build

# Stage 2: Production Execution Environment
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install standard Linux dev tools for terminal environment (bash, git, curl, python3, sudo)
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    procps \
    coreutils \
    curl \
    git \
    python3 \
    python3-pip \
    vim \
    nano \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated isolated development user
RUN useradd -m -s /bin/bash webcli && \
    echo "webcli ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/webcli && \
    chmod 0440 /etc/sudoers.d/webcli

# Set environment
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    SHELL=/bin/bash \
    DATA_DIR=/app/data \
    WORKSPACES_ROOT=/app/workspaces

# Copy node_modules and built assets from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# Create storage directories and set ownership
RUN mkdir -p /app/data /app/workspaces && \
    chown -R webcli:webcli /app

# Switch to isolated user
USER webcli

# Expose Web IDE port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server/src/index.js"]

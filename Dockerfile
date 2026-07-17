# Use the official Bun image
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy root config and lockfiles
COPY package.json bun.lock ./
COPY core/package.json ./core/
COPY client/package.json client/bun.lock* ./client/
COPY server/package.json server/bun.lock* ./server/

# Install dependencies for all workspaces
RUN bun install --frozen-lockfile
RUN bun install --cwd client

# Copy the rest of the application files
COPY core/ ./core/
COPY client/ ./client/
COPY server/ ./server/

# Build core, then build client static assets, and generate Prisma client
RUN bun run --cwd core build
RUN bun run --cwd client build
RUN bun --cwd server prisma generate

# Final run stage (minimal slim image)
FROM oven/bun:1-slim AS runner

WORKDIR /app/server

# Copy built code and dependencies from builder
COPY --from=builder /app /app

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose HTTP port and local SMTP port
EXPOSE 5000
EXPOSE 2525

# Start command (runs migrations, seeds, and starts the server)
CMD ["bun", "run", "start"]

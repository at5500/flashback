# Build stage
FROM rust:1.90-slim as builder

# Install required dependencies for building
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create workspace directory
WORKDIR /workspace

# Copy workspace Cargo file
COPY Cargo.toml ./Cargo.toml

# Copy backend package
COPY backend ./backend

# Build the application
WORKDIR /workspace/backend

# Accept build argument for debug logging
ARG ENABLE_DEBUG_LOGGING=false

# Build only the main binary (skip test binaries in src/bin/)
# Build with debug-logging feature if enabled
RUN if [ "$ENABLE_DEBUG_LOGGING" = "true" ]; then \
        cargo build --release --bin flashback-backend --features debug-logging; \
    else \
        cargo build --release --bin flashback-backend; \
    fi

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1000 app

# Create app directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /workspace/target/release/flashback-backend /app/flashback-backend

# Copy configuration files (use Docker-specific config)
COPY storehaus.docker.toml /app/storehaus.toml

# Copy locale files
COPY locales/backend /app/locales/backend

# Change ownership
RUN chown -R app:app /app

# Switch to app user
USER app

# Expose port
EXPOSE 8080

# Run the application
CMD ["/app/flashback-backend"]
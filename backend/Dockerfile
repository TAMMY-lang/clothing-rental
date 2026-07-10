FROM node:22-bookworm-slim
WORKDIR /app

# Install dependencies for Prisma SSL
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./
RUN npm install

# Copy source files
COPY . .

# Generate Prisma client and build
RUN npx prisma generate \
 && npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]

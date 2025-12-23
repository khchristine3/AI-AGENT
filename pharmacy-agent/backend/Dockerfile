# Pharmacy Agent Backend - Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use install, not ci, for flexibility)
RUN npm install --production

# Copy source code
COPY src ./src

# Seed database (creates pharmacy.db with sample data)
RUN npm run seed

# Expose backend port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
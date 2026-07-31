# Use official Node.js lightweight image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the TypeScript code
RUN npm run build

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]

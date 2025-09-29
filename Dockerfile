# Use official Node.js runtime as base image
FROM node:23-alpine

# Set working directory
WORKDIR /usr/src/app

# Create app directory and set proper permissions
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy project files (excluding files in .dockerignore)
COPY . .

# Change ownership of the app directory to nodejs user
RUN chown -R nextjs:nodejs /usr/src/app
USER nextjs

# Expose the port the app runs on
EXPOSE 5001

# Define the command to run the application
CMD ["npm", "start"]

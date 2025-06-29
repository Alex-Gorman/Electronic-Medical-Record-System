# Use Node base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy backend/package.json files and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy the the backend code
COPY backend/ .

# Expose the app port
EXPOSE 3002

# Start the Server
CMD ["node", "server.js"]

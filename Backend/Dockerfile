# Use Node.js LTS version
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install yarn
RUN apk add --no-cache yarn

# Copy package.json and yarn.lock
COPY package*.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]

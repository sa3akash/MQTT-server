# Build Stage
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx tsc

# Production Stage
FROM node:20-alpine
WORKDIR /app

# Install production deps only
COPY package*.json ./
RUN npm install --production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# ENV Variables
ENV PORT=3000
ENV MQTT_URL=mqtt://mqtt-broker-service:1883

# Start
CMD ["node", "dist/index.js"]

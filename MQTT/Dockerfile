FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY index.js .

ENV PORT=1883
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

EXPOSE 1883

CMD ["npm", "start"]

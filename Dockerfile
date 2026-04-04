FROM node:20-slim

# Install Docker inside the container so the bot can call it
RUN apt-get update && apt-get install -y docker.io curl

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
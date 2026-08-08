FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

# Gateway state (deviceId/keys) persist qilinishi uchun volume qiling:
#   docker run -v gateway-state:/app -e JARVIS_SERVER_URL=... jarvis-camera-gateway
CMD ["node", "dist/index.js", "--pair"]

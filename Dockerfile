FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.js platforms.js scheduler.js engagement-engine.js ai-media.js my-posts.jsx ./
COPY video/ ./video/
RUN mkdir -p uploads output

EXPOSE 3001

CMD ["node", "server.js"]

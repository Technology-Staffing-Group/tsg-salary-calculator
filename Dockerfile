# Build stage - Client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Build stage - Server
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx tsc

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Copy server build and dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --production

COPY --from=server-build /app/server/dist ./server/dist

# Copy client build
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/dist/index.js"]

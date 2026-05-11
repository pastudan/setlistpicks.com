# Build stage: compile Vite frontend + native better-sqlite3 addon,
# then prune to production-only node_modules.
FROM node:20-alpine AS build
WORKDIR /app

# build-base + python3 are required to compile better-sqlite3 (node-gyp).
RUN apk add --no-cache build-base python3

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# Prune dev deps in-place so we can copy a lean node_modules.
RUN npm prune --omit=dev

# Runtime stage: just Node, no build tools.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY server ./server
COPY shared ./shared
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "server/index.js"]

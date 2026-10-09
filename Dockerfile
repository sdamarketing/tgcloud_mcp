# tgcloud-mcp — образ MCP-сервера (TGCLOUD-32)
#   docker build -t ghcr.io/sdamarketing/tgcloud-mcp .
#   stdio:  docker run -i --rm ghcr.io/sdamarketing/tgcloud-mcp
#           (для реальных деплоев добавьте -e TGCLOUD_TOKEN=app... и смонтируйте проекты)

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- runtime ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# Ownership-метки для Official MCP Registry и привязки пакета к репо на ghcr
LABEL io.modelcontextprotocol.server.name="io.github.sdamarketing/tgcloud-mcp" \
      org.opencontainers.image.source="https://github.com/sdamarketing/tgcloud_mcp"

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-fund --no-audit && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY bin ./bin
COPY scripts ./scripts
COPY resources ./resources
COPY LICENSE README.md ./

USER node

ENTRYPOINT ["node", "bin/tgcloud-mcp.mjs"]
# Без аргументов — stdio-сервер (дефолт для MCP-клиентов).

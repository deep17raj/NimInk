FROM node:22-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=apps/web

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY packages/ packages/
COPY apps/api/ apps/api/
COPY --from=build /app/apps/web/dist apps/web/dist
COPY package.json .

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "--import", "tsx", "apps/api/src/index.ts"]

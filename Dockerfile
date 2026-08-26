FROM node:22-alpine AS deps
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
ARG NEXT_PUBLIC_ORGANIZATION_EMAIL_DOMAIN=
ARG NEXT_PUBLIC_LANDING_WIDGET_ID=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ORGANIZATION_EMAIL_DOMAIN=$NEXT_PUBLIC_ORGANIZATION_EMAIL_DOMAIN
ENV NEXT_PUBLIC_LANDING_WIDGET_ID=$NEXT_PUBLIC_LANDING_WIDGET_ID
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/', (r) => process.exit(r.statusCode && r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["npm", "run", "start"]

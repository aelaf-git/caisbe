FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY web/package.json ./web/
COPY admin/package.json ./admin/
COPY portal/package.json ./portal/
COPY packages/platform ./packages/platform

RUN npm ci

COPY packages/platform ./packages/platform
COPY portal ./portal

WORKDIR /app/portal

ENV HOSTNAME=0.0.0.0 \
    PORT=3000 \
    WATCHPACK_POLLING=true \
    CHOKIDAR_USEPOLLING=true

EXPOSE 3000

CMD ["npx", "next", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

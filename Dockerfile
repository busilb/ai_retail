FROM node:20-alpine

WORKDIR /app

# tini 做 PID 1 (优雅处理信号); curl 给 healthcheck 用
RUN apk add --no-cache curl tini

# 先装依赖（利用 docker 层缓存）
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 拷源码
COPY . .

# Build
RUN npm run build

EXPOSE 3000
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# 入口：首次启动初始化 db + seed，然后跑 next start
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/local/bin/entrypoint.sh"]

FROM node:20-bookworm-slim

WORKDIR /app

# 换 Debian apt 源到 aliyun（国内 ECS 直连 deb.debian.org 不稳）
RUN echo "deb https://mirrors.aliyun.com/debian/ bookworm main contrib non-free non-free-firmware" > /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian/ bookworm-updates main contrib non-free non-free-firmware" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian-security/ bookworm-security main contrib non-free non-free-firmware" >> /etc/apt/sources.list && \
    rm -f /etc/apt/sources.list.d/debian.sources && \
    apt-get update && \
    apt-get install -y --no-install-recommends curl tini ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# 配 npm 国内镜像加速
RUN npm config set registry https://registry.npmmirror.com

# 先装依赖（利用 docker 层缓存）
# --include=dev 确保 next/tsx/drizzle-kit 等 dev 依赖装上（build 和 seed 需要）
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund --include=dev

# 验证 next 已装好 (失败时立刻报错，方便定位)
RUN ls -la node_modules/.bin/next && node_modules/.bin/next --version

# 拷源码
COPY . .

# Build
RUN npm run build

EXPOSE 3000
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/usr/local/bin/entrypoint.sh"]

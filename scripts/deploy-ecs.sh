#!/bin/bash
# 阿里云 ECS (CentOS 7) 一键部署脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/busilb/ai_retail/main/scripts/deploy-ecs.sh | bash
set -euo pipefail

REPO="https://github.com/busilb/ai_retail.git"
APP_DIR="/opt/ai_retail"
APP_PORT="${APP_PORT:-3000}"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

step() {
    echo
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}▶ [$1/$2] $3${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}请用 root 跑此脚本：sudo bash ...${NC}"
    exit 1
fi

# ============ 1. 修源 ============
step 1 6 "修复 CentOS 7 yum 源 (CentOS 7 已 EOL，默认源失效)"
if [ -f /etc/yum.repos.d/CentOS-Base.repo ] && grep -q "mirror.centos.org" /etc/yum.repos.d/CentOS-Base.repo 2>/dev/null; then
    mv /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.bak.$(date +%s)
fi
curl -fsSL -o /etc/yum.repos.d/CentOS-Base.repo https://mirrors.aliyun.com/repo/Centos-7.repo
curl -fsSL -o /etc/yum.repos.d/epel.repo https://mirrors.aliyun.com/repo/epel-7.repo
yum clean all >/dev/null
yum makecache fast >/dev/null

# ============ 2. 装 docker + git ============
step 2 6 "安装 Docker + git"
yum install -y -q git curl yum-utils device-mapper-persistent-data lvm2 openssl
if ! command -v docker &>/dev/null; then
    yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo >/dev/null
    yum install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
systemctl enable docker >/dev/null 2>&1
systemctl start docker

# Docker 镜像加速（中国内地拉镜像必备）
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run",
    "https://hub.fast360.xyz",
    "https://dockerproxy.com"
  ],
  "log-driver": "json-file",
  "log-opts": {"max-size": "10m", "max-file": "3"}
}
EOF
systemctl restart docker
sleep 3

# ============ 3. clone ============
step 3 6 "拉取代码（${REPO}）"
mkdir -p /opt
cd /opt
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/main
else
    rm -rf "$APP_DIR"
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

# ============ 4. 生成 env ============
step 4 6 "生成 .env (宿主端口=${APP_PORT})"
# 总是重写 APP_PORT，但 AUTH_SECRET 只在首次生成
EXISTING_AUTH=""
if [ -f .env ] && grep -q '^AUTH_SECRET=' .env; then
    EXISTING_AUTH=$(grep '^AUTH_SECRET=' .env | head -1 | cut -d= -f2-)
fi
AUTH_SECRET="${EXISTING_AUTH:-$(openssl rand -base64 32)}"
cat > .env <<EOF
AUTH_SECRET=${AUTH_SECRET}
DB_PATH=/app/data/jinshou.db
APP_PORT=${APP_PORT}
# 想接 Claude 真模型把下面取消注释填 key（不填走规则引擎 mock 演示一样能跑）
# ANTHROPIC_API_KEY=sk-ant-...
EOF
echo "  ✓ .env 已就绪 (AUTH_SECRET 保留 / APP_PORT=${APP_PORT})"

# ============ 5. build + up ============
step 5 6 "Docker build + up（首次 build 需要 5-10 分钟，请耐心）"
cd "$APP_DIR"
docker compose down 2>/dev/null || true
docker compose build --pull
docker compose up -d

# ============ 6. 健康检查 ============
step 6 6 "等待服务起来 + 健康检查"
echo -n "  · 等待 Next 启动 (本机 :${APP_PORT}) "
for i in $(seq 1 45); do
    if curl -fsS "http://localhost:${APP_PORT}/login" >/dev/null 2>&1; then
        echo " ✓ 就绪 (用时 $((i*2))s)"
        break
    fi
    echo -n "."
    sleep 2
done

PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || curl -s --max-time 5 ipinfo.io/ip 2>/dev/null || echo "")
PRIVATE_IP=$(ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -1)

echo
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ 部署完成${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo
if [ -n "$PUBLIC_IP" ]; then
    echo -e "  🌐 公网访问:  ${YELLOW}http://${PUBLIC_IP}:${APP_PORT}${NC}"
fi
if [ -n "$PRIVATE_IP" ]; then
    echo -e "  🔒 内网访问:  ${YELLOW}http://${PRIVATE_IP}:${APP_PORT}${NC}"
fi
echo -e "  👤 测试账号:  boss / director / manager / staff"
echo -e "  🔑 密码:      ${YELLOW}demo2026${NC}"
echo
echo -e "  常用命令:"
echo -e "    查看状态:  ${YELLOW}cd $APP_DIR && docker compose ps${NC}"
echo -e "    查看日志:  ${YELLOW}cd $APP_DIR && docker compose logs -f${NC}"
echo -e "    重启服务:  ${YELLOW}cd $APP_DIR && docker compose restart${NC}"
echo -e "    停止服务:  ${YELLOW}cd $APP_DIR && docker compose down${NC}"
echo -e "    更新代码:  ${YELLOW}cd $APP_DIR && git pull && docker compose up -d --build${NC}"
echo

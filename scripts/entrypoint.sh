#!/bin/sh
set -e

mkdir -p /app/data

# 首次启动：建表 + 灌种子
if [ ! -f /app/data/jinshou.db ]; then
    echo "[init] 数据库不存在，跑 migrate + seed..."
    npx drizzle-kit push --force
    npx tsx scripts/seed-demo-data.ts
    echo "[init] ✓ 数据库初始化完成"
fi

# 启动 Next
echo "[start] Next.js production server on :3000..."
exec npx next start -p 3000 -H 0.0.0.0

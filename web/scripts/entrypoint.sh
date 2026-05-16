#!/bin/sh
# OEPNIMG entrypoint：启动前自动应用 Prisma 迁移 + 注入种子（幂等）
set -e

echo "[entrypoint] applying database migrations..."
if [ -d ./node_modules/prisma ]; then
  npx prisma migrate deploy
else
  # standalone 镜像里只装了 @prisma/client，没有 prisma CLI
  # 改为执行内置迁移：节点级 ALTER 风险较大 —— 因此 Dockerfile 里我们保留了 prisma 目录
  # 但不带 prisma CLI 时，假定已通过 init 镜像 / 部署脚本 migrate-deploy 过
  echo "[entrypoint] prisma CLI not found; assuming DB is already migrated"
fi

echo "[entrypoint] starting OEPNIMG..."
exec "$@"

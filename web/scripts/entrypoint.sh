#!/bin/sh
# OEPNIMG entrypoint：启动前自动应用 Prisma 迁移 + 注入种子（幂等）
set -e

echo "[entrypoint] OEPNIMG container starting..."
echo "[entrypoint] DATABASE_URL=$DATABASE_URL"

# 1) 应用迁移（幂等）
echo "[entrypoint] applying database migrations..."
if [ -d /app/node_modules/prisma ]; then
  node /app/node_modules/prisma/build/index.js migrate deploy || {
    echo "[entrypoint] migrate deploy failed, falling back to db push..."
    node /app/node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss
  }
else
  echo "[entrypoint] WARNING: prisma CLI not found"
fi

# 2) 注入种子（幂等：admin 用户 + 内置模板）
echo "[entrypoint] running seed (idempotent)..."
node /app/scripts/seed-runtime.cjs || echo "[entrypoint] seed warning (continuing)"

echo "[entrypoint] starting OEPNIMG server on port ${PORT:-3000}..."
exec "$@"

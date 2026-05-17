# OEPNIMG Web —— 多阶段镜像
#
# build context 应当是 web/ 目录：
#   docker build -t oepnimg-web:latest -f web/Dockerfile ./web
# 或者使用 docker-compose（已配置）：
#   docker compose build
#
# 输出基于 Next.js standalone 模式（next.config.mjs: output:"standalone"）
# 镜像最终大小 ~250MB；包含 Prisma + SQLite 客户端，可无 root 运行。

# ---------- 1) builder（一站式安装 + 生成 + 构建）----------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# 拷贝清单与 lockfile，先装依赖（利用层缓存）
COPY package.json pnpm-lock.yaml ./
COPY .npmrc* ./
RUN pnpm install --frozen-lockfile --prod=false

# 拷贝完整源码
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# 生成 prisma client（输出到 node_modules/.pnpm/...）+ 构建 standalone
RUN pnpm prisma generate
RUN pnpm build

# 把整个 node_modules 直接打入运行时镜像（含 .pnpm 软链结构）
# 这一步用 prune 移除 dev deps 太复杂；直接全保留，简单稳健

# ---------- 2) runner ----------
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl wget
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/data/oepnimg.db

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs \
 && mkdir -p /data \
 && chown -R nextjs:nodejs /data

# Next.js standalone 输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone        ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static            ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public                  ./public

# Prisma 资源（schema + migrations + 内置模板 JSON）
COPY --from=builder --chown=nextjs:nodejs /app/prisma                  ./prisma

# 整个 node_modules：standalone 已经裁剪过，但 prisma client 的实际物理位置
# 在 .pnpm/<pkg>/node_modules/.prisma/client，所以必须保留 .pnpm 目录结构。
# 这一份会比 prune 后大一些（约 +120MB），但避免符号链接断裂。
COPY --from=builder --chown=nextjs:nodejs /app/node_modules            ./node_modules

# 入口与运行时 seed 脚本
COPY --chown=nextjs:nodejs scripts/entrypoint.sh ./entrypoint.sh
COPY --chown=nextjs:nodejs scripts/seed-runtime.cjs ./scripts/seed-runtime.cjs

RUN chmod +x ./entrypoint.sh

USER nextjs
VOLUME ["/data"]
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false, // 移除 X-Powered-By: Next.js
  images: {
    // 远程中转站返回的图片域名千变万化 —— 默认放开协议白名单
    // TODO: 生产环境应该收窄到实际使用的域名
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // 防止 MIME 类型嗅探
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 防止点击劫持
          { key: "X-Frame-Options", value: "DENY" },
          // XSS 防护（现代浏览器已内置，但仍推荐）
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // 控制 Referrer 信息泄露
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 禁止搜索引擎索引（私有平台）
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          // 权限策略：禁用不需要的浏览器功能
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

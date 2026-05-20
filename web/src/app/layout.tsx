import type { Metadata, Viewport } from "next";
import { inlineThemeScript } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "OEPNIMG · 多源 AI 图片生成平台",
  description: "统一对接多个 API 中转站，一键切换、LLM 智能扩展",
  applicationName: "OEPNIMG",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: inlineThemeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

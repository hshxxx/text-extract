import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/utils/constants";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "固定 Schema 的结构化提取与 Prompt 生成工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

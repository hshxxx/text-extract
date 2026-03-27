"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { useAppSession } from "@/components/session-shell";

type AppShellProps = {
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/extract", label: "文本解析" },
  { href: "/generate-image", label: "图片生成" },
  { href: "/edit-image", label: "图片编辑" },
  { href: "/marketing-copy", label: "文案生成" },
  { href: "/export-to-sheets", label: "导出 Sheets" },
  { href: "/settings/models", label: "模型配置" },
  { href: "/settings/templates", label: "模板管理" },
  { href: "/history", label: "历史记录" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userEmail } = useAppSession();

  return (
    <div className="page-shell">
      <header className="app-header">
        <div className="brand-block">
          <h1>AI Prompt Structurer</h1>
          <p>{userEmail ?? "未登录"} · 固定 Schema Prompt 生成器</p>
        </div>
        <div className="stack" style={{ gap: 12, alignItems: "flex-end" }}>
          <nav className="nav-links">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={isActivePath(pathname, item.href) ? "nav-link-active" : "nav-link"}
                onMouseEnter={() => router.prefetch(item.href)}
                onFocus={() => router.prefetch(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}

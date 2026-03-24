import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

type AppShellProps = {
  activePath: string;
  userEmail?: string | null;
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/extract", label: "????????????" },
  { href: "/generate-image", label: "????????????" },
  { href: "/edit-image", label: "????????????" },
  { href: "/marketing-copy", label: "????????????" },
  { href: "/export-to-sheets", label: "?????? Sheets" },
  { href: "/settings/models", label: "????????????" },
  { href: "/settings/templates", label: "????????????" },
  { href: "/history", label: "????????????" },
];

export function AppShell({ activePath, userEmail, children }: AppShellProps) {
  return (
    <div className="page-shell">
      <header className="app-header">
        <div className="brand-block">
          <h1>AI Prompt Structurer</h1>
          <p>{userEmail ?? "?????????"} ?? ?????? Schema Prompt ?????????</p>
        </div>
        <div className="stack" style={{ gap: 12, alignItems: "flex-end" }}>
          <nav className="nav-links">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={activePath === item.href ? "nav-link-active" : "nav-link"}
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_ITEMS = [
  { href: "/settings/models", label: "模型配置" },
  { href: "/settings/templates", label: "模板管理" },
  { href: "/settings/quantity-templates", label: "数量模板" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsSubnav() {
  const pathname = usePathname();

  return (
    <div className="subnav-wrap">
      <nav className="subnav-chips" aria-label="设置导航">
        {SETTINGS_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(pathname, item.href) ? "subnav-chip active" : "subnav-chip"}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

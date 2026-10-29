"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { StaffRole } from "@/types/database";

const links: {
  href: string;
  label: string;
  roles: StaffRole[];
  icon: LucideIcon;
}[] = [
  { href: "/admin", label: "Overview", roles: ["administrator"], icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", roles: ["administrator", "order_manager"], icon: ReceiptText },
  { href: "/admin/products", label: "Menu & products", roles: ["administrator", "menu_manager"], icon: Package },
  { href: "/admin/reservations", label: "Reservations", roles: ["administrator", "reservation_manager"], icon: CalendarDays },
  { href: "/admin/settings", label: "Business settings", roles: ["administrator"], icon: Settings2 },
  { href: "/admin/staff", label: "Team access", roles: ["administrator"], icon: Users },
];

export function AdminNavigation({ roles }: { roles: StaffRole[] }) {
  const pathname = usePathname();

  return (
    <nav className="admin-navigation" aria-label="Admin dashboard">
      {links
        .filter((link) => roles.some((role) => link.roles.includes(role)))
        .map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={active ? "admin-nav-link is-active" : "admin-nav-link"}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

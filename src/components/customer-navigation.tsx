"use client";

import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  ShoppingBag,
  UserRound,
  Utensils,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { T } from "@/components/language-provider";

const links = [
  { href: "/account", label: <T en="Overview" fil="Buod" />, icon: LayoutDashboard },
  { href: "/account/menu", label: <T en="Menu" fil="Menu" />, icon: Utensils },
  { href: "/account/story", label: <T en="Our story" fil="Ang aming kuwento" />, icon: BookOpen },
  { href: "/account/profile", label: <T en="Professional Profile" fil="Propesyonal na profile" />, icon: UserRound },
  { href: "/account/orders", label: <T en="My orders" fil="Mga order ko" />, icon: ShoppingBag },
  { href: "/account/reservations", label: <T en="Reservations" fil="Mga reservation" />, icon: CalendarDays },
];

export function CustomerNavigation() {
  const pathname = usePathname();

  return (
    <nav className="admin-navigation" aria-label="Customer account">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/account"
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

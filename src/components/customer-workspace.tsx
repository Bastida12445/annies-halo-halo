"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, LogOut, Menu, UserRound, UsersRound, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { CustomerNavigation } from "@/components/customer-navigation";
import { T } from "@/components/language-provider";

export function CustomerWorkspace({
  children,
  email,
  customerName,
}: {
  children: ReactNode;
  email: string;
  customerName: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const displayName = customerName.trim() || email.split("@")[0] || "Customer";
  const initials = displayName
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";

  useEffect(() => {
    if (!drawerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.body.classList.add("customer-drawer-open");
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("customer-drawer-open");
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen]);

  return (
    <div className="customer-workspace">
      {drawerOpen && (
        <button
          aria-label="Close customer navigation"
          className="customer-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          type="button"
        />
      )}

      <aside
        aria-label="Customer portal navigation"
        className={`customer-sidebar${drawerOpen ? " is-open" : ""}`}
        id="customer-navigation-drawer"
      >
        <Link className="customer-brand" href="/account" onClick={() => setDrawerOpen(false)}>
          <span className="customer-brand-photo">
            <Image
              alt=""
              height={58}
              src="/images/customer-dashboard/halo-halo-hero.jpg"
              width={58}
            />
          </span>
          <span className="customer-brand-copy">
            <strong>Annie&apos;s</strong>
            <span>HALO HALO</span>
          </span>
        </Link>

        <div className="customer-sidebar-label">
          <span />
          <T en="Customer account" fil="Account ng customer" />
          <span />
        </div>
        <CustomerNavigation onNavigate={() => setDrawerOpen(false)} />

        <div className="customer-sidebar-bottom">
          <p className="customer-sidebar-slogan">
            <T en="Life is sweeter with Annie&apos;s!" fil="Mas matamis ang buhay kasama si Annie&apos;s!" />
            <span aria-hidden="true">♡</span>
          </p>
          <form action={logoutAction}>
            <button className="customer-sidebar-logout" type="submit">
              <LogOut aria-hidden="true" size={19} />
              <T en="Log out" fil="Mag-log out" />
            </button>
          </form>
        </div>
      </aside>

      <div className="customer-workspace-main">
        <header className="customer-topbar">
          <div className="customer-topbar-brand">
            <button
              aria-controls="customer-navigation-drawer"
              aria-expanded={drawerOpen}
              aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
              className="customer-menu-toggle"
              onClick={() => setDrawerOpen((open) => !open)}
              type="button"
            >
              {drawerOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span>ANNIE&apos;S HALO HALO</span>
          </div>

          <div className="customer-topbar-actions">
            <Link className="customer-portal-badge" href="/account">
              <UsersRound aria-hidden="true" size={17} />
              <T en="Customer Portal" fil="Customer Portal" />
            </Link>
            <span aria-hidden="true" className="customer-topbar-separator" />
            <details className="customer-profile-menu">
              <summary aria-label={`Account menu for ${displayName}`}>
                <span className="customer-avatar" aria-hidden="true">{initials}</span>
                <span className="customer-profile-menu-name">{displayName}</span>
                <ChevronDown aria-hidden="true" size={16} />
              </summary>
              <div className="customer-profile-dropdown">
                <span className="customer-dropdown-email">{email}</span>
                <Link href="/account/profile">
                  <UserRound aria-hidden="true" size={16} />
                  <T en="Profile settings" fil="Settings ng profile" />
                </Link>
                <form action={logoutAction}>
                  <button type="submit">
                    <LogOut aria-hidden="true" size={16} />
                    <T en="Log out" fil="Mag-log out" />
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <div className="customer-workspace-content">{children}</div>
      </div>
    </div>
  );
}

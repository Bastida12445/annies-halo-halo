"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { T, useLanguage } from "@/components/language-provider";

type SiteHeaderProps = {
  user: { email?: string } | null;
  businessName: string;
};

export function SiteHeader({ user, businessName }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const { locale, toggle } = useLanguage();

  const links = [
    { href: "/menu", label: <T en="Menu" fil="Menu" /> },
    { href: "/about", label: <T en="Our story" fil="Tungkol sa amin" /> },
    { href: "/contact", label: <T en="Contact" fil="Makipag-ugnayan" /> },
  ];

  return (
    <header className="site-header">
      <div className="topline">
        <div className="container top-line-inner">
          <span>
            <T
              en="A neighborhood favorite in Loreto, Agusan del Sur"
              fil="Paboritong lokal sa Loreto, Agusan del Sur"
            />
          </span>
          <button
            className="language-toggle"
            type="button"
            onClick={toggle}
            aria-label="Change language"
          >
            {locale === "en" ? "EN · Filipino" : "Filipino · EN"}
          </button>
        </div>
      </div>
      <div className="container nav-wrap">
        <Link
          className="brand"
          href="/"
          aria-label={`${businessName} home`}
          onClick={() => setOpen(false)}
        >
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>
            <strong>{businessName}</strong>
            <small>
              <T en="Halo-halo & merienda" fil="Halo-halo at merienda" />
            </small>
          </span>
        </Link>
        <button
          className="mobile-menu-button"
          type="button"
          aria-expanded={open}
          aria-controls="primary-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav
          id="primary-navigation"
          className={`primary-nav ${open ? "is-open" : ""}`}
          aria-label="Main navigation"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            className="nav-buy-now"
            href={user ? "/menu" : "/login?next=%2Fmenu"}
            onClick={() => setOpen(false)}
          >
            <ShoppingBag size={17} aria-hidden="true" />
            <T en="Buy now" fil="Bumili ngayon" />
          </Link>
          {user ? (
            <>
              <Link
                className="nav-account"
                href="/account"
                onClick={() => setOpen(false)}
              >
                <UserRound size={17} aria-hidden="true" />
                <T en="My account" fil="Aking account" />
              </Link>
              <form action={logoutAction} className="nav-logout">
                <button type="submit">
                  <T en="Sign out" fil="Mag-log out" />
                </button>
              </form>
            </>
          ) : (
            <Link
              className="button button-small"
              href="/login"
              onClick={() => setOpen(false)}
            >
              <T en="Sign in" fil="Mag-log in" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

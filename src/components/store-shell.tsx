import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Baby, Package, ShieldCheck, ShoppingBag, Sprout, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useShop } from "@/components/shop-provider";

export function StoreShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, cartCount } = useShop();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="announcement-band">
        <p>Small comforts for big new chapters</p>
        <span className="hidden items-center gap-1 sm:flex">
          Chosen with care <Sprout aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
      </div>
      <header className="store-header">
        <div className="store-container header-inner">
          <Link to="/" className="brand-lockup" aria-label="BabyShopHub home">
            <span className="brand-icon" aria-hidden="true">
              <Baby className="h-5 w-5" />
            </span>
            <span>
              <strong>BabyShopHub</strong>
              <small>little things, lovely days</small>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="main-nav">
            <Link to="/" className="nav-link">
              Shop
            </Link>
            <Link to="/orders" className="nav-link">
              Orders
            </Link>
            <Link to="/support" className="nav-link">
              Help
            </Link>
          </nav>

          <div className="header-actions">
            {isAdmin ? (
              <Button asChild variant="ghost" size="icon" aria-label="Admin tools" title="Admin tools">
                <Link to="/admin">
                  <ShieldCheck aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="icon" aria-label="My account" title="My account">
              <Link to={user ? "/account" : "/auth"}>
                <UserRound aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={`Shopping bag, ${cartCount} items`}
              title="Shopping bag"
              className="bag-action"
            >
              <Link to="/cart">
                <ShoppingBag aria-hidden="true" />
                {cartCount > 0 ? <span className="bag-count">{cartCount}</span> : null}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="store-footer">
        <div className="store-container footer-inner">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <Sprout aria-hidden="true" className="h-5 w-5" />
              BabyShopHub
            </Link>
            <p>Thoughtful finds for the tiniest people in your world.</p>
          </div>
          <div className="footer-links">
            <Link to="/">Shop the collection</Link>
            <Link to="/account">Your account</Link>
            <Link to="/support">Care & support</Link>
          </div>
          <div className="footer-note">
            <Package aria-hidden="true" className="h-4 w-4" />
            <span>Every little order is packed with care.</span>
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </div>
        </div>
      </footer>
    </div>
  );
}
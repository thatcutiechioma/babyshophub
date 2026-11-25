import { Suspense, useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useShop } from "@/components/shop-provider";

function Redirecting({ label }: { label: string }) {
  return (
    <div className="store-container page-container narrow-page">
      <div className="empty-state" role="status">
        <p className="eyebrow">One moment</p>
        <h2>{label}</h2>
        <p>Getting your little corner of the shop ready.</p>
      </div>
    </div>
  );
}

export function RequireAuth({
  children,
  returnTo,
}: {
  children: ReactNode;
  returnTo: string;
}) {
  const { user, authLoading } = useShop();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({
        to: "/auth",
        search: { returnTo },
        replace: true,
      });
    }
  }, [authLoading, navigate, returnTo, user]);

  if (authLoading || !user) return <Redirecting label="Checking your account" />;

  return <Suspense fallback={<Redirecting label="Loading your page" />}>{children}</Suspense>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, authLoading } = useShop();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({
        to: "/auth",
        search: { returnTo: "/admin" },
        replace: true,
      });
    }
  }, [authLoading, navigate, user]);

  if (authLoading || !user) return <Redirecting label="Checking admin access" />;

  // AdminPage itself renders the "Shop admin access only" panel when isAdmin is false,
  // so a signed-in shopper who reaches /admin sees an explanation instead of a redirect.
  return <Suspense fallback={<Redirecting label="Loading admin tools" />}>{children}</Suspense>;
}

export function PageFallback() {
  return <Redirecting label="Loading the shop" />;
}

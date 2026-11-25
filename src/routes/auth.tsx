import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/components/shop-public-pages";
import { StoreShell } from "@/components/store-shell";

type AuthSearch = { returnTo?: string };

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create an account — BabyShopHub" },
      {
        name: "description",
        content: "Sign in to keep your delivery details close and follow your orders.",
      },
      { property: "og:title", content: "Sign in or create an account — BabyShopHub" },
      {
        property: "og:description",
        content: "Keep your delivery details close and your orders easy to follow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): AuthSearch => {
    const returnTo = search["returnTo"];
    return typeof returnTo === "string" ? { returnTo } : {};
  },
  component: AuthRoute,
});

function AuthRoute() {
  const { returnTo } = Route.useSearch();

  return (
    <StoreShell>
      {returnTo ? <AuthPage returnTo={returnTo} /> : <AuthPage />}
    </StoreShell>
  );
}

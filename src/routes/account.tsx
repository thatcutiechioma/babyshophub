import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/components/route-guards";
import { AccountPage } from "@/components/shop-account-pages";
import { StoreShell } from "@/components/store-shell";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — BabyShopHub" },
      {
        name: "description",
        content: "Keep your details and delivery addresses close so shopping stays simple.",
      },
      { property: "og:title", content: "Your account — BabyShopHub" },
      {
        property: "og:description",
        content: "Your details, delivery addresses and account shortcuts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountRoute,
});

function AccountRoute() {
  return (
    <StoreShell>
      <RequireAuth returnTo="/account">
        <AccountPage />
      </RequireAuth>
    </StoreShell>
  );
}

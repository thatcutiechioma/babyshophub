import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/components/route-guards";
import { SupportPage } from "@/components/shop-account-pages";
import { StoreShell } from "@/components/store-shell";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Care & support — BabyShopHub" },
      {
        name: "description",
        content: "Send a note about an order, a product, or anything else we can help with.",
      },
      { property: "og:title", content: "Care & support — BabyShopHub" },
      {
        property: "og:description",
        content: "Our care team is here for the little things.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupportRoute,
});

function SupportRoute() {
  return (
    <StoreShell>
      <RequireAuth returnTo="/support">
        <SupportPage />
      </RequireAuth>
    </StoreShell>
  );
}

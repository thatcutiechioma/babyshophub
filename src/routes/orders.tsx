import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/components/route-guards";
import { OrdersPage } from "@/components/shop-account-pages";
import { StoreShell } from "@/components/store-shell";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Your orders — BabyShopHub" },
      {
        name: "description",
        content: "Follow the progress of your recent orders and revisit the details.",
      },
      { property: "og:title", content: "Your orders — BabyShopHub" },
      {
        property: "og:description",
        content: "Track each little order from packed to delivered.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrdersRoute,
});

function OrdersRoute() {
  return (
    <StoreShell>
      <RequireAuth returnTo="/orders">
        <OrdersPage />
      </RequireAuth>
    </StoreShell>
  );
}

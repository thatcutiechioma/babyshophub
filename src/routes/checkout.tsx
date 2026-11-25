import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { RequireAuth } from "@/components/route-guards";
import { CheckoutPage } from "@/components/shop-checkout";
import { StoreShell } from "@/components/store-shell";
import { addressesQueryOptions, productListQueryOptions } from "@/lib/shop-data";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — BabyShopHub" },
      {
        name: "description",
        content: "Confirm your delivery address and place a demo order — no card is charged.",
      },
      { property: "og:title", content: "Checkout — BabyShopHub" },
      {
        property: "og:description",
        content: "A calm demo checkout: choose an address, place the order, follow it later.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(productListQueryOptions);
  },
  component: CheckoutRoute,
});

function CheckoutRoute() {
  return (
    <StoreShell>
      <RequireAuth returnTo="/checkout">
        <Suspense fallback={null}>
          <CheckoutPage />
        </Suspense>
      </RequireAuth>
    </StoreShell>
  );
}

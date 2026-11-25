import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PageFallback } from "@/components/route-guards";
import { CartPage } from "@/components/shop-public-pages";
import { StoreShell } from "@/components/store-shell";
import { productListQueryOptions } from "@/lib/shop-data";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your bag — BabyShopHub" },
      {
        name: "description",
        content: "Review the little finds in your bag before heading to checkout.",
      },
      { property: "og:title", content: "Your bag — BabyShopHub" },
      {
        property: "og:description",
        content: "Take a look through your little finds before checkout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(productListQueryOptions),
  component: CartRoute,
});

function CartRoute() {
  return (
    <StoreShell>
      <Suspense fallback={<PageFallback />}>
        <CartPage />
      </Suspense>
    </StoreShell>
  );
}

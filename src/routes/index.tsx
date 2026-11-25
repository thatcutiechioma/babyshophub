import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PageFallback } from "@/components/route-guards";
import { ShopHomePage } from "@/components/shop-public-pages";
import { StoreShell } from "@/components/store-shell";
import { productListQueryOptions } from "@/lib/shop-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BabyShopHub — Little essentials, big on care" },
      {
        name: "description",
        content:
          "A hand-picked collection of gentle baby clothes, feeding sets, diapering staples, toys and nursery finds.",
      },
      { property: "og:title", content: "BabyShopHub — Little essentials, big on care" },
      {
        property: "og:description",
        content: "Browse thoughtful, useful finds for the newest person in your world.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(productListQueryOptions),
  component: HomePage,
});

function HomePage() {
  return (
    <StoreShell>
      <Suspense fallback={<PageFallback />}>
        <ShopHomePage />
      </Suspense>
    </StoreShell>
  );
}

import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PageFallback } from "@/components/route-guards";
import { ProductDetailPage } from "@/components/shop-public-pages";
import { StoreShell } from "@/components/store-shell";
import { productQueryOptions, productReviewsQueryOptions } from "@/lib/shop-data";

export const Route = createFileRoute("/products/$slug")({
  head: () => ({
    meta: [
      { title: "Product details — BabyShopHub" },
      {
        name: "description",
        content: "Photos, price, stock and notes from shoppers for this little find.",
      },
      { property: "og:title", content: "Product details — BabyShopHub" },
      {
        property: "og:description",
        content: "See the details, then add it to your bag.",
      },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context: { queryClient }, params: { slug } }) => {
    const product = await queryClient.ensureQueryData(productQueryOptions(slug));
    if (product) await queryClient.ensureQueryData(productReviewsQueryOptions(product.id));
  },
  component: ProductRoute,
});

function ProductRoute() {
  const { slug } = Route.useParams();

  return (
    <StoreShell>
      <Suspense fallback={<PageFallback />}>
        <ProductDetailPage slug={slug} />
      </Suspense>
    </StoreShell>
  );
}

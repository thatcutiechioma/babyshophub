import { createFileRoute } from "@tanstack/react-router";

import { AdminPage } from "@/components/admin-page";
import { RequireAdmin } from "@/components/route-guards";
import { StoreShell } from "@/components/store-shell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Shop admin — BabyShopHub" },
      {
        name: "description",
        content: "Manage the catalog, stock, orders, shoppers and support notes.",
      },
      { property: "og:title", content: "Shop admin — BabyShopHub" },
      {
        property: "og:description",
        content: "Catalog, stock, orders, shoppers and support in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <StoreShell>
      <RequireAdmin>
        <AdminPage />
      </RequireAdmin>
    </StoreShell>
  );
}

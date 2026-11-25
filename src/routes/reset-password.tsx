import { createFileRoute } from "@tanstack/react-router";

import { ResetPasswordPage } from "@/components/shop-public-pages";
import { StoreShell } from "@/components/store-shell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — BabyShopHub" },
      {
        name: "description",
        content: "Set a new password for your BabyShopHub account.",
      },
      { property: "og:title", content: "Choose a new password — BabyShopHub" },
      {
        property: "og:description",
        content: "Use the link from your email to set a new password.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordRoute,
});

function ResetPasswordRoute() {
  return (
    <StoreShell>
      <ResetPasswordPage />
    </StoreShell>
  );
}

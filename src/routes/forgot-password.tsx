import { createFileRoute } from "@tanstack/react-router";

import { ForgotPasswordPage } from "@/components/shop-public-pages";
import { StoreShell } from "@/components/store-shell";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — BabyShopHub" },
      {
        name: "description",
        content: "Enter your account email and we will send a link to choose a new password.",
      },
      { property: "og:title", content: "Reset your password — BabyShopHub" },
      {
        property: "og:description",
        content: "We will email you a link to choose a new password.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordRoute,
});

function ForgotPasswordRoute() {
  return (
    <StoreShell>
      <ForgotPasswordPage />
    </StoreShell>
  );
}

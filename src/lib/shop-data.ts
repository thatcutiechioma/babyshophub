import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type ProductReview = Tables<"product_reviews">;
export type Profile = Tables<"profiles">;
export type DeliveryAddress = Tables<"addresses">;
export type ShopOrder = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type SupportRequest = Tables<"support_requests">;

export type CartLine = { productId: string; quantity: number };
export type OrderWithItems = { order: ShopOrder; items: OrderItem[] };
export type AdminData = {
  products: Product[];
  profiles: Profile[];
  adminUserIds: string[];
  orders: ShopOrder[];
  supportRequests: SupportRequest[];
};

export const productListQueryOptions = queryOptions({
  queryKey: ["shop", "products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },
  staleTime: 30_000,
});

export const productQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["shop", "product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

export const productReviewsQueryOptions = (productId: string) =>
  queryOptions({
    queryKey: ["shop", "reviews", productId],
    queryFn: async () => {
      // A missing product has no id yet; querying with an empty id would fail.
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

export const profileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["shop", "profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const addressesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["shop", "addresses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const ordersQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["shop", "orders", userId],
    queryFn: async (): Promise<OrderWithItems[]> => {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (ordersError) throw ordersError;
      if (orders.length === 0) return [];

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in(
          "order_id",
          orders.map((order) => order.id),
        );
      if (itemsError) throw itemsError;
      return orders.map((order) => ({
        order,
        items: items.filter((item) => item.order_id === order.id),
      }));
    },
  });

export const supportRequestsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["shop", "support", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const adminDataQueryOptions = queryOptions({
  queryKey: ["shop", "admin"],
  queryFn: async (): Promise<AdminData> => {
    const [productsResult, profilesResult, rolesResult, ordersResult, supportResult] =
      await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: true }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id").eq("role", "admin"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
        supabase
          .from("support_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    const error =
      productsResult.error ??
      profilesResult.error ??
      rolesResult.error ??
      ordersResult.error ??
      supportResult.error;
    if (error) throw error;

    return {
      products: productsResult.data ?? [],
      profiles: profilesResult.data ?? [],
      adminUserIds: (rolesResult.data ?? []).map((role) => role.user_id),
      orders: ordersResult.data ?? [],
      supportRequests: supportResult.data ?? [],
    };
  },
});

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export const categoryOptions = [
  { value: "all", label: "All little things" },
  { value: "clothing", label: "Clothing" },
  { value: "feeding", label: "Feeding" },
  { value: "diapers", label: "Diapering" },
  { value: "toys", label: "Toys" },
  { value: "nursery", label: "Nursery" },
] as const;

export const orderStatusLabels: Record<string, string> = {
  placed: "Order placed",
  packed: "Packed with care",
  shipped: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
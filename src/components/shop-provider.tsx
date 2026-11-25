import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { CartLine } from "@/lib/shop-data";

type ShopContextValue = {
  user: User | null;
  authLoading: boolean;
  isAdmin: boolean;
  cart: CartLine[];
  cartCount: number;
  addToCart: (productId: string, maxQuantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  signOut: () => Promise<void>;
};

const ShopContext = createContext<ShopContextValue | null>(null);
const CART_KEY = "babyshophub.cart.v1";

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  if (!("productId" in value) || !("quantity" in value)) return false;
  return typeof value.productId === "string" && typeof value.quantity === "number";
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartReady, setCartReady] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      setUser(error ? null : data.user);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (event === "SIGNED_OUT") {
        setIsAdmin(false);
        void queryClient.cancelQueries().then(() => queryClient.clear());
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries();
        void router.invalidate();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient, router]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsAdmin(false);
      return () => {
        active = false;
      };
    }

    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data, error }) => {
        if (active) setIsAdmin(!error && data?.role === "admin");
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CART_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setCart(parsed.filter(isCartLine));
      }
    } catch {
      setCart([]);
    }
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (!cartReady) return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // The cart remains usable for this visit if browser storage is unavailable.
    }
  }, [cart, cartReady]);

  const value = useMemo<ShopContextValue>(
    () => ({
      user,
      authLoading,
      isAdmin,
      cart,
      cartCount: cart.reduce((total, line) => total + line.quantity, 0),
      addToCart: (productId, maxQuantity) =>
        setCart((current) => {
          const existing = current.find((line) => line.productId === productId);
          if (!existing) return [...current, { productId, quantity: 1 }];
          if (maxQuantity !== undefined && existing.quantity >= maxQuantity) return current;
          return current.map((line) =>
            line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line,
          );
        }),
      setQuantity: (productId, quantity) =>
        setCart((current) =>
          quantity < 1
            ? current.filter((line) => line.productId !== productId)
            : current.map((line) =>
                line.productId === productId ? { ...line, quantity } : line,
              ),
        ),
      removeFromCart: (productId) =>
        setCart((current) => current.filter((line) => line.productId !== productId)),
      clearCart: () => setCart([]),
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        await router.navigate({ to: "/auth", replace: true });
      },
    }),
    [authLoading, cart, isAdmin, queryClient, router, user],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const value = useContext(ShopContext);
  if (!value) throw new Error("useShop must be used inside ShopProvider");
  return value;
}
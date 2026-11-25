import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  CreditCard,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShop } from "@/components/shop-provider";
import { supabase } from "@/integrations/supabase/client";
import {
  addressesQueryOptions,
  formatPrice,
  productListQueryOptions,
} from "@/lib/shop-data";

type Confirmation = {
  orderNumber: string;
  totalAmount: number;
  itemCount: number;
};

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description ? <p className="page-intro">{description}</p> : null}
    </div>
  );
}

export function CheckoutPage() {
  const { cart, clearCart, user } = useShop();
  const queryClient = useQueryClient();
  const { data: products } = useSuspenseQuery(productListQueryOptions);
  const { data: addresses } = useSuspenseQuery(addressesQueryOptions(user?.id ?? ""));

  const [addressId, setAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("demo_card");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const cartRows = cart.flatMap((line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    return product ? [{ product, quantity: line.quantity }] : [];
  });
  const subtotal = cartRows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  const selectedAddress =
    addresses.find((address) => address.id === (addressId || preferredAddressId(addresses))) ??
    null;

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedAddress) {
      setError("Choose a saved delivery address first.");
      return;
    }
    if (!cartRows.length) {
      setError("Your bag is empty.");
      return;
    }

    setPlacing(true);
    const { data: orderId, error: orderError } = await supabase.rpc("place_order", {
      p_items: cartRows.map(({ product, quantity }) => ({
        product_id: product.id,
        quantity,
      })),
      p_address_id: selectedAddress.id,
      p_payment_method: paymentMethod,
    });

    if (orderError || !orderId) {
      setPlacing(false);
      setError("We could not place your order. Please check the details and try again.");
      return;
    }

    const { data: order, error: readError } = await supabase
      .from("orders")
      .select("order_number, total_amount")
      .eq("id", orderId)
      .maybeSingle();

    setPlacing(false);

    if (readError || !order) {
      setConfirmation({
        orderNumber: "Your order is placed",
        totalAmount: subtotal,
        itemCount: cartRows.reduce((total, row) => total + row.quantity, 0),
      });
    } else {
      setConfirmation({
        orderNumber: order.order_number,
        totalAmount: Number(order.total_amount),
        itemCount: cartRows.reduce((total, row) => total + row.quantity, 0),
      });
    }

    clearCart();
    await queryClient.invalidateQueries({ queryKey: ["shop", "orders", user?.id ?? ""] });
    await queryClient.invalidateQueries({ queryKey: ["shop", "products"] });
  }

  if (confirmation) {
    return (
      <div className="store-container page-container narrow-page">
        <section className="checkout-confirm" aria-live="polite">
          <span className="checkout-confirm-mark" aria-hidden="true">
            <PackageCheck />
          </span>
          <p className="eyebrow">Order placed</p>
          <h1>Thank you — it is on its way</h1>
          <p className="checkout-order-number">Order {confirmation.orderNumber}</p>
          <p className="page-intro">
            {confirmation.itemCount} {confirmation.itemCount === 1 ? "item" : "items"} ·{" "}
            {formatPrice(confirmation.totalAmount)}. This is a demo order, so no payment was taken.
          </p>
          <div className="hero-actions">
            <Button asChild>
              <Link to="/orders">
                Follow this order <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Keep browsing</Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (!cartRows.length) {
    return (
      <div className="store-container page-container narrow-page">
        <PageHeading eyebrow="Checkout" title="Nothing to check out yet" />
        <div className="empty-state bag-empty">
          <Truck aria-hidden="true" />
          <h2>Your bag is empty</h2>
          <p>Add a little something and checkout will open up.</p>
          <Button asChild>
            <Link to="/">Browse the shop <ArrowRight aria-hidden="true" /></Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="store-container page-container">
      <PageHeading
        eyebrow="Checkout"
        title="Nearly yours"
        description="Confirm where it is going and how you would like to pay. This checkout is a demo — no card is charged."
      />

      {!addresses.length ? (
        <div className="empty-state address-empty">
          <MapPin aria-hidden="true" />
          <h2>Add a delivery address first</h2>
          <p>Save one to your account and it will be ready here every time.</p>
          <Button asChild>
            <Link to="/account">Add a delivery address <ArrowRight aria-hidden="true" /></Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={placeOrder} className="checkout-layout stacked-form">
          <div className="checkout-form-panel">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Delivery</p>
                <h2>Where should it go?</h2>
              </div>
              <span className="address-count">{addresses.length} saved</span>
            </div>

            <div className="address-list" role="radiogroup" aria-label="Delivery address">
              {addresses.map((address) => {
                const active = address.id === selectedAddress?.id;
                return (
                  <button
                    key={address.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`address-card${active ? " is-selected" : ""}`}
                    onClick={() => setAddressId(address.id)}
                  >
                    <span className="address-card-icon" aria-hidden="true">
                      <MapPin />
                    </span>
                    <span className="address-card-copy">
                      <span className="address-name-row">
                        <strong>{address.recipient_name}</strong>
                        {address.is_default ? <span className="default-pill">Default</span> : null}
                      </span>
                      <span>
                        {address.address_line_1}
                        {address.address_line_2 ? `, ${address.address_line_2}` : ""}
                      </span>
                      <span>
                        {address.city}
                        {address.region ? `, ${address.region}` : ""} {address.postal_code}
                      </span>
                      <span>{address.country}</span>
                    </span>
                    {active ? <Check aria-hidden="true" className="star-filled" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="form-field">
              <Label htmlFor="checkout-payment">Demo payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="checkout-payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo_card">Card (demo only)</SelectItem>
                  <SelectItem value="cash_on_delivery">Cash on delivery</SelectItem>
                </SelectContent>
              </Select>
              <p className="field-note">
                <LockKeyhole aria-hidden="true" /> No card number is collected or stored.
              </p>
            </div>

            {error ? <p className="form-error" role="alert">{error}</p> : null}

            <Button type="submit" size="lg" disabled={placing}>
              <CreditCard aria-hidden="true" />
              {placing ? "Placing your order…" : "Place demo order"}
            </Button>
          </div>

          <aside className="checkout-summary order-summary">
            <h2>Order summary</h2>
            <div className="checkout-item-list">
              {cartRows.map(({ product, quantity }) => (
                <div key={product.id} className="checkout-item-row">
                  <img className="checkout-item-image" src={product.image_url} alt="" />
                  <div className="checkout-item-copy">
                    <span className="product-brand">{product.brand}</span>
                    <span className="product-name">{product.name}</span>
                    <span>{quantity} × {formatPrice(product.price)}</span>
                  </div>
                  <strong>{formatPrice(product.price * quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <div className="summary-line">
              <span>Delivery</span>
              <span>Free on demo orders</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <p className="demo-payment-note">
              <LockKeyhole aria-hidden="true" /> Demo checkout only — no card is charged.
            </p>
          </aside>
        </form>
      )}
    </div>
  );
}

function preferredAddressId(addresses: { id: string; is_default: boolean }[]) {
  const preferred = addresses.find((address) => address.is_default) ?? addresses[0];
  return preferred?.id ?? "";
}

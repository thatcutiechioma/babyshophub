import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Check, MapPin, PackageCheck, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useShop } from "@/components/shop-provider";
import { supabase } from "@/integrations/supabase/client";
import {
  addressesQueryOptions,
  formatDate,
  formatPrice,
  orderStatusLabels,
  ordersQueryOptions,
  profileQueryOptions,
  supportRequestsQueryOptions,
} from "@/lib/shop-data";
import type { DeliveryAddress } from "@/lib/shop-data";

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="page-intro">{description}</p>
    </div>
  );
}

type AddressDraft = {
  recipient_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

const blankAddress: AddressDraft = {
  recipient_name: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  region: "",
  postal_code: "",
  country: "United States",
  is_default: false,
};

export function AccountPage() {
  const { user } = useShop();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const { data: profile } = useSuspenseQuery(profileQueryOptions(userId));
  const { data: addresses } = useSuspenseQuery(addressesQueryOptions(userId));
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [paymentMethod, setPaymentMethod] = useState(profile?.preferred_payment_method ?? "demo_card");
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(blankAddress);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [addressMessage, setAddressMessage] = useState("");
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  if (!user) return null;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setProfileMessage("");
    setSavingProfile(true);
    const { error: saveError } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        full_name: fullName.trim(),
        phone: phone.trim(),
        preferred_payment_method: paymentMethod,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setSavingProfile(false);
    if (saveError) {
      setError("Your account details could not be saved. Please try again.");
      return;
    }
    setProfileMessage("Your account details are saved.");
    await queryClient.invalidateQueries({ queryKey: ["shop", "profile", userId] });
  }

  function startEditingAddress(address: DeliveryAddress) {
    setEditingAddressId(address.id);
    setAddressDraft({
      recipient_name: address.recipient_name,
      phone: address.phone,
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2,
      city: address.city,
      region: address.region,
      postal_code: address.postal_code,
      country: address.country,
      is_default: address.is_default,
    });
    setAddressMessage("");
  }

  function resetAddressForm() {
    setEditingAddressId(null);
    setAddressDraft(blankAddress);
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setAddressMessage("");
    setSavingAddress(true);
    const becomesDefault = addressDraft.is_default || addresses.length === 0;
    if (becomesDefault) {
      const { error: clearDefaultError } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);
      if (clearDefaultError) {
        setSavingAddress(false);
        setError("We could not update your default delivery address.");
        return;
      }
    }
    const values = {
      ...addressDraft,
      recipient_name: addressDraft.recipient_name.trim(),
      phone: addressDraft.phone.trim(),
      address_line_1: addressDraft.address_line_1.trim(),
      address_line_2: addressDraft.address_line_2.trim(),
      city: addressDraft.city.trim(),
      region: addressDraft.region.trim(),
      postal_code: addressDraft.postal_code.trim(),
      country: addressDraft.country.trim(),
      is_default: becomesDefault,
      updated_at: new Date().toISOString(),
    };
    const result = editingAddressId
      ? await supabase.from("addresses").update(values).eq("id", editingAddressId).eq("user_id", userId)
      : await supabase.from("addresses").insert({ ...values, user_id: userId });
    setSavingAddress(false);
    if (result.error) {
      setError("That delivery address could not be saved. Please check the details and try again.");
      return;
    }
    setAddressMessage(editingAddressId ? "Your address is updated." : "Your delivery address is saved.");
    resetAddressForm();
    await queryClient.invalidateQueries({ queryKey: ["shop", "addresses", userId] });
  }

  async function removeAddress(addressId: string) {
    setError("");
    const { error: removeError } = await supabase
      .from("addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", userId);
    if (removeError) {
      setError("That delivery address could not be removed.");
      return;
    }
    if (editingAddressId === addressId) resetAddressForm();
    await queryClient.invalidateQueries({ queryKey: ["shop", "addresses", userId] });
  }

  return (
    <div className="store-container page-container account-page">
      <PageTitle eyebrow="Your account" title="A little place for your details" description="Keep your delivery information close and your shopping simple." />
      <div className="account-grid">
        <section className="account-section">
          <div className="section-title-row">
            <div><p className="eyebrow">Your details</p><h2>About you</h2></div>
            <span className="account-email">{user.email}</span>
          </div>
          <form onSubmit={saveProfile} className="stacked-form">
            <div className="form-grid two-columns">
              <div className="form-field"><Label htmlFor="profile-name">Full name</Label><Input id="profile-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.currentTarget.value)} required /></div>
              <div className="form-field"><Label htmlFor="profile-phone">Phone number</Label><Input id="profile-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.currentTarget.value)} /></div>
            </div>
            <div className="form-field">
              <Label htmlFor="preferred-payment">Preferred demo payment</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="preferred-payment"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo_card">Card (demo only)</SelectItem>
                  <SelectItem value="cash_on_delivery">Cash on delivery</SelectItem>
                </SelectContent>
              </Select>
              <p className="field-note">No card number or payment details are stored.</p>
            </div>
            {profileMessage ? <p className="form-success" role="status">{profileMessage}</p> : null}
            <Button type="submit" disabled={savingProfile}><Save aria-hidden="true" /> {savingProfile ? "Saving…" : "Save details"}</Button>
          </form>
        </section>

        <section className="account-section address-section">
          <div className="section-title-row">
            <div><p className="eyebrow">Delivery details</p><h2>Your addresses</h2></div>
            <span className="address-count">{addresses.length} saved</span>
          </div>
          {addresses.length ? (
            <div className="address-list">
              {addresses.map((address) => (
                <article key={address.id} className="address-card">
                  <div className="address-card-icon"><MapPin aria-hidden="true" /></div>
                  <div className="address-card-copy">
                    <div className="address-name-row"><strong>{address.recipient_name}</strong>{address.is_default ? <span className="default-pill">Default</span> : null}</div>
                    <p>{address.address_line_1}{address.address_line_2 ? `, ${address.address_line_2}` : ""}</p>
                    <p>{address.city}{address.region ? `, ${address.region}` : ""} {address.postal_code}</p>
                    <p>{address.country}{address.phone ? ` · ${address.phone}` : ""}</p>
                  </div>
                  <div className="address-actions">
                    <Button type="button" variant="ghost" size="sm" onClick={() => startEditingAddress(address)}>Edit</Button>
                    {!address.is_default ? <Button type="button" variant="ghost" size="sm" onClick={() => { setAddressDraft({ ...addressDraft, is_default: true }); startEditingAddress({ ...address, is_default: true }); }}>Make default</Button> : null}
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove address" onClick={() => void removeAddress(address.id)}><Trash2 aria-hidden="true" /></Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state address-empty"><MapPin aria-hidden="true" /><h3>No delivery addresses yet</h3><p>Add an address for a smoother checkout.</p></div>
          )}

          <form onSubmit={saveAddress} className="address-form stacked-form">
            <div className="section-title-row address-form-heading">
              <h3>{editingAddressId ? "Update an address" : "Add a delivery address"}</h3>
              {editingAddressId ? <Button type="button" variant="ghost" size="sm" onClick={resetAddressForm}>Cancel edit</Button> : null}
            </div>
            <div className="form-grid two-columns">
              <div className="form-field"><Label htmlFor="address-recipient">Recipient name</Label><Input id="address-recipient" autoComplete="name" value={addressDraft.recipient_name} onChange={(event) => setAddressDraft({ ...addressDraft, recipient_name: event.currentTarget.value })} required /></div>
              <div className="form-field"><Label htmlFor="address-phone">Phone number</Label><Input id="address-phone" type="tel" autoComplete="tel" value={addressDraft.phone} onChange={(event) => setAddressDraft({ ...addressDraft, phone: event.currentTarget.value })} /></div>
              <div className="form-field full-span"><Label htmlFor="address-line-1">Address line 1</Label><Input id="address-line-1" autoComplete="address-line1" value={addressDraft.address_line_1} onChange={(event) => setAddressDraft({ ...addressDraft, address_line_1: event.currentTarget.value })} required /></div>
              <div className="form-field full-span"><Label htmlFor="address-line-2">Address line 2</Label><Input id="address-line-2" autoComplete="address-line2" value={addressDraft.address_line_2} onChange={(event) => setAddressDraft({ ...addressDraft, address_line_2: event.currentTarget.value })} /></div>
              <div className="form-field"><Label htmlFor="address-city">City</Label><Input id="address-city" autoComplete="address-level2" value={addressDraft.city} onChange={(event) => setAddressDraft({ ...addressDraft, city: event.currentTarget.value })} required /></div>
              <div className="form-field"><Label htmlFor="address-region">State / region</Label><Input id="address-region" autoComplete="address-level1" value={addressDraft.region} onChange={(event) => setAddressDraft({ ...addressDraft, region: event.currentTarget.value })} /></div>
              <div className="form-field"><Label htmlFor="address-postal">Postal code</Label><Input id="address-postal" autoComplete="postal-code" value={addressDraft.postal_code} onChange={(event) => setAddressDraft({ ...addressDraft, postal_code: event.currentTarget.value })} required /></div>
              <div className="form-field"><Label htmlFor="address-country">Country</Label><Input id="address-country" autoComplete="country-name" value={addressDraft.country} onChange={(event) => setAddressDraft({ ...addressDraft, country: event.currentTarget.value })} required /></div>
            </div>
            <div className="form-field compact-field">
              <Label htmlFor="address-default">Make this the default delivery address</Label>
              <Select value={addressDraft.is_default ? "yes" : "no"} onValueChange={(value) => setAddressDraft({ ...addressDraft, is_default: value === "yes" })}>
                <SelectTrigger id="address-default"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes, use by default</SelectItem><SelectItem value="no">Not right now</SelectItem></SelectContent>
              </Select>
            </div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {addressMessage ? <p className="form-success" role="status">{addressMessage}</p> : null}
            <Button type="submit" disabled={savingAddress}><Plus aria-hidden="true" /> {savingAddress ? "Saving…" : editingAddressId ? "Update address" : "Save address"}</Button>
          </form>
        </section>
      </div>
      <div className="account-shortcuts">
        <Link to="/orders">See your orders <ArrowRight aria-hidden="true" /></Link>
        <Link to="/support">Contact care & support <ArrowRight aria-hidden="true" /></Link>
      </div>
    </div>
  );
}

function OrderStatus({ status }: { status: string }) {
  const steps = ["placed", "packed", "shipped", "delivered"];
  const currentIndex = steps.indexOf(status);
  const cancelled = status === "cancelled";
  return (
    <div className={`order-progress${cancelled ? " order-progress-cancelled" : ""}`} aria-label={`Order status: ${orderStatusLabels[status] ?? status}`}>
      {cancelled ? <span className="status-pill status-cancelled">Cancelled</span> : steps.map((step, index) => (
        <div key={step} className={`progress-step${index <= currentIndex ? " is-complete" : ""}`}>
          <span className="progress-dot">{index < currentIndex ? <Check aria-hidden="true" /> : null}</span>
          <span>{orderStatusLabels[step]}</span>
        </div>
      ))}
    </div>
  );
}

export function OrdersPage() {
  const { user } = useShop();
  const userId = user?.id ?? "";
  const { data: orders } = useSuspenseQuery(ordersQueryOptions(userId));

  return (
    <div className="store-container page-container narrow-page">
      <PageTitle eyebrow="Your orders" title="Little things on their way" description="Follow the progress of your recent orders and revisit the details." />
      {orders.length ? (
        <div className="orders-list">
          {orders.map(({ order, items }) => (
            <article key={order.id} className="order-card">
              <div className="order-card-heading">
                <div><p className="eyebrow">Placed {formatDate(order.created_at)}</p><h2>{order.order_number}</h2></div>
                <strong>{formatPrice(order.total_amount)}</strong>
              </div>
              <OrderStatus status={order.status} />
              {order.tracking_number ? <p className="tracking-number"><PackageCheck aria-hidden="true" /> Tracking reference: <strong>{order.tracking_number}</strong></p> : null}
              <div className="order-item-list">
                {items.map((item) => (
                  <div className="order-item-line" key={item.id}>
                    <span>{item.quantity} × {item.product_name}</span>
                    <span>{formatPrice(item.line_total)}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state orders-empty">
          <PackageCheck aria-hidden="true" />
          <h2>No orders just yet</h2>
          <p>Your order updates will show up here.</p>
          <Button asChild><Link to="/">Find a little something <ArrowRight aria-hidden="true" /></Link></Button>
        </div>
      )}
    </div>
  );
}

export function SupportPage() {
  const { user } = useShop();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const { data: requests } = useSuspenseQuery(supportRequestsQueryOptions(userId));
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setError("");
    setSubmitting(true);
    const { error: insertError } = await supabase.from("support_requests").insert({
      user_id: userId,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSubmitting(false);
    if (insertError) {
      setError("Your message could not be sent. Please try again.");
      return;
    }
    setSubject("");
    setMessage("");
    setFeedback("Your note is with our care team.");
    await queryClient.invalidateQueries({ queryKey: ["shop", "support", userId] });
  }

  return (
    <div className="store-container page-container narrow-page">
      <PageTitle eyebrow="Care & support" title="We’re here for the little things" description="Send a note about an order, a product, or anything else we can help with." />
      <div className="support-layout">
        <section className="support-form-panel">
          <h2>Send a message</h2>
          <form onSubmit={submitRequest} className="stacked-form">
            <div className="form-field"><Label htmlFor="support-subject">What can we help with?</Label><Input id="support-subject" value={subject} onChange={(event) => setSubject(event.currentTarget.value)} required maxLength={120} /></div>
            <div className="form-field"><Label htmlFor="support-message">Your message</Label><Textarea id="support-message" value={message} onChange={(event) => setMessage(event.currentTarget.value)} required rows={5} maxLength={3000} /></div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {feedback ? <p className="form-success" role="status">{feedback}</p> : null}
            <Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send to care team"}</Button>
          </form>
        </section>
        <section className="support-history">
          <div className="section-title-row"><div><p className="eyebrow">Your notes</p><h2>Previous messages</h2></div><span className="address-count">{requests.length}</span></div>
          {requests.length ? requests.map((request) => (
            <article className="support-request-card" key={request.id}>
              <div className="support-request-heading"><strong>{request.subject}</strong><span className={`status-pill status-${request.status}`}>{request.status.replaceAll("_", " ")}</span></div>
              <p>{request.message}</p>
              <small>Sent {formatDate(request.created_at)}</small>
              {request.admin_reply ? <div className="support-reply"><strong>From the care team</strong><p>{request.admin_reply}</p></div> : null}
            </article>
          )) : <div className="empty-state support-empty"><p>Your previous messages will appear here.</p></div>}
        </section>
      </div>
    </div>
  );
}
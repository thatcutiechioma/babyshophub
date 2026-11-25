import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Archive, ArrowRight, Box, Check, CircleUserRound, ClipboardList, LifeBuoy, PackagePlus, Save, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useShop } from "@/components/shop-provider";
import { supabase } from "@/integrations/supabase/client";
import { adminDataQueryOptions, formatDate, formatPrice, orderStatusLabels } from "@/lib/shop-data";
import type { Product } from "@/lib/shop-data";

type ProductDraft = {
  name: string;
  slug: string;
  brand: string;
  category: string;
  description: string;
  price: string;
  compare_at_price: string;
  stock_quantity: string;
  image_url: string;
  badge: string;
  is_active: boolean;
};

const emptyProduct: ProductDraft = {
  name: "",
  slug: "",
  brand: "BabyShopHub",
  category: "clothing",
  description: "",
  price: "",
  compare_at_price: "",
  stock_quantity: "0",
  image_url: "/images/organic-romper.webp",
  badge: "",
  is_active: true,
};

const orderStatuses = ["placed", "packed", "shipped", "delivered", "cancelled"] as const;
const supportStatuses = ["open", "in_progress", "resolved"] as const;

function AdminSectionHeading({ icon: Icon, eyebrow, title, count }: { icon: typeof Box; eyebrow: string; title: string; count: number }) {
  return (
    <div className="admin-section-heading">
      <span className="admin-section-icon"><Icon aria-hidden="true" /></span>
      <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
      <span className="admin-count">{count}</span>
    </div>
  );
}

function productToDraft(product: Product): ProductDraft {
  return {
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    category: product.category,
    description: product.description,
    price: String(product.price),
    compare_at_price: product.compare_at_price === null ? "" : String(product.compare_at_price),
    stock_quantity: String(product.stock_quantity),
    image_url: product.image_url,
    badge: product.badge,
    is_active: product.is_active,
  };
}

export function AdminPage() {
  const { user, isAdmin } = useShop();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(adminDataQueryOptions);
  const [draft, setDraft] = useState<ProductDraft>(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderEdits, setOrderEdits] = useState<Record<string, { status: string; tracking: string }>>({});
  const [supportEdits, setSupportEdits] = useState<Record<string, { status: string; reply: string }>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user || !isAdmin) {
    return (
      <div className="store-container page-container narrow-page">
        <section className="empty-state admin-denied">
          <ShieldCheck aria-hidden="true" />
          <h1>Shop admin access only</h1>
          <p>This page is available to an authorized BabyShopHub admin.</p>
          <Button asChild variant="outline"><Link to="/">Back to the shop</Link></Button>
        </section>
      </div>
    );
  }

  async function refreshAdminData() {
    await queryClient.invalidateQueries({ queryKey: ["shop", "admin"] });
    await queryClient.invalidateQueries({ queryKey: ["shop", "products"] });
  }

  function editProduct(product: Product) {
    setEditingId(product.id);
    setDraft(productToDraft(product));
    setError("");
    setMessage("");
    document.getElementById("admin-product-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    const values = {
      name: draft.name.trim(),
      slug: draft.slug.trim().toLowerCase().replaceAll(" ", "-"),
      brand: draft.brand.trim(),
      category: draft.category,
      description: draft.description.trim(),
      price: Number(draft.price),
      compare_at_price: draft.compare_at_price.trim() ? Number(draft.compare_at_price) : null,
      stock_quantity: Math.max(0, Math.floor(Number(draft.stock_quantity))),
      image_url: draft.image_url,
      badge: draft.badge.trim(),
      is_active: draft.is_active,
      updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await supabase.from("products").update(values).eq("id", editingId)
      : await supabase.from("products").insert(values);
    setSaving(false);
    if (result.error) {
      setError("That product could not be saved. Check the name, price, and unique product link.");
      return;
    }
    setMessage(editingId ? "Product details updated." : "New product added to the collection.");
    setDraft(emptyProduct);
    setEditingId(null);
    await refreshAdminData();
  }

  async function archiveProduct(product: Product) {
    setError("");
    const { error: archiveError } = await supabase
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", product.id);
    if (archiveError) {
      setError("That product could not be archived.");
      return;
    }
    if (editingId === product.id) {
      setDraft(emptyProduct);
      setEditingId(null);
    }
    setMessage(`${product.name} is no longer shown in the shop.`);
    await refreshAdminData();
  }

  async function updateOrder(orderId: string) {
    const current = data.orders.find((order) => order.id === orderId);
    const draftValues = orderEdits[orderId];
    if (!current || !draftValues) return;
    setError("");
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: draftValues.status,
        tracking_number: draftValues.tracking.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (updateError) {
      setError("That order update could not be saved.");
      return;
    }
    setMessage(`Order ${current.order_number} is updated.`);
    await queryClient.invalidateQueries({ queryKey: ["shop", "admin"] });
    await queryClient.invalidateQueries({ queryKey: ["shop", "orders", current.user_id] });
  }

  async function updateSupportRequest(requestId: string) {
    const draftValues = supportEdits[requestId];
    if (!draftValues) return;
    setError("");
    const { error: updateError } = await supabase
      .from("support_requests")
      .update({
        status: draftValues.status,
        admin_reply: draftValues.reply.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    if (updateError) {
      setError("That support reply could not be saved.");
      return;
    }
    setMessage("Support response saved.");
    await queryClient.invalidateQueries({ queryKey: ["shop", "admin"] });
    const request = data.supportRequests.find((item) => item.id === requestId);
    if (request) await queryClient.invalidateQueries({ queryKey: ["shop", "support", request.user_id] });
  }

  async function setAdminAccess(userId: string, enabled: boolean) {
    setError("");
    const { error: roleError } = await supabase.rpc("set_user_admin", {
      p_user_id: userId,
      p_is_admin: enabled,
    });
    if (roleError) {
      setError(roleError.message.includes("last shop admin") ? "The last shop admin cannot remove their own access." : "Admin access could not be updated.");
      return;
    }
    setMessage(enabled ? "Shop admin access granted." : "Shop admin access removed.");
    await queryClient.invalidateQueries({ queryKey: ["shop", "admin"] });
    await queryClient.invalidateQueries({ queryKey: ["shop", "user-role", userId] });
  }

  return (
    <div className="store-container page-container admin-page">
      <div className="admin-page-header">
        <div><p className="eyebrow">BabyShopHub workspace</p><h1>Shop admin</h1><p>Keep the collection, orders, and care notes in good shape.</p></div>
        <span className="admin-self"><ShieldCheck aria-hidden="true" /> Admin access confirmed</span>
      </div>
      <div className="admin-stat-strip">
        <a href="#admin-products"><Box aria-hidden="true" /><strong>{data.products.filter((product) => product.is_active).length}</strong><span>Active products</span></a>
        <a href="#admin-orders"><ClipboardList aria-hidden="true" /><strong>{data.orders.length}</strong><span>Recent orders</span></a>
        <a href="#admin-users"><CircleUserRound aria-hidden="true" /><strong>{data.profiles.length}</strong><span>Shopper accounts</span></a>
        <a href="#admin-support"><LifeBuoy aria-hidden="true" /><strong>{data.supportRequests.filter((request) => request.status !== "resolved").length}</strong><span>Open care notes</span></a>
      </div>
      {error ? <p className="form-error admin-message" role="alert">{error}</p> : null}
      {message ? <p className="form-success admin-message" role="status">{message}</p> : null}

      <section className="admin-section" id="admin-products">
        <AdminSectionHeading icon={Box} eyebrow="Collection" title="Products & inventory" count={data.products.length} />
        <div className="admin-product-layout">
          <div className="admin-product-list">
            {data.products.map((product) => (
              <article className={`admin-product-row${product.is_active ? "" : " is-archived"}`} key={product.id}>
                <img src={product.image_url} alt="" />
                <div className="admin-product-info"><strong>{product.name}</strong><span>{formatPrice(product.price)} · {product.stock_quantity} in stock</span><small>{product.is_active ? "Shown in shop" : "Archived"}</small></div>
                <Button type="button" variant="outline" size="sm" onClick={() => editProduct(product)}>Edit</Button>
                {product.is_active ? <Button type="button" variant="ghost" size="icon" aria-label={`Archive ${product.name}`} title="Archive product" onClick={() => void archiveProduct(product)}><Archive aria-hidden="true" /></Button> : null}
              </article>
            ))}
          </div>
          <form id="admin-product-form" onSubmit={saveProduct} className="admin-form-panel stacked-form">
            <div className="section-title-row"><h3>{editingId ? "Edit a product" : "Add a product"}</h3>{editingId ? <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingId(null); setDraft(emptyProduct); }}>Cancel</Button> : null}</div>
            <div className="form-field"><Label htmlFor="product-name">Product name</Label><Input id="product-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })} required /></div>
            <div className="form-grid two-columns">
              <div className="form-field"><Label htmlFor="product-slug">Product link</Label><Input id="product-slug" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.currentTarget.value })} required /></div>
              <div className="form-field"><Label htmlFor="product-brand">Brand</Label><Input id="product-brand" value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.currentTarget.value })} required /></div>
              <div className="form-field"><Label htmlFor="product-price">Price (USD)</Label><Input id="product-price" type="number" min="0.01" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.currentTarget.value })} required /></div>
              <div className="form-field"><Label htmlFor="product-compare">Previous price</Label><Input id="product-compare" type="number" min="0.01" step="0.01" value={draft.compare_at_price} onChange={(event) => setDraft({ ...draft, compare_at_price: event.currentTarget.value })} /></div>
              <div className="form-field"><Label htmlFor="product-stock">Stock count</Label><Input id="product-stock" type="number" min="0" step="1" value={draft.stock_quantity} onChange={(event) => setDraft({ ...draft, stock_quantity: event.currentTarget.value })} required /></div>
              <div className="form-field"><Label htmlFor="product-category">Category</Label><Select value={draft.category} onValueChange={(value) => setDraft({ ...draft, category: value })}><SelectTrigger id="product-category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="clothing">Clothing</SelectItem><SelectItem value="feeding">Feeding</SelectItem><SelectItem value="diapers">Diapering</SelectItem><SelectItem value="toys">Toys</SelectItem><SelectItem value="nursery">Nursery</SelectItem></SelectContent></Select></div>
            </div>
            <div className="form-field"><Label htmlFor="product-image">Product photo</Label><Select value={draft.image_url} onValueChange={(value) => setDraft({ ...draft, image_url: value })}><SelectTrigger id="product-image"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="/images/organic-romper.webp">Cotton outfit</SelectItem><SelectItem value="/images/knit-bunny.webp">Knitted bunny</SelectItem><SelectItem value="/images/feeding-set.webp">Feeding set</SelectItem><SelectItem value="/images/diaper-stack.webp">Diaper essentials</SelectItem></SelectContent></Select></div>
            <div className="form-field"><Label htmlFor="product-badge">Small label</Label><Input id="product-badge" value={draft.badge} onChange={(event) => setDraft({ ...draft, badge: event.currentTarget.value })} maxLength={30} /></div>
            <div className="form-field"><Label htmlFor="product-description">Description</Label><Textarea id="product-description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })} rows={3} required /></div>
            <Button type="submit" disabled={saving}><PackagePlus aria-hidden="true" /> {saving ? "Saving…" : editingId ? "Save changes" : "Add to shop"}</Button>
          </form>
        </div>
      </section>

      <section className="admin-section" id="admin-orders">
        <AdminSectionHeading icon={ClipboardList} eyebrow="Order desk" title="Orders & tracking" count={data.orders.length} />
        {data.orders.length ? <div className="admin-order-list">{data.orders.map((order) => {
          const values = orderEdits[order.id] ?? { status: order.status, tracking: order.tracking_number };
          return <article className="admin-order-row" key={order.id}>
            <div className="admin-order-info"><strong>{order.order_number}</strong><span>{formatDate(order.created_at)} · {formatPrice(order.total_amount)}</span><small>Customer {order.user_id.slice(0, 8)}</small></div>
            <div className="form-field"><Label htmlFor={`order-status-${order.id}`}>Status</Label><Select value={values.status} onValueChange={(status) => setOrderEdits({ ...orderEdits, [order.id]: { ...values, status } })}><SelectTrigger id={`order-status-${order.id}`}><SelectValue /></SelectTrigger><SelectContent>{orderStatuses.map((status) => <SelectItem key={status} value={status}>{orderStatusLabels[status]}</SelectItem>)}</SelectContent></Select></div>
            <div className="form-field"><Label htmlFor={`order-tracking-${order.id}`}>Tracking reference</Label><Input id={`order-tracking-${order.id}`} value={values.tracking} onChange={(event) => setOrderEdits({ ...orderEdits, [order.id]: { ...values, tracking: event.currentTarget.value } })} placeholder="Add tracking reference" /></div>
            <Button type="button" variant="outline" onClick={() => void updateOrder(order.id)}><Save aria-hidden="true" /> Save update</Button>
          </article>;
        })}</div> : <p className="admin-empty-note">New orders will appear here.</p>}
      </section>

      <section className="admin-section" id="admin-users">
        <AdminSectionHeading icon={CircleUserRound} eyebrow="People" title="Shopper accounts" count={data.profiles.length} />
        {data.profiles.length ? <div className="admin-user-list">{data.profiles.map((profile) => {
          const admin = data.adminUserIds.includes(profile.user_id);
          return <article className="admin-user-row" key={profile.user_id}>
            <div className="user-avatar" aria-hidden="true">{profile.full_name.slice(0, 1).toUpperCase() || "S"}</div>
            <div className="admin-user-info"><strong>{profile.full_name || "New shopper"}</strong><span>{profile.phone || "No phone added"}</span><small>Joined {formatDate(profile.created_at)} · ID {profile.user_id.slice(0, 8)}</small></div>
            <span className={`role-pill${admin ? " role-pill-admin" : ""}`}>{admin ? "Shop admin" : "Shopper"}</span>
            {profile.user_id !== user.id ? <Button type="button" variant={admin ? "outline" : "secondary"} size="sm" onClick={() => void setAdminAccess(profile.user_id, !admin)}>{admin ? "Remove admin" : "Make admin"}</Button> : <span className="current-user-note">You</span>}
          </article>;
        })}</div> : <p className="admin-empty-note">New shopper accounts will appear here.</p>}
      </section>

      <section className="admin-section" id="admin-support">
        <AdminSectionHeading icon={LifeBuoy} eyebrow="Care desk" title="Support requests" count={data.supportRequests.length} />
        {data.supportRequests.length ? <div className="admin-support-list">{data.supportRequests.map((request) => {
          const values = supportEdits[request.id] ?? { status: request.status, reply: request.admin_reply };
          return <article className="admin-support-row" key={request.id}>
            <div className="support-request-heading"><strong>{request.subject}</strong><span>{formatDate(request.created_at)} · shopper {request.user_id.slice(0, 8)}</span></div>
            <p className="admin-support-message">{request.message}</p>
            <div className="admin-support-controls">
              <div className="form-field"><Label htmlFor={`support-status-${request.id}`}>Status</Label><Select value={values.status} onValueChange={(status) => setSupportEdits({ ...supportEdits, [request.id]: { ...values, status } })}><SelectTrigger id={`support-status-${request.id}`}><SelectValue /></SelectTrigger><SelectContent>{supportStatuses.map((status) => <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="form-field"><Label htmlFor={`support-reply-${request.id}`}>Reply</Label><Textarea id={`support-reply-${request.id}`} value={values.reply} onChange={(event) => setSupportEdits({ ...supportEdits, [request.id]: { ...values, reply: event.currentTarget.value } })} rows={2} placeholder="Write a note for the shopper" /></div>
              <Button type="button" variant="outline" onClick={() => void updateSupportRequest(request.id)}><Check aria-hidden="true" /> Save response</Button>
            </div>
          </article>;
        })}</div> : <p className="admin-empty-note">New care notes will appear here.</p>}
      </section>

      <div className="admin-footer-link"><Link to="/">Back to the shop <ArrowRight aria-hidden="true" /></Link></div>
    </div>
  );
}
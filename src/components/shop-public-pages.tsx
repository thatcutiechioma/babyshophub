import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  LockKeyhole,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
} from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useShop } from "@/components/shop-provider";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import {
  categoryOptions,
  formatDate,
  formatPrice,
  orderStatusLabels,
  productListQueryOptions,
  productQueryOptions,
  productReviewsQueryOptions,
} from "@/lib/shop-data";
import type { Product } from "@/lib/shop-data";

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

function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useShop();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addToCart(product.id, product.stock_quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="product-card">
      <div className="product-photo-wrap">
        <Link
          to="/products/$slug"
          params={{ slug: product.slug }}
          className="product-image-link"
          aria-label={`View ${product.name}`}
        >
          <img className="product-photo" src={product.image_url} alt={product.name} loading="lazy" />
        </Link>
        {product.badge ? <span className="product-badge">{product.badge}</span> : null}
      </div>
      <div className="product-card-copy">
        <div>
          <p className="product-brand">{product.brand}</p>
          <Link to="/products/$slug" params={{ slug: product.slug }} className="product-name">
            {product.name}
          </Link>
        </div>
        <div className="product-price-row">
          <span className="product-price">{formatPrice(product.price)}</span>
          {product.compare_at_price ? (
            <span className="product-compare-price">{formatPrice(product.compare_at_price)}</span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="product-add-button"
          onClick={handleAdd}
          disabled={product.stock_quantity < 1}
          aria-label={`Add ${product.name} to your bag`}
        >
          {added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {product.stock_quantity < 1 ? "Out of stock" : added ? "Added to bag" : "Add to bag"}
        </Button>
      </div>
    </article>
  );
}

export function ShopHomePage() {
  const { data: products } = useSuspenseQuery(productListQueryOptions);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filteredProducts = products.filter((product) => {
    const matchesCategory = category === "all" || product.category === category;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <section className="shop-hero">
        <div className="store-container hero-layout">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow">A little joy for every day</p>
            <h1>
              Little essentials,
              <br />
              <span>big on care.</span>
            </h1>
            <p className="hero-description">
              Thoughtfully chosen clothes, comforters, and everyday helpers for the newest person
              you love.
            </p>
            <div className="hero-actions">
              <Button asChild size="lg">
                <a href="#catalog">
                  Shop the collection <ArrowRight aria-hidden="true" />
                </a>
              </Button>
              <span className="hero-note">
                <ShieldCheck aria-hidden="true" />
                Made for little moments
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <img src="/images/babyshop-hero.webp" alt="Baby clothes, a knitted bunny, a bottle, and a teether" />
            <div className="hero-stamp">
              <span>soft</span>
              <span>starts</span>
              <SproutMark />
            </div>
          </div>
        </div>
      </section>

      <section className="store-container collection-section" id="catalog">
        <div className="collection-heading-row">
          <div>
            <p className="eyebrow">The little things</p>
            <h2>Good finds for growing days</h2>
          </div>
          <p className="collection-count">{products.length} hand-picked finds</p>
        </div>

        <div className="collection-tools">
          <div className="category-list" aria-label="Product categories">
            {categoryOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={category === option.value ? "default" : "outline"}
                size="sm"
                className="category-button"
                onClick={() => setCategory(option.value)}
                aria-pressed={category === option.value}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <label className="search-field">
            <Search aria-hidden="true" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Search the collection"
              aria-label="Search products by name, brand, or category"
            />
          </label>
        </div>

        {filteredProducts.length ? (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty-state collection-empty">
            <Search aria-hidden="true" />
            <h3>No little finds match that search</h3>
            <p>Try a different name or category.</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setCategory("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </section>

      <section className="store-container care-note-section">
        <div className="care-note">
          <span className="care-note-mark"><SproutMark /></span>
          <div>
            <p className="eyebrow">Picked for the everyday</p>
            <h2>Useful, lovely, ready for real life.</h2>
          </div>
          <p>From first feeds to favorite cuddles, find the pieces that make the day feel easier.</p>
          <Button asChild variant="secondary">
            <a href="#catalog">Browse all finds <ArrowRight aria-hidden="true" /></a>
          </Button>
        </div>
      </section>
    </>
  );
}

function SproutMark() {
  return <span className="sprout-mark" aria-hidden="true">✳</span>;
}

export function ProductDetailPage({ slug }: { slug: string }) {
  const { data: product } = useSuspenseQuery(productQueryOptions(slug));
  const { data: reviews } = useSuspenseQuery(productReviewsQueryOptions(product?.id ?? ""));
  const { user, addToCart } = useShop();
  const queryClient = useQueryClient();
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!product) {
    return (
      <section className="store-container page-container">
        <PageHeading eyebrow="The collection" title="That little find is missing" />
        <Button asChild variant="outline"><Link to="/">Back to the shop</Link></Button>
      </section>
    );
  }

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : 0;

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!user) {
      setError("Sign in to leave a review.");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const reviewerName = profile?.full_name || user.email?.split("@")[0] || "Shopper";
    const { error: saveError } = await supabase.from("product_reviews").upsert(
      {
        product_id: product.id,
        user_id: user.id,
        reviewer_name: reviewerName,
        rating,
        review_text: reviewText.trim(),
      },
      { onConflict: "product_id,user_id" },
    );
    if (saveError) {
      setError("Your review could not be saved. Please try again.");
      return;
    }
    setReviewText("");
    setMessage("Thank you — your review is saved.");
    await queryClient.invalidateQueries({ queryKey: ["shop", "reviews", product.id] });
  }

  return (
    <div className="store-container page-container">
      <Button asChild variant="ghost" className="back-link">
        <Link to="/"><ArrowLeft aria-hidden="true" /> Back to the shop</Link>
      </Button>
      <section className="product-detail-layout">
        <div className="detail-photo-frame">
          <img src={product.image_url} alt={product.name} className="detail-photo" />
          {product.badge ? <span className="product-badge detail-badge">{product.badge}</span> : null}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{product.brand} · {product.category}</p>
          <h1>{product.name}</h1>
          <div className="detail-rating">
            {reviews.length ? (
              <>
                <span className="rating-stars" aria-label={`${averageRating.toFixed(1)} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} aria-hidden="true" className={index < Math.round(averageRating) ? "star-filled" : "star-empty"} />
                  ))}
                </span>
                <span>{averageRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
              </>
            ) : (
              <span>Be the first to review this find</span>
            )}
          </div>
          <div className="detail-price-row">
            <span>{formatPrice(product.price)}</span>
            {product.compare_at_price ? <del>{formatPrice(product.compare_at_price)}</del> : null}
          </div>
          <p className="detail-description">{product.description}</p>
          <p className="stock-note">
            <PackageCheck aria-hidden="true" />
            {product.stock_quantity > 0 ? `${product.stock_quantity} ready for a new home` : "Currently out of stock"}
          </p>
          <Button
            type="button"
            size="lg"
            className="detail-add-button"
            disabled={product.stock_quantity < 1}
            onClick={() => addToCart(product.id, product.stock_quantity)}
          >
            <ShoppingBag aria-hidden="true" /> Add to bag
          </Button>
          <div className="detail-assurances">
            <span><Truck aria-hidden="true" /> Delivery details at checkout</span>
            <span><ShieldCheck aria-hidden="true" /> Secure account checkout</span>
          </div>
        </div>
      </section>

      <section className="reviews-section">
        <div className="review-heading-row">
          <div>
            <p className="eyebrow">From the family</p>
            <h2>Little notes from shoppers</h2>
          </div>
          <span className="review-count">{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
        </div>
        <div className="reviews-layout">
          <div className="review-list">
            {reviews.length ? (
              reviews.map((review) => (
                <article key={review.id} className="review-entry">
                  <div className="review-entry-top">
                    <strong>{review.reviewer_name}</strong>
                    <span>{formatDate(review.created_at)}</span>
                  </div>
                  <span className="rating-stars" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: review.rating }, (_, index) => <Star key={index} aria-hidden="true" className="star-filled" />)}
                  </span>
                  {review.review_text ? <p>{review.review_text}</p> : null}
                </article>
              ))
            ) : (
              <div className="empty-state review-empty">
                <Star aria-hidden="true" />
                <h3>A first note would be lovely</h3>
                <p>Share what you think of this little find.</p>
              </div>
            )}
          </div>
          <div className="review-form-panel">
            <h3>Leave a review</h3>
            {user ? (
              <form onSubmit={submitReview} className="stacked-form">
                <div className="form-field">
                  <Label>Your rating</Label>
                  <div className="rating-picker" role="radiogroup" aria-label="Choose a rating">
                    {Array.from({ length: 5 }, (_, index) => {
                      const value = index + 1;
                      return (
                        <Button
                          key={value}
                          type="button"
                          variant="ghost"
                          size="icon"
                          role="radio"
                          aria-checked={rating === value}
                          aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                          onClick={() => setRating(value)}
                        >
                          <Star aria-hidden="true" className={value <= rating ? "star-filled" : "star-empty"} />
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-field">
                  <Label htmlFor="review-text">Your note</Label>
                  <Textarea id="review-text" value={reviewText} onChange={(event) => setReviewText(event.currentTarget.value)} placeholder="What did your family think?" required />
                </div>
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                {message ? <p className="form-success" role="status">{message}</p> : null}
                <Button type="submit">Save review</Button>
              </form>
            ) : (
              <div className="review-signin-note">
                <p>Sign in to share your note with other shoppers.</p>
                <Button asChild variant="outline"><Link to="/auth">Sign in to review</Link></Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function CartPage() {
  const { data: products } = useSuspenseQuery(productListQueryOptions);
  const { cart, setQuantity, removeFromCart } = useShop();
  const cartRows = cart.flatMap((line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    return product ? [{ product, quantity: line.quantity }] : [];
  });
  const subtotal = cartRows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  const missingCount = cart.length - cartRows.length;

  return (
    <div className="store-container page-container narrow-page">
      <PageHeading eyebrow="Your bag" title="A few lovely things" description="Take a look through your little finds before checkout." />
      {missingCount ? <p className="form-error">One or more items are no longer in the collection. Remove them to continue.</p> : null}
      {cartRows.length ? (
        <div className="cart-layout">
          <div className="cart-items-list">
            {cartRows.map(({ product, quantity }) => (
              <article key={product.id} className="cart-row">
                <Link to="/products/$slug" params={{ slug: product.slug }} className="cart-row-image">
                  <img src={product.image_url} alt={product.name} />
                </Link>
                <div className="cart-row-copy">
                  <p className="product-brand">{product.brand}</p>
                  <Link to="/products/$slug" params={{ slug: product.slug }} className="product-name">{product.name}</Link>
                  <span className="product-price">{formatPrice(product.price)}</span>
                  <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
                    <Button type="button" variant="ghost" size="icon" aria-label="Decrease quantity" onClick={() => setQuantity(product.id, quantity - 1)}>
                      <Minus aria-hidden="true" />
                    </Button>
                    <span aria-live="polite">{quantity}</span>
                    <Button type="button" variant="ghost" size="icon" aria-label="Increase quantity" disabled={quantity >= product.stock_quantity} onClick={() => setQuantity(product.id, Math.min(product.stock_quantity, quantity + 1))}>
                      <Plus aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <div className="cart-row-end">
                  <strong>{formatPrice(product.price * quantity)}</strong>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${product.name}`} onClick={() => removeFromCart(product.id)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <aside className="order-summary">
            <h2>Order summary</h2>
            <div className="summary-line"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
            <div className="summary-line"><span>Delivery</span><span>Added at checkout</span></div>
            <div className="summary-total"><span>Estimated total</span><strong>{formatPrice(subtotal)}</strong></div>
            <Button asChild size="lg" className="w-full" disabled={missingCount > 0}>
              <Link to="/checkout">Continue to checkout <ArrowRight aria-hidden="true" /></Link>
            </Button>
            <Button asChild variant="link" className="cart-continue"><Link to="/">Keep browsing</Link></Button>
            <p className="demo-payment-note"><LockKeyhole aria-hidden="true" /> Demo checkout only — no card is charged.</p>
          </aside>
        </div>
      ) : (
        <div className="empty-state bag-empty">
          <ShoppingBag aria-hidden="true" />
          <h2>Your bag is ready for a little something</h2>
          <p>Browse the collection and add a few favorites.</p>
          <Button asChild><Link to="/">Browse the shop <ArrowRight aria-hidden="true" /></Link></Button>
        </div>
      )}
    </div>
  );
}

type SafeDestination = "/" | "/account" | "/checkout" | "/orders" | "/support" | "/admin";

function safeDestination(value?: string): SafeDestination {
  if (!value || !value.startsWith("/")) return "/account";
  const path = value.split(/[?#]/)[0];
  const allowed: SafeDestination[] = ["/", "/account", "/checkout", "/orders", "/support", "/admin"];
  return allowed.includes(path as SafeDestination) ? (path as SafeDestination) : "/account";
}

export function AuthPage({ returnTo }: { returnTo?: string }) {
  const navigate = useNavigate();
  const { user, authLoading } = useShop();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const destination = safeDestination(returnTo);

  useEffect(() => {
    if (!authLoading && user) void navigate({ to: destination, replace: true });
  }, [authLoading, destination, navigate, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (signupError) throw signupError;
        if (!data.session) {
          setNotice("Check your email to confirm your account, then come back to sign in.");
          return;
        }
      } else {
        const { error: signinError } = await supabase.auth.signInWithPassword({ email, password });
        if (signinError) throw signinError;
      }
      await navigate({ to: destination, replace: true });
    } catch {
      setError(mode === "signup" ? "We could not create that account. Check your details and try again." : "Those sign-in details did not work. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function socialSignIn(provider: "google" | "lovable") {
    setNotice("");
    setError("");
    const redirectUri = `${window.location.origin}/auth?returnTo=${encodeURIComponent(destination)}`;
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectUri });
    if (result.error) {
      setError("That sign-in option is not available right now. Please try email instead.");
      return;
    }
    if (result.redirected) return;
    await navigate({ to: destination, replace: true });
  }

  return (
    <div className="store-container auth-layout page-container">
      <div className="auth-art-panel">
        <img src="/images/babyshop-hero.webp" alt="Soft baby clothes and a knitted bunny" />
        <div className="auth-art-caption">
          <p className="eyebrow">For the days that matter</p>
          <h1>Welcome to the little things.</h1>
        </div>
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">Your BabyShopHub account</p>
        <h2 id="auth-title">{mode === "signup" ? "Make room for lovely" : "Good to see you"}</h2>
        <p className="auth-copy">Keep your delivery details close and your orders easy to follow.</p>
        <div className="social-auth-buttons">
          <Button type="button" variant="outline" className="google-auth-button" onClick={() => void socialSignIn("google")}>
            <GoogleMark /> Continue with Google
          </Button>
          <Button type="button" variant="outline" className="lovable-auth-button" onClick={() => void socialSignIn("lovable")}>
            <LovableMark /> Continue with Lovable
          </Button>
        </div>
        <div className="auth-divider"><span>or use email</span></div>
        <form onSubmit={submit} className="stacked-form">
          {mode === "signup" ? (
            <div className="form-field">
              <Label htmlFor="signup-name">Your name</Label>
              <Input id="signup-name" autoComplete="name" value={name} onChange={(event) => setName(event.currentTarget.value)} required />
            </div>
          ) : null}
          <div className="form-field">
            <Label htmlFor="auth-email">Email address</Label>
            <Input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} required />
          </div>
          <div className="form-field">
            <div className="label-with-link">
              <Label htmlFor="auth-password">Password</Label>
              {mode === "signin" ? <Link to="/forgot-password" className="text-link">Forgot password?</Link> : null}
            </div>
            <Input id="auth-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} value={password} onChange={(event) => setPassword(event.currentTarget.value)} required />
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {notice ? <p className="form-success" role="status">{notice}</p> : null}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>
        <p className="auth-switch">
          {mode === "signup" ? "Already have an account?" : "New to BabyShopHub?"}{" "}
          <Button type="button" variant="link" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setNotice(""); }}>
            {mode === "signup" ? "Sign in" : "Create an account"}
          </Button>
        </p>
      </section>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="google-mark" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (resetError) {
      setError("We could not send a reset link right now. Please check the address and try again.");
      return;
    }
    setMessage("If an account uses that email, a reset link is on its way.");
  }

  return (
    <div className="store-container page-container narrow-page">
      <Button asChild variant="ghost" className="back-link"><Link to="/auth"><ArrowLeft aria-hidden="true" /> Back to sign in</Link></Button>
      <section className="simple-form-panel">
        <p className="eyebrow">Account help</p>
        <h1>Let’s get you back in</h1>
        <p>Enter your account email and we’ll send a link to choose a new password.</p>
        <form onSubmit={submit} className="stacked-form">
          <div className="form-field"><Label htmlFor="reset-email">Email address</Label><Input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} autoComplete="email" required /></div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {message ? <p className="form-success" role="status">{message}</p> : null}
          <Button type="submit" size="lg" disabled={submitting}>{submitting ? "Sending…" : "Send reset link"}</Button>
        </form>
      </section>
    </div>
  );
}

export function ResetPasswordPage() {
  const [recoverySession, setRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    setRecoverySession(new URLSearchParams(hash).get("type") === "recovery");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!recoverySession) {
      setError("Open this page from the password-reset link in your email.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Those passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError("We could not update your password. Please request a new reset link.");
      return;
    }
    setMessage("Your password has been updated. You can sign in with it now.");
  }

  return (
    <div className="store-container page-container narrow-page">
      <section className="simple-form-panel">
        <p className="eyebrow">Account help</p>
        <h1>Choose a new password</h1>
        <p>Use the link from your email to set a new password for your account.</p>
        <form onSubmit={submit} className="stacked-form">
          <div className="form-field"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.currentTarget.value)} required /></div>
          <div className="form-field"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.currentTarget.value)} required /></div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {message ? <p className="form-success" role="status">{message}</p> : null}
          <Button type="submit" size="lg" disabled={submitting}>{submitting ? "Saving…" : "Save new password"}</Button>
        </form>
        {message ? <Button asChild variant="link"><Link to="/auth">Go to sign in</Link></Button> : null}
      </section>
    </div>
  );
}
# BabyShopHub

## Goal
Turn the uploaded BabyShopHub brief into a usable, phone-friendly baby-products shop.

## What to build
- Product browsing with categories, search, product details, reviews, and an editable cart.
- Lovable Cloud accounts with saved profile and delivery details, plus order history and status tracking.
- Demo-only checkout with no real payment processing or stored card numbers.
- A role-protected admin area for products, inventory, orders, users, and support requests.
- A coordinated shop identity and responsive layouts, with route-specific page metadata.

## Data and access
- Store products, profiles, addresses, reviews, orders, and support requests in Lovable Cloud with row-level access rules.
- Create profiles automatically for new accounts; keep admin roles in a separate protected role table.
- Never let users grant themselves admin access. The first admin assignment may need the owner's account to exist first.

## Assumptions
- Build a web storefront that also works well on phones, adapting the mobile-app brief to this project.
- Use invented sample products, images, and prices for the initial catalog.
- Demo checkout records orders but does not charge customers or collect card details.

## Technical details
- Use TanStack Start routes and the existing project design system.
- Use Cloud Auth for account access and database policies for each user's private records.
- Seed the initial catalog with the database schema change so the first screen is populated.

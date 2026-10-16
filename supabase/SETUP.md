# Supabase Backend Setup — The Hyper Store

This turns the site into a full backend-powered store: product catalog +
inventory, customer accounts, orders, and reviews — all stored in Supabase
(a hosted Postgres database with built-in authentication and security
rules). No server to run; the site talks to Supabase directly over HTTPS.

## 1. Create a Supabase project

1. Go to https://supabase.com and sign up / log in (free tier is enough).
2. Click **New Project**. Pick any name/region, and set a database password
   (save it somewhere — you likely won't need it day-to-day, Supabase
   manages the connection for you).
3. Wait ~2 minutes for the project to finish provisioning.

## 2. Run the database schema

1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/schema.sql` from this repo, copy its entire contents,
   paste into the SQL editor, and click **Run**.
3. This creates all tables (`products`, `profiles`, `orders`, `order_items`,
   `reviews`), the security rules (Row Level Security policies), and seeds
   your 6 existing products so the store isn't empty.

If you ever need to reset things, you can re-run the file — it's written
to be safe to run multiple times.

## 3. Connect the website to your project

1. In Supabase: **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `js/config.js` in this repo and paste them in:

   ```js
   window.SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   window.SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```

4. Save. The anon key is safe to put in client-side code — it only grants
   whatever the security policies in `schema.sql` allow (that's the whole
   point of Row Level Security).

## 4. Create your admin (password-protected) account

The admin dashboard (`admin.html`) is protected by a real login — not just
a UI password box, but Supabase Auth + database-enforced permissions. Only
an account flagged `role = admin` can add products, change stock, or update
orders; the database itself refuses the request otherwise.

1. Open your live site → `account.html` → **Create one** → sign up with
   your own email + password.
2. In Supabase: **Table Editor** → `profiles` table. Find the row with your
   email, click the `role` cell, change `customer` → `admin`, save.
3. Go to `admin.html` on your site and sign in with that same email and
   password. You now have full dashboard access.

You can repeat step 2 for any other staff accounts you want to give admin
access to. Everyone else who signs up stays a regular customer and only
ever sees their own orders.

## 5. What you get

- **account.html** — customer sign up / sign in / order history.
- **cart.html / checkout.html** — cart stored in the browser, checkout
  writes a real order (with live stock-check) to Supabase.
- **admin.html** — password-protected dashboard:
  - **Insights**: total revenue, order count, customer count, low-stock
    alerts, top-selling products, recent orders.
  - **Products & Inventory**: add/edit/delete products, edit stock counts
    inline, hide products from the storefront without deleting them.
  - **Orders**: see every order with items, update status
    (pending → paid → shipped → delivered / cancelled).
  - **Reviews**: see and moderate (delete) any review.
- **Product pages**: real star-rating reviews, pulled live from Supabase,
  with a submission form shown to any signed-in customer.

## 6. Optional next steps

- Add real product photos: upload to Supabase **Storage** (create a public
  bucket) and paste the public URL into the product's "Image URL" field in
  the admin dashboard.
- Add more admins any time via the same `profiles.role` edit in step 4.
- Supabase's free tier covers a small-to-medium store comfortably; upgrade
  only if you outgrow it.

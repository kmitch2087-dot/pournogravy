# Pournogravy — Owner's User Manual
**Your quick-reference guide for running the site**
**Prepared by:** Kristin Mitchell — Aethyx
**Last Updated:** April 29, 2026

---

> **Not a tech person? That's fine.** This guide is written for you. If something isn't working or you're not sure how to do something, contact Kristin at Aethyx before touching anything.

---

## Table of Contents
1. [The Big Picture — How Your Site Works](#1-the-big-picture)
2. [Viewing Your Live Site](#2-viewing-your-live-site)
3. [Logging Into Your Admin Dashboard](#3-admin-dashboard)
4. [Managing Products](#4-managing-products)
5. [Viewing Custom Garment Requests](#5-viewing-custom-garment-requests)
6. [Viewing Orders](#6-viewing-orders)
7. [What You Can Change vs. What Needs a Developer](#7-what-you-can-vs-cannot-change)
8. [Who to Call When Things Break](#8-who-to-call)
9. [Glossary — Terms You'll See](#9-glossary)

---

## 1. The Big Picture

Your website has three main parts:

| Part | What It Is | Where You Access It |
|------|-----------|-------------------|
| **The storefront** | What customers see at pournogravy.com | Any web browser |
| **The admin dashboard** | Where you manage orders and requests | pournogravy.com/admin |
| **The database** | Behind-the-scenes storage (backup access) | Supabase dashboard (supabase.com) |
| **The code** | The files that make the site work | GitHub (you don't touch this directly) |

**The most important thing to know:** Your admin dashboard at `/admin` is your main management tool. Supabase is the backup option if you ever need to look at raw data.

---

## 2. Viewing Your Live Site

**Your website:** [pournogravy.com](https://pournogravy.com)

To check if everything looks right:
1. Open any web browser (Chrome, Safari, Firefox — doesn't matter)
2. Go to pournogravy.com
3. Check the homepage, the shop, and a couple of product pages

**If the site looks broken or blank:** Contact Kristin immediately. Do not try to fix it yourself.

---

## 3. Logging Into Your Admin Dashboard

Your admin dashboard is at **pournogravy.com/admin**.

To log in:
1. Go to [pournogravy.com/admin](https://pournogravy.com/admin)
2. Click "Login" if you're not already at the login screen
3. Enter your admin email (aopie91@gmail.com) and your password
4. You'll be redirected to the dashboard

> **Can't log in?** Contact Kristin. Admin access is controlled by an allowlist — only your email and Kristin's emails are permitted. Nobody else can ever get in, even with the right password.

### What You'll See in the Dashboard
- **Orders** — all orders and their status (pending, paid, fulfilled, cancelled)
- **Custom Requests** — all custom garment form submissions
- **Products** — product management (edit, upload images)
- **Settings** — site-wide configuration

> **Note as of April 2026:** The dashboard is fully built. Payment processing (Stripe) is still being activated, so "paid" orders won't appear until that's complete.

---

## 4. Managing Products

### How Products Currently Work
Products live in the code (a file called `products.ts`). The admin product editor is built and available at `/admin` — you can edit product info and upload images there. A developer needs to be involved for adding brand new products to the catalog until the full DB-backed product system is activated.

Here's what controls whether a product appears on the site:

| Setting | What It Does |
|---------|-------------|
| `published: true` | Product shows up in the shop and can be purchased |
| `featured: true` | Product also shows up in the homepage hero and featured row |
| Neither flag | Product exists but is hidden from customers — a "draft" |

### To Add or Change a Product
Contact Kristin. Provide:
- Product name
- Price
- Description (short and long)
- Humor/tagline (the one-liner shown under the product name)
- Sizes available
- Images (high-res PNG or JPG)
- Whether it should be featured on the homepage

---

## 5. Viewing Custom Garment Requests

When a customer fills out the "Request a Custom Garment" form on any product page, their info appears in your admin dashboard.

### Via Admin Dashboard (Preferred)
1. Go to [pournogravy.com/admin](https://pournogravy.com/admin)
2. Look for the "Custom Requests" section
3. Click any request to see the full details

### Via Supabase (Backup)
1. Go to [supabase.com](https://supabase.com) and log in
2. Select the **Pournogravy** project
3. Click **Table Editor** → **custom_requests**

You'll see:
- Customer name, email, phone
- What garment they want
- Which design they referenced
- Any notes
- Status (new / contacted / quoted / closed)

### Updating Request Status
When you've followed up with a customer, change the `status` field:
- `new` → they just submitted
- `contacted` → you've reached out
- `quoted` → you've sent a price
- `closed` → done

> **Tip:** Respond to new requests within 24–48 hours while interest is hot. Custom orders are a premium revenue opportunity.

---

## 6. Viewing Orders

> **Note:** Payment processing (Stripe) is built but not yet fully activated as of April 2026. Once it's live, paid orders will appear here automatically.

### Via Admin Dashboard
1. Go to [pournogravy.com/admin](https://pournogravy.com/admin)
2. Click **Orders** in the navigation

### Via Supabase (Backup)
1. Go to [supabase.com](https://supabase.com)
2. Select the **Pournogravy** project
3. Click **Table Editor** → **orders**

Order statuses:
| Status | Meaning |
|--------|---------|
| `pending` | Cart was created, payment not yet processed |
| `paid` | Payment confirmed — needs to be fulfilled |
| `fulfilled` | Order shipped |
| `cancelled` | Order cancelled |
| `refunded` | Refund issued |

---

## 7. What You Can vs. Cannot Change

### ✅ You Can Do These Yourself (via Admin Dashboard)
- View and manage custom garment requests (update status)
- View orders (once payment is active)
- Edit product details and upload product images

### 🛑 These Need a Developer (Contact Kristin)
- Adding brand new products to the catalog
- Changing prices (until DB-backed products are live)
- Changing the site design or layout
- Adding new pages
- Activating Stripe payment processing (technical configuration)
- Connecting to a fulfillment partner (Printful/Printify)
- Changing the domain or hosting
- Anything where something stopped working

### 📝 These Are Coming Soon (Roadmap)
- Fully DB-backed product management (add products without a code deploy)
- Discount codes / promo codes
- Email marketing integration
- Automatic order fulfillment via Printful/Printify

---

## 8. Who to Call When Things Break

**Kristin Mitchell — Aethyx**
- For: anything related to the code, the site going down, a feature not working, adding products
- How to reach her: [your preferred contact method]

**Supabase Support**
- For: if you can't log into the Supabase dashboard itself
- support.supabase.com

**Cloudflare Support**
- For: if the domain (pournogravy.com) stops resolving or shows a security error
- cloudflare.com/support

**Stripe Support**
- For: questions about payments once Stripe is active
- support.stripe.com

> **Golden Rule:** If you're not 100% sure what you're doing, don't do it. One wrong click in the database can affect real customers. Always ask first.

---

## 9. Glossary — Terms You'll See

| Term | Plain English |
|------|--------------|
| **Frontend** | The part of the website customers see and interact with |
| **Backend / Database** | Behind-the-scenes storage for orders, customers, requests |
| **Supabase** | The service that hosts your database (like a secure cloud spreadsheet) |
| **GitHub** | Where your website's code lives — like Google Drive but for code |
| **Cloudflare Pages** | The service that hosts and delivers your website to visitors worldwide |
| **Edge Functions** | Small programs that run in the cloud to handle payments, emails, etc. |
| **RLS (Row-Level Security)** | Security rules that ensure customers can only see their own data |
| **Deploy** | Publishing a new version of the site so changes go live |
| **Stripe** | The payment processor (like Square or PayPal, but better for online stores) |
| **Resend** | The email service that sends order confirmation emails |
| **Printful / Printify** | Print-on-demand partners that print and ship your orders automatically |
| **CDN** | Content Delivery Network — servers worldwide that make your site load fast |
| **published** | Product flag that makes it visible in the shop |
| **featured** | Product flag that puts it on the homepage |
| **custom_requests** | Where custom garment form submissions are stored |
| **Admin Dashboard** | Your private management area at pournogravy.com/admin |

---

*Document maintained by Aethyx. For questions, contact Kristin Mitchell.*

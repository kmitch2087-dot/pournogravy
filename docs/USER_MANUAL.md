# Pournogravy — Owner's User Manual
**Your quick-reference guide for running the site**
**Prepared by:** Kristin Mitchell — Aethyx
**Last Updated:** April 28, 2026

---

> **Not a tech person? That's fine.** This guide is written for you. If something isn't working or you're not sure how to do something, contact Kristin at Aethyx before touching anything.

---

## Table of Contents
1. [The Big Picture — How Your Site Works](#1-the-big-picture)
2. [Viewing Your Live Site](#2-viewing-your-live-site)
3. [Managing Products](#3-managing-products)
4. [Viewing Custom Garment Requests](#4-viewing-custom-garment-requests)
5. [Viewing Orders (When Payment is Live)](#5-viewing-orders)
6. [What You Can Change vs. What Needs a Developer](#6-what-you-can-vs-cannot-change)
7. [Who to Call When Things Break](#7-who-to-call)
8. [Glossary — Terms You'll See](#8-glossary)

---

## 1. The Big Picture

Your website has three main parts:

| Part | What It Is | Where You Access It |
|------|-----------|-------------------|
| **The storefront** | What customers see at pournogravy.com | Any web browser |
| **The database** | Where orders, carts, and custom requests are stored | Supabase dashboard (supabase.com) |
| **The code** | The actual files that make the site work | GitHub (you don't touch this directly) |

**The most important thing to know:** The storefront is your public-facing website. The Supabase dashboard is your back-office. You'll mostly be spending time in Supabase to see what's happening with orders and requests.

---

## 2. Viewing Your Live Site

**Your website:** [pournogravy.com](https://pournogravy.com)

To check if everything looks right:
1. Open any web browser (Chrome, Safari, Firefox — doesn't matter)
2. Go to pournogravy.com
3. Check the homepage, the shop, and a couple of product pages

**If the site looks broken or blank:** Contact Kristin immediately. Do not try to fix it yourself.

---

## 3. Managing Products

### How Products Work
Products live in the code (a file called `products.ts`). To add, remove, or update a product, a developer needs to edit that file. **You cannot add products yourself through a dashboard yet** — this is on the roadmap.

However, here's what controls whether a product appears on the site:

| Setting | What It Does |
|---------|-------------|
| `published: true` | Product shows up in the shop and can be purchased |
| `featured: true` | Product also shows up in the homepage hero and featured row |
| Neither flag | Product exists in the code but is hidden from customers — a "draft" |

### Current Published Products (as of April 2026)
- I Would Totally Tap That - Keg
- Pournogravy Logo Tee
- Last Call for Karen *(featured)*
- Service Bartender, Do Not Approach *(featured)*
- And others — check the shop page for the full live list

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

## 4. Viewing Custom Garment Requests

When a customer fills out the "Request a Custom Garment" form on a product page, their info is saved in your Supabase database.

### How to See Requests

1. Go to [supabase.com](https://supabase.com) and log in
2. Select the **Pournogravy** project
3. In the left sidebar, click **Table Editor**
4. Click on the **custom_requests** table

You'll see a list of all submitted requests with:
- Customer name, email, phone
- What garment they want
- Which design they referenced
- Any notes they added
- Status (new, contacted, quoted, closed)

### Updating Request Status

When you've followed up with a customer:
1. Click on the row in the table
2. Find the `status` column
3. Change it from `new` to `contacted` (or `quoted` once you've sent a price, `closed` when done)
4. Click **Save**

> **Tip:** Respond to new requests within 24–48 hours while interest is hot. Custom orders are a premium revenue opportunity.

---

## 5. Viewing Orders

> **Note:** Payment processing (Stripe) is not yet connected as of April 2026. Once it's live, orders will appear here automatically.

### How to See Orders (Once Payment is Live)

1. Go to [supabase.com](https://supabase.com) and log in
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

## 6. What You Can vs. Cannot Change

### ✅ You Can Do These Yourself (via Supabase)
- View and respond to custom garment requests (update status)
- View orders (once payment is live)
- See how many items are in customers' carts (cart_items table)

### 🛑 These Need a Developer (Contact Kristin)
- Adding, removing, or editing products
- Changing prices
- Updating product photos
- Changing the site design or layout
- Adding new pages
- Setting up payment processing
- Connecting to a fulfillment partner (Printful/Printify)
- Changing the domain or hosting
- Anything where something stopped working

### 📝 These Are Coming Soon (Roadmap)
- An admin dashboard so you can manage products without touching Supabase
- Discount codes
- Email marketing integration
- Order fulfillment automation

---

## 7. Who to Call When Things Break

**Kristin Mitchell — Aethyx**
- For: anything related to the code, the site going down, a feature not working, adding products
- How to reach her: [your preferred contact method here]

**Supabase Support**
- For: if you can't log into the Supabase dashboard
- support.supabase.com

**Cloudflare Support**
- For: if the domain (pournogravy.com) stops resolving or shows a security error
- cloudflare.com/support

> **Golden Rule:** If you're not 100% sure what you're doing, don't do it. One wrong click in the database can affect real customers. Always ask first.

---

## 8. Glossary — Terms You'll See

| Term | Plain English |
|------|--------------|
| **Frontend** | The part of the website customers see and interact with |
| **Backend / Database** | The behind-the-scenes storage for orders, customers, requests |
| **Supabase** | The service that hosts your database (like a cloud spreadsheet with security) |
| **GitHub** | Where your website's code lives — like Google Drive but for code |
| **Cloudflare Pages** | The service that hosts and delivers your website to visitors worldwide |
| **RLS (Row-Level Security)** | Security rules that ensure customers can only see their own data |
| **Deploy** | Publishing a new version of the site so changes go live |
| **TypeScript / React** | Programming languages used to build your site |
| **CDN** | Content Delivery Network — servers worldwide that make your site load fast everywhere |
| **published** | Product flag that makes it visible in the shop |
| **featured** | Product flag that puts it on the homepage |
| **custom_requests table** | Where custom garment form submissions are stored |

---

*Document maintained by Aethyx. For questions, contact Kristin Mitchell.*

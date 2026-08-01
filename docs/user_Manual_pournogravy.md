# Pournogravy — Owner's User Manual
**Your quick-reference guide for running the site**
**Prepared by:** Kristin Mitchell — Aethyx
**Last Updated:** August 1, 2026 (added Finances & Reports section)

---

> **Not a tech person? That's fine.** This guide is written for you. If something isn't working or you're not sure how to do something, contact Kristin at Aethyx before touching anything.

---

## Table of Contents
1. [The Big Picture — How Your Site Works](#1-the-big-picture)
2. [Viewing Your Live Site](#2-viewing-your-live-site)
3. [Logging Into Your Admin Dashboard](#3-admin-dashboard)
4. [Managing Products](#4-managing-products)
5. [Editing Site Copy (Headlines, FAQs, CTAs)](#5-editing-site-copy)
6. [Viewing Custom Garment Requests](#6-viewing-custom-garment-requests)
7. [Viewing Orders](#7-viewing-orders)
8. [Finances & Reports](#8-finances-and-reports)
9. [What You Can Change vs. What Needs a Developer](#9-what-you-can-vs-cannot-change)
10. [Who to Call When Things Break](#10-who-to-call)
11. [Glossary — Terms You'll See](#11-glossary)

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
- **Dashboard** — overview of recent orders and requests
- **Orders** — all orders and their status (pending, paid, fulfilled, cancelled)
- **Products** — product management (edit, upload images)
- **Custom Requests** — all custom garment form submissions
- **Reviews** — approve or reject customer reviews before they go live
- **Discount Codes** — create and manage promo codes
- **Pour Points** — loyalty program — view member balances, transaction history, manual adjustments
- **Customers** — look up any customer by email; see their order history, points balance, wishlist
- **Subscribers** — email list, subscriber growth sparkline, CSV export
- **Analytics** — page views, event funnel, top pages
- **Content** — edit your site's headlines, CTAs, FAQ answers, and other copy live (see Section 5)
- **Merch Drops** — schedule upcoming product drops with ad placement and marketing emails
- **Edit Requests** — your notes to Kristin; she replies here with inline threads
- **Finances** — your money dashboard: reports, payouts, expenses, product costs, printer invoices, and the year-end tax packet (see Section 8)
- **Settings** — site-wide configuration

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

### Heading Note (the line under the title) — new
When you edit a product, the **COPY** section has a **"Heading Note"** box at the very top with an on/off toggle. It's **off by default**. When you turn it on and type something, that text shows on the product page **right under the product title** (above the reviews and the yellow tagline).

- Use it for things like **"Multiple designs available below."** on a shirt that has male/female or other style versions.
- Leave it **off** on products that don't need it — nothing shows when it's off or empty.
- It's a rich-text box: hit **Enter** to start a new paragraph and the break shows on the live page.

### Style Label (naming the style buttons) — new
When two or more products are linked as a **Style Group** (e.g. a Male and a Female version), the product page shows little buttons so shoppers can switch between them. In the **STYLE GROUP** box on the edit page, fill in the **"Style Label"** field (e.g. `Men's`, `Women's`, `V-Neck`) so each button is clearly named. Leave it blank and the site will guess a label from the product name.

---

## 5. Editing Site Copy (Headlines, FAQs, CTAs)

You can change the words on your public website pages — headlines, subheadings, call-to-action buttons, FAQ questions and answers, rotating quotes, and ticker items — directly from your admin dashboard. No developer needed. Changes go live immediately.

### How to Edit Site Copy
1. Go to [pournogravy.com/admin](https://pournogravy.com/admin)
2. Click **Content** in the left sidebar
3. You'll see tabs at the top: **Home | Shop | About | Contact | FAQ**
4. Click the tab for the page you want to edit
5. Find the section and field you want to change
6. Click the text field, type your new copy, and click **Save**

That's it. The change goes live on the public site immediately — no deploy, no code change, no waiting.

### What You Can Edit
| Tab | What's Editable |
|-----|----------------|
| **Home** | Hero headline, hero subheading, CTA buttons, featured section label, manifesto text, newsletter heading/subheading, the 10 rotating bartender quotes, the 6 ticker items in the announcement scroll |
| **Shop** | Shop page hero label |
| **About** | Hero headline and label, pull quote, manifesto label and body text, CTA button |
| **Contact** | Hero label and subheading, sidebar email + response time note |
| **FAQ** | Hero label and subheading, all 7 FAQ questions and answers |

### Tips
- Changes save one field at a time — you don't need to save the whole page at once
- If you mess something up, contact Kristin and she can reset the field to the original text
- If a field is empty, the site falls back to the original hardcoded text — so you can always "blank it out" to revert

---

## 6. Viewing Custom Garment Requests

When a customer fills out the "Request a Custom Garment" form on any product page (or the Contact page), their info appears in your admin dashboard.

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

## 7. Viewing Orders

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

## 8. Finances & Reports

Your admin dashboard has a **Finances** section (`/admin` → **Finances**) with 7 tabs across the top: **Overview, Reports, Payouts, Expenses, Products, Invoices, Tax Packet**. This section is your books — think of it as a lightweight version of what a bookkeeper or Stripe itself would show you.

### Running Reports
1. Go to **Finances → Reports**
2. Pick a report from the dropdown — e.g. **P&L Statement**, **Sales by Product**, **Sales Tax**, **Top Customers**, **Refunds & Disputes**, **Payout Reconciliation**, or **Tax Estimate**
3. Pick a time period — a quick preset (This Month, This Year, Last Year, etc.) or your own custom start/end dates
4. The report shows up **right on the screen** as a table (with a chart above it for a couple of report types) — no waiting, no download required
5. Need it outside the dashboard? Two buttons do that:
   - **Download CSV** — opens in Excel/Google Sheets/Numbers
   - **Print** — use your browser's Print dialog and choose "Save as PDF" to get a PDF copy (handy for emailing your accountant)

You don't have to pick a report to see anything useful — **Overview** (the first tab) is always showing you the big picture: how much you've made, what it cost you in printing, your profit margin, average order size, refund rate, and your current Stripe balance / next payout date, all without running a report.

### Reading Payout Reconciliation
Go to **Finances → Payouts**. Every few days Stripe deposits your card-sale money into your bank account — that deposit is called a **payout**. This tab lists each payout and breaks it down:

- **Gross** — the total amount customers paid for orders in that payout
- **Fees** — what Stripe charged you to process those payments
- **Refunds** — anything refunded back out during that period
- **Net Deposit** — Gross − Fees − Refunds. **This is the number that should match what actually landed in your bank account.**

If the Net Deposit doesn't match your bank statement, that's worth flagging to Kristin — but under normal operation it should line up exactly.

### Turning On Sales Tax
Right now, **sales tax collection is turned OFF**. Customers pay exactly the sticker price + shipping, no tax line — same as it's always been.

The dashboard has everything built and ready to turn sales tax on (a **Sales Tax** report, a tax line in checkout, tax tracking on every order) — but flipping it on is a **real pricing change that affects every customer's checkout total**, so it is intentionally left off until you say go. There's no button for it in the dashboard on purpose — it has to be switched on directly in the database by Kristin, so it can't happen by accident.

**Before turning it on:**
1. **Talk to a CPA or tax advisor first.** Sales tax rules vary a lot by state, and getting it wrong can create real filing headaches.
2. **Set up apparel tax codes.** Several states (Pennsylvania, New Jersey, Minnesota, and others) don't charge sales tax on clothing at all. Until product-level tax codes are set correctly in Stripe, the system would use a generic default and could **over-collect tax in those states**. This needs to happen before go-live, not after.
3. **Test it first.** Kristin will run a full test purchase in Stripe's test mode (fake money, real flow) to confirm the tax line, the checkout total, and the reporting all work correctly before it ever touches a real customer.

When you're ready, this is a "tell Kristin to flip the switch" conversation, not a self-service toggle — contact her before enabling it.

---

## 9. What You Can vs. Cannot Change

### ✅ You Can Do These Yourself (via Admin Dashboard)
- Edit site copy — headlines, CTAs, FAQ answers, quotes, ticker items (Content tab)
- View and manage custom garment requests (update status)
- View and track orders
- Create, activate/deactivate, and delete discount codes
- View loyalty member balances and transaction history; manually adjust points
- Look up customers by email — order history, loyalty, wishlist stats
- View and export email subscriber list
- Schedule merch drops with ad placement and marketing emails
- Edit product details and upload product images
- Approve or reject customer reviews
- Run financial reports, view payout reconciliation, track expenses and printer invoices (Finances tab)

### 🛑 These Need a Developer (Contact Kristin)
- Adding brand new products to the catalog
- Changing prices
- Changing the site design, layout, or color scheme
- Adding new pages
- Connecting to a fulfillment partner (Printful/Printify)
- Email marketing integration (Klaviyo/Mailchimp)
- Changing the domain or hosting
- Turning on sales tax collection (see Section 8 — this is a real pricing change and needs a CPA conversation + testing first)
- Anything where something stopped working

### 📝 These Are on the Roadmap
- Fully self-service product management (add products without any developer involvement)
- Automatic order fulfillment via Printful/Printify (once partner is selected)
- Email marketing integration (Klaviyo/Mailchimp) to activate the subscriber list

---

## 10. Who to Call When Things Break

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

## 11. Glossary — Terms You'll See

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
| **Content tab** | The admin section where you edit live site copy (headlines, FAQs, quotes, etc.) |
| **site_content** | The database table that stores your editable page copy |
| **Payout** | A deposit Stripe sends to your bank account for recent card sales |
| **Net Deposit** | Gross sales minus Stripe's fees minus refunds — the number that should match your bank deposit |
| **COGS** | Cost of Goods Sold — what it costs you to print/produce each item you sell |
| **Sales tax collection** | Currently OFF site-wide; see Section 8 before ever turning it on |

---

*Document maintained by Aethyx. For questions, contact Kristin Mitchell.*

# Day 1 — How The Web Works (And Why Your Site Went Black)
### Pournogravy Dev Curriculum | Kristin Mitchell
---

> This isn't boring "the internet is a series of tubes" stuff. Everything in here is directly connected to bugs you hit while building pournogravy.com. When you understand WHY the black screen happened, you'll never be confused by it again.

---

## 🧠 Vocab Word Dump — Know These Before You Read

| Word | What It Actually Means |
|------|----------------------|
| **HTTP** | HyperText Transfer Protocol — the rules browsers and servers use to talk to each other |
| **DNS** | Domain Name System — the phone book that turns "pournogravy.com" into a real server IP address |
| **IP Address** | A numerical address for a computer on the internet (like 104.21.88.44) |
| **CDN** | Content Delivery Network — a network of servers worldwide that each hold a copy of your site |
| **Build** | The process of compiling your source code into browser-ready files |
| **Bundle** | The single (or few) JS/CSS files that result from a build — what actually ships to the browser |
| **Environment Variable** | A named value outside your code that your code can read at runtime or build time |
| **Runtime** | When the code is running (in the browser or on a server) |
| **Build time** | When `vite build` is executing — before anything reaches a browser |
| **Static file** | A file that doesn't change per-request (your HTML, CSS, JS, images) |
| **SPA** | Single Page Application — a website where React handles all navigation client-side |
| **CI/CD** | Continuous Integration / Continuous Deployment — automated build + publish pipeline |

---

## Part 1: What Actually Happens When Someone Types pournogravy.com

You might think "they type it and the site shows up." Here's what actually happens, step by step:

### Step 1 — DNS Lookup
The browser asks a DNS resolver: "Who is pournogravy.com?" The resolver checks a chain of DNS servers until it finds: "pournogravy.com points to Cloudflare's servers at IP 104.x.x.x."

You configured this in Cloudflare's DNS settings. This is why changing nameservers can take up to 48 hours — DNS changes propagate slowly through the global resolver network.

### Step 2 — TLS Handshake (The S in HTTPS)
Before sending any real data, the browser and Cloudflare's server shake hands and agree on an encryption method. This is what SSL/HTTPS is. If your certificate expired, this is where the scary "Your connection is not private" warning shows up.

Your SSL cert is managed automatically by Cloudflare. You never need to touch it.

### Step 3 — Request Hits Cloudflare
The HTTP request lands on the nearest Cloudflare server to the visitor. Because you're on Cloudflare Pages, your site files are cached on hundreds of servers worldwide. A customer in Tokyo gets the files from a Tokyo server — not a server in your living room.

### Step 4 — Cloudflare Sends the HTML
Cloudflare sends back `index.html`. This is a tiny file — like 1KB — because it's mostly just `<div id="root"></div>` and a `<script>` tag pointing to your JavaScript bundle.

### Step 5 — Browser Loads the JS Bundle
The browser downloads your JS bundle (currently ~972KB — we'll optimize this in Phase 3). This file IS your entire application — every React component, every page, all your logic.

### Step 6 — React Boots Up
JavaScript executes. React mounts, looks for `<div id="root">`, and renders the homepage. This is called **hydration** in React-land.

### Step 7 — Supabase Client Initializes
Your `src/integrations/supabase/client.ts` runs. It reads `import.meta.env.VITE_SUPABASE_URL`. If that value is `undefined`... error. Black screen.

---

## Part 2: The Black Screen — What Actually Went Wrong

This is a textbook example of **build time vs. runtime** confusion.

### What `import.meta.env.VITE_*` Actually Is

Vite is your build tool. When you run `npm run build`, Vite reads your code and compiles it. Any time it sees `import.meta.env.VITE_SOMETHING`, it does a find-and-replace:

```
// Your source code:
const url = import.meta.env.VITE_SUPABASE_URL;

// What Vite writes into the bundle:
const url = "https://emtjkawcmsfgjyimnncf.supabase.co";
```

The variable **doesn't exist at runtime**. It's baked in at build time. By the time the browser runs your code, it's just a hardcoded string.

This means: **if the variable isn't in `process.env` WHEN `vite build` runs, it bakes in `undefined`.**

### The Cloudflare Pages Secrets Mistake

In Cloudflare Pages, there are two types of variables:
- **Plaintext Variables** — available to the build process (what you want for VITE_*)
- **Secrets** — encrypted, only available at runtime, NOT to the build process

The Supabase anon key had been saved as a **Secret**. So when Cloudflare ran `npm run build`, `process.env.VITE_SUPABASE_ANON_KEY` was empty. Vite baked `undefined` into the bundle. Supabase client threw "supabaseUrl is required." Black screen.

### The Fix: `.env.production`

Vite has a loading order for env files:
1. `.env` — always loaded
2. `.env.production` — loaded when building for production
3. `.env.local` — local overrides (gitignored)

`.env.production` is NOT in `.gitignore`. So when Cloudflare Pages clones your GitHub repo and runs the build, it finds `.env.production` and reads the vars. Problem solved.

```
# .env.production (committed to git — these values are safe public client keys)
VITE_SUPABASE_URL=https://emtjkawcmsfgjyimnncf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...
```

**Key lesson:** Never put a `VITE_*` variable in CF Pages Secrets. Secrets are for runtime values (like `STRIPE_SECRET_KEY` in a server function). Build-time values go in `.env.production`.

---

## Part 3: The CI/CD Pipeline

Here's what happens every time you push code to GitHub:

```
You: git push origin master
          ↓
GitHub: "master branch updated"
          ↓
Cloudflare Pages: (webhook fires) "new commit detected"
          ↓
CF Pages: git clone your repo
          ↓
CF Pages: npm install
          ↓
CF Pages: npm run build    ← Vite reads .env.production here
          ↓
CF Pages: publishes dist/ to global CDN
          ↓
pournogravy.com updates within ~2 minutes
```

This is CI/CD. Every push to master auto-deploys. No manual clicking. If the build fails, CF Pages shows you the build log.

**When the build command was wrong (`vite` instead of `npm run build`):**
- `npm run build` → runs Vite's production build → creates `dist/` → deploys
- `vite` → starts a dev server on port 5173 → CF Pages waits for it to "finish" → timeout after 4 minutes → deploy fails silently

---

## Part 4: What Is React, Actually?

React is a JavaScript library that lets you build UIs out of components — reusable pieces of HTML + logic that manage their own state.

### Components
```tsx
// A simple React component
function ProductCard({ name, price }: { name: string, price: number }) {
  return (
    <div className="card">
      <h2>{name}</h2>
      <p>${price}</p>
    </div>
  );
}
```

### The Virtual DOM
React doesn't directly change the real HTML. It keeps a "virtual" copy of the UI in memory, computes what changed, and only updates the parts of the real DOM that need to change. This is why React is fast.

### State
State is data that, when it changes, causes the component to re-render.
```tsx
const [cartCount, setCartCount] = useState(0);
// When setCartCount is called, the component re-renders with the new value
```

### The SPA Routing Problem
Your site is a Single Page Application. There's only ONE actual HTML file (`index.html`). React Router handles navigation client-side — when you click "Shop," React swaps out components without making a new HTTP request.

But if a visitor directly types `pournogravy.com/shop` into their browser, Cloudflare serves `index.html`, React loads, then React Router parses `/shop` and renders the right page.

What happens WITHOUT `wrangler.toml` SPA config: Cloudflare looks for a file at `/shop/index.html`. It doesn't exist. 404.

What happens WITH `not_found_handling = "single-page-application"`: Cloudflare sends `index.html` for any path it doesn't recognize. React loads. React Router reads the URL. Correct page renders.

---

## Part 5: TypeScript — Why It Exists

TypeScript is JavaScript with types. Instead of:
```js
function getPrice(product) {
  return product.price; // What if product.price doesn't exist? Runtime error.
}
```

You write:
```ts
interface Product {
  name: string;
  price: number;
}

function getPrice(product: Product): number {
  return product.price; // TypeScript KNOWS this exists — catches errors at compile time
}
```

TypeScript errors show up in your editor and during `npm run build`. They cannot reach production because Vite won't build if there are type errors. This is why the codebase is much more stable than a plain JavaScript project.

---

## 🔗 Real-World Connection: The Black Screen, Explained

Here's the complete chain that caused the black screen:

1. Someone saved the Supabase anon key as a CF Pages **Secret** (runtime-only)
2. Cloudflare ran `npm run build` — `VITE_SUPABASE_ANON_KEY` wasn't in `process.env`
3. Vite baked `undefined` into the bundle where the URL should be
4. Browser loads the app → Supabase client reads `undefined` for the URL → throws "supabaseUrl is required"
5. React catches the error, shows nothing → **black screen**

Fix: commit `.env.production` with the public key. Vite reads it. URL is baked correctly. Site loads. ✅

---

## 📝 Day 1 Review Checklist

Before moving to Day 2, make sure you can answer these without looking:
- What is DNS and what does it do?
- What is the difference between build time and runtime?
- Why can't a `VITE_*` variable be stored in a Cloudflare Pages Secret?
- What does `npm run build` actually do?
- What is an SPA and why does it need special routing configuration?
- Why does TypeScript catch errors that JavaScript misses?

---

*Day 2 → Auth, databases, security, and the admin login bug*

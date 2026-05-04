# The Pournogravy Dev Quiz
### Test Your Knowledge — All Three Days
**Kristin Mitchell | Aethyx Dev Curriculum**

---

> No multiple choice. Short answer and explain-it-back questions — that's how you actually know if you know it. Some questions are easy. Some are designed to make you think. All of them connect directly to real things that happened while building pournogravy.com.

---

## Part 1 — Day 1: How The Web Works (10 questions)

**Q1.** When someone types `pournogravy.com` into a browser, what is the first thing that happens before any files are sent?

**Q2.** What is the difference between a Cloudflare Pages "Secret" and a Cloudflare Pages "Plaintext Variable"? Why does this distinction matter for `VITE_SUPABASE_ANON_KEY`?

**Q3.** Explain in your own words why `import.meta.env.VITE_SUPABASE_URL` becomes `undefined` in production, even when the variable IS set in the Cloudflare Pages dashboard.

**Q4.** What is the purpose of `.env.production` in the Pournogravy project? Why is it committed to git when `.env` and `.env.local` are not?

**Q5.** What does `npm run build` actually do? Walk through the steps it takes and what the output is.

**Q6.** The build command was set to `vite` instead of `npm run build`. What's the difference between those two commands, and what actually happened when Cloudflare ran `vite` as the build command?

**Q7.** What is an SPA? Why does pournogravy.com need `not_found_handling = "single-page-application"` in `wrangler.toml`?

**Q8.** What is a CDN and why does Cloudflare Pages make sites load faster for customers in Japan without you having to set anything up?

**Q9.** What is TypeScript's main benefit over plain JavaScript? Give a concrete example of a bug it would catch.

**Q10.** After you push to GitHub, approximately how long does it take for pournogravy.com to show the new version? What is happening during that time?

---

## Part 2 — Day 2: Auth, Database, Security (10 questions)

**Q11.** What is the difference between authentication and authorization? Give an example of each in the context of pournogravy.com.

**Q12.** What is a JWT? What three parts does it have, and which part contains the user's ID?

**Q13.** Why is the Supabase anon key safe to put in `.env.production` (committed to git), but the service role key must never be there?

**Q14.** What does Row-Level Security (RLS) do? When an RLS policy blocks a query, does the database throw an error or return an empty result? Why does this distinction matter?

**Q15.** Explain what `SECURITY DEFINER` does on a SQL function. Why does `is_admin()` need it?

**Q16.** This was the core of the admin login bug. Explain the exact chain of events: the migration ran `REVOKE ALL ON FUNCTION public.is_admin`, and then when an admin logged in, why did they see "NOT ON THE LIST" even though `is_admin = true` in their profile?

**Q17.** What is a race condition? Describe the specific race condition that existed in `AuthContext.tsx` and explain exactly how `setLoading(true)` fixed it.

**Q18.** Why are UUIDs preferred over auto-increment integers for primary keys in a distributed web application?

**Q19.** The Pournogravy codebase had two Supabase client files: `src/integrations/supabase/client.ts` and `src/utils/supabase/client.ts`. What could go wrong if a component used the wrong one?

**Q20.** The admin allowlist pattern uses a database table instead of hardcoded email addresses. What are the practical benefits of this approach? What would you have to do to add a new admin with the old hardcoded approach vs. the allowlist approach?

---

## Part 3 — Day 3: Payments, Email, Deployment (10 questions)

**Q21.** Why is it dangerous to process payments in the browser (frontend)? Give a specific example of how a user could exploit a client-side payment flow.

**Q22.** Walk through the Stripe Checkout flow on Pournogravy from the moment the user clicks "Checkout" to the moment the order is marked as "paid" in the database. Name every system involved.

**Q23.** What is a webhook? Specifically, what is Stripe's webhook and when does it fire?

**Q24.** Stripe webhooks can fire more than once for the same event. What is "idempotency" and how should a webhook handler deal with duplicate events?

**Q25.** How does Stripe sign webhook payloads, and how does your `stripe-webhook` edge function verify that a request is genuinely from Stripe and not from a malicious actor? What would happen if `STRIPE_WEBHOOK_SECRET` was wrong?

**Q26.** What is a Supabase Edge Function? What runtime does it use, and why can't it import code from your React frontend?

**Q27.** `src/lib/fulfillment.ts` exists in the codebase but has a comment saying it's "invoked by the stripe-webhook edge function." Why is this a lie? What actually happens in the stripe-webhook function?

**Q28.** Explain the `send-notification` edge function. What is a "template engine" in this context, and what does `{{variable}}` substitution mean?

**Q29.** What is an MX record, and why does the `verify-email` edge function check for one? What problem does it solve?

**Q30.** The Pournogravy JS bundle is 972KB. Explain: (a) what contributes to large bundle size, (b) what code splitting is and how `React.lazy()` enables it, and (c) why a smaller initial bundle improves the user experience.

---

## Bonus Round — Connecting The Dots

**B1.** You push a commit to GitHub. The Cloudflare build log shows "Build environment variables: (none found)" and then the site shows a black screen. Walk through your diagnosis — what happened, what do you check, and what is the fix?

**B2.** A user logs into pournogravy.com/admin, enters their correct email and password, and is shown "NOT ON THE LIST." You check the database: `is_admin = true`. The GRANT has been run. What could still be causing this? List at least two possibilities and how you'd diagnose each.

**B3.** You're explaining to Opie why Stripe's webhook architecture is more secure than "just having the frontend tell the database the payment went through." Write a plain-English explanation (no jargon) that you'd actually send to a non-technical client.

---

## Answer Key

*Don't look until you've tried — seriously. The whole point of the quiz is to find the gaps.*

<details>
<summary>Click to reveal answers</summary>

**A1.** DNS lookup. The browser asks a DNS resolver to translate "pournogravy.com" into an IP address. Only after that does the browser know where to send the HTTP request.

**A2.** Secrets are runtime-only (available to edge functions/workers at execution time). Plaintext Variables are passed to the build process (available in `process.env` during `npm run build`). Since `VITE_SUPABASE_ANON_KEY` must be baked into the bundle by Vite at build time, it needs to be a Plaintext Variable — not a Secret.

**A3.** Vite replaces `import.meta.env.VITE_*` at build time with the literal value from `process.env`. If the variable isn't in `process.env` when `vite build` runs (because it was a CF Pages Secret, which is runtime-only), Vite bakes `undefined` into the bundle. By the time the browser runs the code, it reads the hardcoded `undefined` — the real env var is never consulted.

**A4.** `.env.production` is read by Vite during production builds. It's committed to git so that Cloudflare Pages can read it when it clones the repo and builds. `.env` and `.env.local` are in `.gitignore`, so CF Pages never sees them — but `.env.production` is not gitignored, so it travels with the code.

**A5.** `npm run build` executes Vite's production pipeline: (1) reads TypeScript and transpiles it to JS, (2) processes all `import.meta.env.VITE_*` substitutions, (3) bundles all modules into one or few output files, (4) tree-shakes unused code, (5) minifies (removes whitespace/renames variables), (6) outputs everything to the `dist/` directory.

**A6.** `npm run build` runs Vite's one-time production build and exits. `vite` starts the Vite dev server — a long-running process that never exits on its own. Cloudflare was waiting for the `vite` command to finish before collecting the output, but it never finished. CF Pages eventually timed out and failed.

**A7.** An SPA serves one HTML file for all routes. React Router handles navigation in the browser. Without SPA routing config, if someone directly loads `pournogravy.com/shop`, Cloudflare looks for a file at `/shop/index.html`, finds nothing, and returns a 404. With `not_found_handling = "single-page-application"`, Cloudflare returns `index.html` for any unrecognized path and lets React Router handle it.

**A8.** A CDN caches your static files (HTML, JS, CSS, images) on servers around the world. When a request comes in, Cloudflare routes it to the nearest server with a cached copy. A Tokyo visitor gets files from Tokyo. No ocean-crossing round-trip required. Cloudflare Pages automatically distributes to all edge locations on deploy.

**A9.** TypeScript catches type mismatches at compile time. Example: if a function expects a `Product` object with a `price` field, and you pass an object without `price`, TypeScript errors during `npm run build`. In plain JavaScript, you'd get a silent `undefined` at runtime — potentially breaking the page for real users.

**A10.** About 1–2 minutes. During that time: Cloudflare detects the GitHub push (webhook), spins up a build container, clones the repo, runs `npm install`, runs `npm run build`, then distributes the `dist/` output to all edge locations globally.

**A11.** Authentication = proving who you are (logging in). Authorization = what you're allowed to do after you've proven who you are. Examples: entering your email + password at pournogravy.com/admin is authentication. After logging in, the system checking `is_admin = true` before showing you the dashboard is authorization.

**A12.** A JWT has three parts: header (algorithm info), payload (claims — who you are, when it expires), signature (cryptographic proof). The user's ID is in the payload, in the `sub` claim.

**A13.** The anon key has the `anon` role. It's subject to all RLS policies — it can only do what the policies explicitly allow. The service role key bypasses all RLS policies — it can read and write everything. Putting the service role key in the browser means any user could use their browser's DevTools to extract it and make unauthenticated admin queries to your entire database.

**A14.** RLS policies define who can SELECT/INSERT/UPDATE/DELETE rows. When a policy blocks a query, the database returns an empty result (zero rows), not an error. This matters because your code must check for empty results — you can't just assume "if there was an error, the code would throw." A blocked query looks identical to a query that returned no matching rows.

**A15.** Normally, a function runs with the caller's permissions. SECURITY DEFINER means the function runs with the creator's permissions (usually the DB owner, who has full access). `is_admin()` needs it because it reads the `profiles` table, which has RLS. Without SECURITY DEFINER, if `anon` called `is_admin()`, the function body would also be subject to RLS and might fail to read the profile row it needs.

**A16.** The REVOKE stripped execute permission from the `is_admin()` function for all roles including `authenticated`. The profiles SELECT RLS policy calls `is_admin(auth.uid())` to decide whether to return the row. When an authenticated user tried to fetch their profile, Supabase evaluated the RLS policy, tried to call `is_admin()`, got "permission denied to execute function," and returned zero rows. `fetchProfile` received null, never set `profile`, so `isAdmin` stayed `false`. Despite `is_admin = true` being in the database, the query to read it was blocked.

**A17.** A race condition happens when two asynchronous operations depend on each other but can complete in the wrong order. In `AuthContext`: `getSession()` ran async and set `loading = false` when it found no existing session. Then when the user logged in, `onAuthStateChange` fired and started `fetchProfile()` async. But `loading` was already `false`, so `ProtectedRoute` evaluated immediately — before `fetchProfile` finished — and saw `isAdmin = false`. Fix: `setLoading(true)` in `onAuthStateChange` before `fetchProfile`, cleared in `.finally()`. This ensures `loading` is always `true` while any profile fetch is in progress.

**A18.** UUIDs can be generated client-side (or any server) before inserting. No coordination needed. Multiple servers can insert simultaneously without collision. IDs don't leak sequence information (attacker can't guess that user 1001 exists by knowing user 1000 does). Auto-increment integers require a central authority to issue them and can create bottlenecks.

**A19.** The two clients are completely separate instances with separate auth sessions. If component A used the integrations client (logged in) and component B used the utils client (not logged in, different instance), component B would appear to be logged out. Queries from B would use the `anon` role, potentially failing RLS checks, returning empty data, or behaving as if no user was authenticated.

**A20.** Allowlist approach: to add a new admin, insert one row in the `admin_allowlist` table. The `handle_new_user` trigger will set `is_admin = true` on their next login (or immediately with `ON CONFLICT DO UPDATE`). Hardcoded approach: change the code in the migration or trigger function, create a new migration, deploy. Allowlist is faster, requires no code deploy, and leaves a clear audit trail of who was added when.

**A21.** The browser is fully controlled by the user. They can open DevTools, intercept network requests, modify JavaScript variables, or use tools like Burp Suite to change any value before it's sent. If the frontend sent "checkout for $0.01," the server would process that exact amount. An attacker could buy anything for any price.

**A22.** User clicks Checkout → frontend calls `create-checkout` Edge Function with product IDs → Edge Function looks up prices in Supabase database (not trusting client) → calculates correct total → creates pending order in database → calls Stripe API to create a Checkout Session with the real total → returns Stripe URL → frontend redirects browser to Stripe's hosted checkout page → user enters card details on Stripe's servers → Stripe processes payment → Stripe fires webhook to `stripe-webhook` Edge Function → function verifies Stripe signature → updates order status to 'paid' → stores payment intent ID + shipping address → calls `send-notification` → inserts into `printer_queue`.

**A23.** A webhook is an HTTP request sent by a third party to notify you of an event. Stripe's webhook fires when a payment-related event happens (like `checkout.session.completed`). Stripe sends a POST request to your specified endpoint with event data in the body.

**A24.** Idempotency means running the same operation multiple times produces the same result as running it once. For webhooks: if Stripe fires `checkout.session.completed` twice for the same order (e.g., due to a network retry), the handler should only mark the order as 'paid' once. Pattern: check if the order is already 'paid' before updating; use `ON CONFLICT DO NOTHING` for inserts.

**A25.** Stripe signs the webhook payload using HMAC-SHA256 with your `STRIPE_WEBHOOK_SECRET`. The signature is included in the `Stripe-Signature` header. Your handler recomputes the expected signature using the same secret and compares it to the received one. If they match, the request is from Stripe. If `STRIPE_WEBHOOK_SECRET` is wrong, the computed signature won't match, every Stripe webhook will be rejected as "invalid," and no orders will ever be marked as paid.

**A26.** A Supabase Edge Function is a serverless TypeScript function that runs on Supabase's infrastructure. It uses Deno (not Node.js). Deno has a different module system — it imports from URLs (`https://esm.sh/...`), doesn't use `@/` aliases, doesn't have `import.meta.env`, and doesn't understand Vite's bundled module format. Frontend code uses all of those Vite-specific features, making it incompatible with Deno.

**A27.** `src/lib/fulfillment.ts` is a frontend module that imports from the frontend Supabase client. An Edge Function can't import frontend code (wrong runtime). The actual fulfillment logic lives directly inside `supabase/functions/stripe-webhook/index.ts` — when payment completes, the webhook function itself inserts into `printer_queue`. `fulfillment.ts` is dead code and should be deleted.

**A28.** `send-notification` is an email dispatcher backed by a template system. A template engine takes a string with placeholders like "Hello {{name}}, your order {{order_id}} is confirmed." and substitutes the placeholders with real values: "Hello Karen, your order abc-123 is confirmed." The function fetches the template from the `email_templates` Supabase table, does the substitution, then calls the Resend API to send the rendered email.

**A29.** An MX record (Mail Exchange) is a DNS entry that says "email for this domain is handled by server X." The `verify-email` function checks MX records to ensure an email domain can actually receive mail. Example: `user@notarealdomain.xyz` might pass a regex check (looks like a valid email) but have no MX records (can't receive email). Checking MX prevents fake addresses from clogging your database and allows you to catch typos before the user misses their confirmation email.

**A30.** (a) Large bundles come from heavy libraries (Framer Motion, Supabase client, React) and including code for every page even if the user never visits them. (b) Code splitting splits the bundle into multiple chunks. `React.lazy(() => import('./Page'))` tells Vite to put that component in a separate file that only downloads when it's rendered. `Suspense` shows a fallback (spinner) while it loads. (c) A smaller initial bundle means the browser downloads, parses, and executes less JavaScript before the page becomes interactive — faster First Contentful Paint, lower time-to-interactive.

**B1.** Diagnosis: "Build environment variables: (none found)" in the build log means Vite didn't find the `VITE_*` vars in `process.env` during the build. Black screen = Supabase client threw "supabaseUrl is required" because it read `undefined`. Check: is `VITE_SUPABASE_ANON_KEY` saved as a CF Pages Secret (wrong) or Plaintext Variable? Is `.env.production` committed to the git repo? If the key is a Secret, convert it to Plaintext or commit `.env.production` (which is not gitignored and travels with the code). Rebuild.

**B2.** Possibilities: (1) Race condition — `loading` was `false` when `ProtectedRoute` evaluated, before `fetchProfile` finished. Check: is `setLoading(true)` called before `fetchProfile` in `onAuthStateChange`? (2) Wrong Supabase client — the component or context is importing from `src/utils/supabase/client.ts` (the dead second client) instead of the integrations client. The dead client has a separate session that doesn't know the user is logged in. Check: search for `from "@/utils/supabase"` imports. (3) The GRANT hasn't actually been applied — the `is_admin()` function still can't be executed by `authenticated`. Check: try calling `SELECT public.is_admin('their-user-id-uuid')` in Supabase SQL Editor while logged in as that user's role. (4) `admin_allowlist` doesn't have their email — so `handle_new_user` set `is_admin = false`. Check: `SELECT * FROM admin_allowlist;`

**B3.** "Here's the simple version: if we let the website handle payments, it's like letting customers set their own price at the register. Anyone with a little technical knowledge could tell our website 'I paid $0.01' and we'd believe them. So instead, we use Stripe — a completely separate company that specializes in payments. When you click 'Checkout,' our website tells Stripe 'this customer owes $55.98.' Stripe handles the actual card transaction. Then Stripe calls us back and says 'payment confirmed.' We never touch the card number, and we never have to trust the browser — only Stripe's signed confirmation."

</details>

---

*This quiz covers real bugs from a real production project. If you can answer all 30 questions, you understand more about web development than most bootcamp graduates.*

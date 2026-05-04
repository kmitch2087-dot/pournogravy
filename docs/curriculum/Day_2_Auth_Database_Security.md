# Day 2 — Auth, Databases, Security, and the Admin Bug
### Pournogravy Dev Curriculum | Kristin Mitchell
---

> Day 2 covers the stuff that was directly responsible for the most frustrating bugs of Session 2: "why is the admin login still not working even though is_admin = true in the database???" We're going to understand that completely — and never be mystified by it again.

---

## 🧠 Vocab Word Dump

| Word | What It Actually Means |
|------|----------------------|
| **Authentication** | Proving who you are (login — "I am Kristin") |
| **Authorization** | What you're allowed to do once identified ("Kristin is an admin") |
| **JWT** | JSON Web Token — an encrypted blob that proves you're logged in |
| **Session** | A period of time during which you're treated as authenticated |
| **Row-Level Security (RLS)** | Database rules that say who can see/change which rows |
| **Policy** | A specific RLS rule attached to a table |
| **SECURITY DEFINER** | A function that runs with the permissions of its creator, not the caller |
| **Race condition** | When two things happen out of order and the result is wrong because of it |
| **Async** | Code that doesn't wait — it starts a task and moves on before the task finishes |
| **Promise** | A JavaScript object representing a value that will exist in the future |
| **REVOKE** | SQL command that removes a permission |
| **GRANT** | SQL command that adds a permission |
| **Middleware** | Code that runs between a request and a response |
| **Context** | In React, a way to share state across many components without passing props everywhere |

---

## Part 1: How Supabase Auth Works

Supabase Auth is built on top of PostgreSQL's authentication system. Here's the flow when you log in:

### Login Flow
```
User: submits email + password
          ↓
Supabase Auth: checks auth.users table (hashed password comparison)
          ↓
Supabase Auth: creates a session → returns a JWT
          ↓
Your frontend: stores the JWT in localStorage
          ↓
Every future request: sends JWT in Authorization header
          ↓
Supabase: reads the JWT, knows who you are for RLS purposes
```

### What Is a JWT?

A JWT (JSON Web Token) has three parts, separated by dots:
```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLWlkLWhlcmUiLCJyb2xlIjoiYXV0aGVudGljYXRlZCJ9.signature
[header]              [payload]                                                               [signature]
```

The payload (middle part) is just base64-encoded JSON:
```json
{
  "sub": "user-uuid-here",
  "role": "authenticated",
  "email": "kristin@example.com",
  "exp": 1234567890
}
```

The signature is a cryptographic hash. If anyone tampers with the payload, the signature won't match and Supabase rejects the token.

**Important:** JWTs are not encrypted — anyone can decode the payload. They're just signed. Never put secrets in a JWT payload.

### The Anon Key vs. The Service Role Key

Your Supabase project has two special JWTs:
- **Anon key** (`VITE_SUPABASE_ANON_KEY`) — role is `anon`. Safe to put in the browser. Subject to all RLS policies.
- **Service role key** — role is `service_role`. Bypasses ALL RLS policies. Gives full database access. NEVER put this in the browser. Only use it in server-side code (Edge Functions).

This is why the anon key is fine in `.env.production` (committed to git) but the service role key must only ever be in Edge Function secrets.

---

## Part 2: Row-Level Security — The Database Bouncer

RLS is a PostgreSQL feature. Before any query executes, the database checks the RLS policies for that table. If the policies say "no," the query returns no rows — it doesn't throw an error, it just returns nothing.

### A Simple RLS Policy
```sql
-- Allow users to only see their OWN cart items
CREATE POLICY "Users can view own cart"
ON cart_items FOR SELECT
USING (
  auth.uid() = user_id  -- auth.uid() = the JWT's "sub" claim (current user's ID)
);
```

### Who Gets What Role?

| Situation | Role Supabase sees |
|-----------|-------------------|
| No JWT (not logged in) | `anon` |
| Valid JWT (logged in) | `authenticated` |
| Service role key | `service_role` |

RLS policies can target specific roles:
```sql
CREATE POLICY "Admins can see all orders"
ON orders FOR SELECT
TO authenticated  -- only logged-in users
USING (
  public.is_admin(auth.uid())  -- and only if they're an admin
);
```

---

## Part 3: SECURITY DEFINER Functions — The Master Key Pattern

Here's the `is_admin()` function at the heart of the admin bug:

```sql
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER  -- ← this is the important part
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND is_admin = true
  );
END;
$$;
```

### What SECURITY DEFINER Does

Normally, when a function runs, it runs with the permissions of whoever called it. So if `anon` calls a function, the function can only do what `anon` is allowed to do.

`SECURITY DEFINER` changes this: the function runs with the permissions of whoever **created** the function (usually the database owner, who has full access). This lets the function read tables that the caller normally couldn't.

Why does `is_admin()` need this? Because it reads the `profiles` table. The `profiles` table has RLS. If a regular user called `is_admin()` without SECURITY DEFINER, the function would also be subject to RLS and might not be able to read the profile it needs.

### The REVOKE Bug — What Actually Happened

A migration ran this SQL:
```sql
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
```

This stripped every role's permission to CALL the `is_admin()` function. SECURITY DEFINER only controls what permissions the function body runs WITH — it doesn't give anyone permission to CALL the function.

So when a user logged in:
1. `ProtectedRoute` checked if the user was an admin
2. `AuthContext` called `fetchProfile()` to get profile data
3. `fetchProfile()` queried Supabase: `SELECT * FROM profiles WHERE id = ?`
4. That query called `is_admin(user_id)` inside the RLS policy
5. Supabase: "Permission denied to execute function is_admin" 
6. Supabase returned `null` from the query (error silently swallowed)
7. `profile` was never set → `isAdmin` stayed `false`
8. ProtectedRoute: "NOT ON THE LIST" (even though they were)

**The fix:** `GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;`

---

## Part 4: Race Conditions — When Async Goes Wrong

### What Is Asynchronous Code?

JavaScript runs on a single thread. It can't do two things at exactly the same time. But it CAN start a task (like a network request) and move on to other things while it waits for the result. This is asynchronous programming.

```javascript
// Synchronous (blocking) — waits for each line
const result1 = fetchSync(); // waits...
const result2 = fetchSync(); // then waits...
```

```javascript
// Asynchronous (non-blocking)
fetchAsync().then(result => {
  // this runs LATER, when the fetch completes
});
// code here runs IMMEDIATELY while fetch is in flight
```

### The Auth Race Condition on Pournogravy

Here's what was happening on fresh login:

**Broken flow (before fix):**
```
App starts
  → useEffect runs
  → supabase.auth.getSession() starts (async — not done yet)
  → onAuthStateChange listener is registered
  → getSession() completes: no existing session
  → setLoading(false) ← LOADING IS NOW FALSE
User logs in
  → onAuthStateChange fires with new session
  → fetchProfile(userId) starts (async)
  → React re-renders
  → ProtectedRoute runs: loading=false, isAdmin=false → "NOT ON THE LIST"
  → fetchProfile() completes and sets isAdmin=true
  → (too late — user already saw the error screen)
```

**Fixed flow (after fix):**
```
App starts → same as before → loading=false initially
User logs in
  → onAuthStateChange fires
  → setLoading(true) ← IMMEDIATELY SETS LOADING TRUE
  → fetchProfile(userId) starts
  → React re-renders
  → ProtectedRoute runs: loading=true → shows spinner (waits)
  → fetchProfile() completes → setLoading(false) → isAdmin=true
  → ProtectedRoute runs again: loading=false, isAdmin=true → ✅ admin access
```

The fix was one line: `setLoading(true)` before calling `fetchProfile`.

### The General Pattern

Race conditions happen whenever:
1. You read a value
2. Something async changes that value
3. You assumed the value was stable between steps 1 and 2

The fix is always some form of: "don't act on data that isn't ready yet." A loading flag is the standard React solution.

---

## Part 5: Database Schema Design

The Pournogravy database has 9 tables. Here's how they relate:

```
auth.users (Supabase built-in)
    ↓ (1-to-1)
profiles (is_admin, display_name)
    ↓
orders (email, status, total_cents, shipping_address)
    ↓ (1-to-many)
order_items (product_id, quantity, price_cents)

cart_items (user_id OR session_id, product_id, quantity)

custom_requests (name, email, garment, design_id, status)

discount_codes (code, type, value, use_count)

product_reviews (product_slug, rating, body, is_approved)

settings (id=1, site_name, maintenance_mode)

email_templates (name, subject, body_html)
```

### Primary Keys — uuid vs. integer

Most tables use `uuid` primary keys. A UUID looks like: `550e8400-e29b-41d4-a716-446655440000`. They're generated client-side and guaranteed to be unique globally. This is better than auto-incrementing integers for distributed systems because:
- You can generate the ID before inserting (useful for optimistic UI)
- No collision if multiple servers insert simultaneously
- IDs don't reveal count/sequence information

The `settings` table uses `integer` and must have `id=1`. This is a pattern for "singleton config" — there's only ever one settings row.

---

## Part 6: The Admin Allowlist Pattern

Instead of hardcoding admin emails in the migration or in code, Pournogravy uses an `admin_allowlist` table:

```sql
CREATE TABLE admin_allowlist (
  id serial PRIMARY KEY,
  email text UNIQUE NOT NULL
);

INSERT INTO admin_allowlist (email) VALUES
  ('kmitch2087@gmail.com'),
  ('kristinmitchell@aethyx.space'),
  ('aopie91@gmail.com');
```

And the `handle_new_user` trigger sets `is_admin` on signup:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, is_admin)
  VALUES (
    new.id,
    new.email,
    EXISTS(SELECT 1 FROM admin_allowlist WHERE email = new.email)
  )
  ON CONFLICT (id) DO UPDATE SET is_admin = EXCLUDED.is_admin;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why this is better than hardcoding:** To add a new admin, you just insert a row in `admin_allowlist` and have them log out and back in. No code deploy required.

---

## Part 7: The Two Supabase Clients Problem

The codebase accidentally ended up with two separate Supabase client files:
- `src/integrations/supabase/client.ts` — correct, uses `createClient` from `@supabase/supabase-js`, reads `VITE_SUPABASE_ANON_KEY`
- `src/utils/supabase/client.ts` — dead code, uses `createBrowserClient` from `@supabase/ssr`, reads `VITE_SUPABASE_PUBLISHABLE_KEY`

Having two clients means two separate authentication sessions. If a component used the wrong client, it would appear logged out even if the user was logged in through the correct client. This is exactly the kind of subtle bug that causes "but I'm logged in — why does this say I'm not??"

**Rule:** Always import from `src/integrations/supabase/client.ts`. Delete `src/utils/supabase/`.

---

## 📝 Day 2 Review Checklist

Before moving to Day 3, make sure you can answer:
- What's the difference between authentication and authorization?
- What is a JWT and why can't you store secrets in it?
- What is the difference between the anon key and the service role key?
- What does `SECURITY DEFINER` do on a SQL function?
- How did the REVOKE statement break admin login?
- What is a race condition and how was the auth race condition fixed?
- Why are UUIDs preferred over auto-increment integers for primary keys?
- What happens when an RLS policy blocks a query — error, or silent empty result?

---

*Day 3 → Payments, email, and the full Stripe checkout flow*

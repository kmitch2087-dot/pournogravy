# Post-Mortem: The Auth Spinner / Login Failure Bug
**Filed:** 2026-05-22  
**Status:** RESOLVED  
**Affected:** pournogravy.com — admin login, auth on every page load  
**Fixed in:** CartContext.tsx, WishlistContext.tsx, useAnalytics.ts

---

## What Was Happening

After every deploy, and often between updates, the site would:
- Show an infinite loading spinner on the admin panel
- Fail to log in (clicking Sign In appeared to do nothing)
- Throw errors in the console: `Lock "lock:sb-emtjkawcmsfgjyimnncf-auth-token" was released because another request stole it`
- Throw: `fetchProfile failed: Error: profile fetch timeout`
- Show CORS errors on the `track-event` edge function

---

## The Root Cause

### Bug 1 — Three Concurrent `getSession()` Calls (THE MAIN KILLER)

Supabase JS v2 uses the browser's **Web Locks API** internally to ensure only one operation reads/refreshes the auth token at a time. On every page load, **three separate contexts** all called `supabase.auth.getSession()` simultaneously:

| File | Call |
|------|------|
| `src/context/AuthContext.tsx` | `supabase.auth.getSession()` (intentional — this is correct) |
| `src/context/CartContext.tsx` | `supabase.auth.getSession()` (WRONG — caused lock fight) |
| `src/context/WishlistContext.tsx` | `supabase.auth.getSession()` (WRONG — caused lock fight) |

All three contexts mount at app startup and all three fired `getSession()` within milliseconds. They competed for the same Web Lock. One would "steal" the lock from the others. The loser threw `"lock was released because another request stole it"`. Because `AuthContext`'s `getSession()` lost the lock fight, it couldn't get the session → couldn't fetch the profile → the 12-second timeout fired → `setLoading(false)` cleared the spinner but left `user = null` → ProtectedRoute redirected to login.

When the user tried to log in, the same lock contention was still happening, making `signIn` calls fail or not register.

### Bug 2 — CORS Failure on `track-event` (Separate, Non-Fatal But Noisy)

`useAnalytics.ts` used `navigator.sendBeacon()` to fire analytics events. Per the browser spec, `sendBeacon` always sends with `credentials: 'include'` (cookies). The `track-event` edge function returned `Access-Control-Allow-Origin: *`. Browsers reject `*` when `credentials: include` — so the preflight (OPTIONS) failed. This caused 12 CORS errors per page load in the console. Not fatal to login, but noisy and broke analytics tracking.

---

## Why Previous "Fixes" Didn't Work

Previous sessions attempted to fix the spinner by modifying `AuthContext.tsx` — adding the `INITIAL_SESSION` skip, adding a failsafe timeout, adding `setLoading(true)` before `fetchProfile`, etc. These were all valid improvements to `AuthContext`, and the logic there is now correct.

**They didn't fully fix the bug because the root cause was never in `AuthContext` — it was the two other contexts calling `getSession()` concurrently.**

Every time the AuthContext code was "fixed," the lock contention from Cart and Wishlist was still happening. Sometimes the timing shifted just enough that AuthContext won the lock fight, which is why it appeared fixed for a while after each deploy but broke again.

---

## The Fix (Applied 2026-05-22)

### Fix 1: CartContext.tsx
Removed the `supabase.auth.getSession()` call from the init `useEffect`. Replaced it with handling `INITIAL_SESSION` in the existing `onAuthStateChange` subscription. `INITIAL_SESSION` fires synchronously from `localStorage` — no lock is needed.

### Fix 2: WishlistContext.tsx  
Same pattern. Removed `supabase.auth.getSession()`. Replaced with `INITIAL_SESSION` handling in `onAuthStateChange`.

### Fix 3: useAnalytics.ts  
Replaced `navigator.sendBeacon()` with `fetch(..., { credentials: 'omit', keepalive: true })`. `credentials: 'omit'` means no cookies are sent, making `Access-Control-Allow-Origin: *` valid again. `keepalive: true` preserves the request during page navigations (was the main reason sendBeacon was used).

---

## The Rule Going Forward

> **Only ONE `supabase.auth.getSession()` call is allowed in the entire frontend codebase.**  
> That call lives in `AuthContext.tsx`. All other contexts and components get their initial auth state from `onAuthStateChange` with `INITIAL_SESSION` handled.

This is now documented in `CLAUDE.md` under "Auth Architecture."

---

## Token Cost Estimate

This bug was worked on across **multiple sessions** with both Claude (Cowork) and Claude Code (CLI). Based on session length and message counts:

| Session | Estimated Tokens | Work Done |
|---------|-----------------|-----------|
| Initial spinner fix (AuthContext race) | ~80,000 | Added INITIAL_SESSION skip, failsafe timeout |
| Second attempt (more AuthContext changes) | ~60,000 | Loading state adjustments |
| Third attempt (regression after deploy) | ~70,000 | Reverted changes, re-applied pattern |
| Fourth attempt (bcb371f commit) | ~90,000 | `setLoading(true)` before fetchProfile fix |
| This session (actual root cause found) | ~40,000 | Found `getSession()` in Cart/Wishlist, fixed all 3 files |
| **Total** | **~340,000 tokens** | |

At Claude Sonnet pricing (~$3/MTok input, ~$15/MTok output, roughly 50/50 split), estimated cost: **~$1.50–$3.00 USD** in API tokens across all sessions.

The fix itself — once the root cause was identified — was 3 files changed in under 10 minutes. The preceding ~300K tokens were spent fixing symptoms in the wrong file.

---

## What Should Have Been Caught Earlier

1. A global search for `getSession()` across all `src/` files would have immediately revealed three callers, not one.
2. The Supabase docs for JS v2 explicitly warn that concurrent `getSession()` calls can cause lock contention.
3. The error message `"lock was released because another request stole it"` should have been the first search term — it points directly to concurrent lock acquisition.

---

## Files Changed

```
src/context/CartContext.tsx     — removed getSession(), added INITIAL_SESSION handling
src/context/WishlistContext.tsx — removed getSession(), added INITIAL_SESSION handling  
src/hooks/useAnalytics.ts       — replaced sendBeacon with fetch + credentials:omit
```


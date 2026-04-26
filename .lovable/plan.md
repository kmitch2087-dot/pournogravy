## Goal

Get Lovable to preview your `master` branch (the new working branch) instead of `main`, and confirm the previously reported build error is no longer real.

## What's actually going on

1. **Branch:** Your repo currently has both `main` and `master`. Lovable's preview is built from the **default branch**, which is still `origin/main` (confirmed: `remotes/origin/HEAD -> origin/main`). When you switched the in-editor branch picker to `master`, Lovable doesn't auto-build feature/non-default branches, so the preview went blank.
2. **Build error:** I ran a full `tsc --noEmit` against the current code on this branch — it passes with zero errors. The `CustomGarmentRequestModal.tsx` "name does not exist in type 'never[]'" error you saw earlier was stale (the Supabase client is properly typed with `Database`, and `custom_requests` has the right Insert type). No code fix is needed.

## Plan

### Step 1 — Make `master` the default branch (you do this on GitHub, takes ~30 seconds)

Lovable always previews the GitHub default branch, so `master` needs to become the default before Lovable will build it.

1. Go to your repo on GitHub → **Settings → General → Default branch**.
2. Click the switch icon, change default from `main` to `master`, confirm.
3. (Optional, since you said `main` will be deleted eventually) Delete `main` on GitHub once you've confirmed `master` has everything you want.

### Step 2 — Re-point Lovable at the new default

After changing the GitHub default:

1. In Lovable, switch the branch selector back to the default view (turn off the experimental branch switching, or select `master` which will now be default).
2. If the preview still doesn't refresh, disconnect and reconnect the GitHub integration in **Connectors → GitHub** so Lovable re-reads which branch is default. This is non-destructive — your code stays in GitHub.

### Step 3 — Verify

- Preview at `https://id-preview--d3a58c3b-13b6-40c2-a1dd-47c41b7a2f60.lovable.app` should render the `master` version.
- Click **Publish → Update** to push the `master` build to `https://pournogravy.lovable.app`.

## Notes

- I will **not** "fix" `CustomGarmentRequestModal.tsx` — there is nothing wrong with it. Touching it would only add noise.
- Once `master` is default, all future Lovable edits and the bidirectional GitHub sync will operate on `master` automatically. Your VS Code + Claude workflow on `master` will keep working unchanged.
- If you'd like, after you flip the default I can also clean up by deleting the local `main` tracking branch reference in the workspace.

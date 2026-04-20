export const refreshSession = async () => {
  throw new Error(
    "Supabase session refresh middleware requires a server runtime. This Vite app is client-only, so there is no middleware layer to attach here.",
  );
};

import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

import { supabasePublishableKey, supabaseUrl } from "./env";

export const createClient = (cookies: CookieMethodsServer) =>
  createServerClient<Database>(supabaseUrl, supabasePublishableKey, { cookies });

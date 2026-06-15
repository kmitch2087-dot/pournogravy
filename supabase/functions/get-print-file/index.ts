// get-print-file edge function.
// Validates a shared password against settings.print_file_password (row id=1),
// logs the access to file_access_log, then returns a signed Supabase Storage URL
// for the requested file in the `print-files` bucket.
//
// BODY: { email: string, password: string, file_path: string }
// RETURNS: { signed_url: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

interface Body {
  email: string;
  password: string;
  file_path: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { email, password, file_path } = (await req.json()) as Body;

    if (!email || !password || !file_path) {
      return new Response(JSON.stringify({ error: "email, password, and file_path are required" }), {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Fetch the shared print file password from settings row id=1
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("print_file_password")
      .eq("id", 1)
      .maybeSingle();

    if (settingsError) throw settingsError;

    const correctPassword = settings?.print_file_password ?? "Dookie1313";

    if (password !== correctPassword) {
      return new Response(JSON.stringify({ error: "Invalid password" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Log the access
    await supabase.from("file_access_log").insert([{
      email,
      file_path,
      accessed_at: new Date().toISOString(),
    }]);

    // Generate a signed URL for the file in the print-files bucket (1 hour)
    const { data: signedData, error: signError } = await supabase.storage
      .from("print-files")
      .createSignedUrl(file_path, 3600);

    if (signError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: signError?.message ?? "Failed to create signed URL" }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ signed_url: signedData.signedUrl }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[get-print-file]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

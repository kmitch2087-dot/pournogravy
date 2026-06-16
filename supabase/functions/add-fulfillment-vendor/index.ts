import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = (req: Request) => ({
  "Access-Control-Allow-Origin": req.headers.get("origin") ?? "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Credentials": "true",
  "Vary": "Origin",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: admin JWT or service role
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    let authorized = false;

    if (token === serviceKey) {
      authorized = true;
    } else if (token) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: profile } = await userClient
        .from("profiles")
        .select("is_admin")
        .eq("id", (await userClient.auth.getUser()).data.user?.id ?? "")
        .maybeSingle();
      authorized = profile?.is_admin === true;
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { company_name, contact_name, email, phone, services, turnaround, min_order_qty, notes, file_formats } = body;

    if (!company_name?.trim()) throw new Error("company_name is required");
    if (!email?.trim())        throw new Error("email is required");

    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: vendor, error: insertError } = await serviceClient
      .from("fulfillment_vendors")
      .insert({
        company_name: company_name.trim(),
        contact_name: contact_name?.trim() ?? null,
        email: email.trim(),
        phone: phone?.trim() ?? null,
        services: services ?? [],
        turnaround: turnaround ?? null,
        min_order_qty: min_order_qty ?? null,
        notes: notes?.trim() ?? null,
        file_formats: file_formats ?? [],
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Send welcome email via send-notification
    const notifyRes = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": anonKey,
      },
      body: JSON.stringify({
        templateKey: "vendor_welcome",
        recipient: email.trim(),
        variables: {
          contact_name: contact_name?.trim() || company_name.trim(),
          company_name: company_name.trim(),
        },
      }),
    });

    if (!notifyRes.ok) {
      console.warn("vendor_welcome email send failed:", await notifyRes.text());
    }

    return new Response(JSON.stringify({ ok: true, vendor_id: vendor.id }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("add-fulfillment-vendor error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

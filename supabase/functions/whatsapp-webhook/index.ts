import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  // Webhook is called by external API — no CORS needed, no auth
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    console.log("Webhook received for user:", userId, "body:", JSON.stringify(body));

    const isConnected =
      body.event === "connection" ||
      body.status === "CONNECTED" ||
      body.connected === true;

    const isDisconnected =
      body.event === "disconnected" ||
      body.status === "DISCONNECTED" ||
      body.connected === false;

    if (isConnected) {
      await adminClient
        .from("whatsapp_instances")
        .update({
          status: "connected",
          is_connected: true,
          last_connection_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      console.log("Updated to connected for user:", userId);
    } else if (isDisconnected) {
      await adminClient
        .from("whatsapp_instances")
        .update({
          status: "disconnected",
          is_connected: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      console.log("Updated to disconnected for user:", userId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});

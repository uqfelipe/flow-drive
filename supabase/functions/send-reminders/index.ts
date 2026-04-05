import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function getWhatsAppInstance() {
  const { data } = await adminClient
    .from("whatsapp_instances")
    .select("server_url, instance_token, instance_name")
    .eq("user_id", "admin")
    .limit(1)
    .single();
  return data as { server_url: string; instance_token: string; instance_name: string } | null;
}

async function sendWhatsAppText(
  inst: { server_url: string; instance_token: string },
  phone: string,
  message: string
) {
  const res = await fetch(`${inst.server_url}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: inst.instance_token },
    body: JSON.stringify({ number: phone, text: message }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp API error: ${res.status} ${text}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse optional body
    let reminderId: string | undefined;
    try {
      const body = await req.json();
      reminderId = body?.reminderId;
    } catch {
      // no body or invalid json — process all
    }

    const inst = await getWhatsAppInstance();
    if (!inst) {
      console.log("[REMINDERS] No WhatsApp instance found");
      return new Response(JSON.stringify({ error: "No WhatsApp instance", results: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build query
    let query = adminClient
      .from("reminders")
      .select("id, customer_id, message, scheduled_at")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString());

    if (reminderId) {
      query = query.eq("id", reminderId);
    }

    const { data: reminders, error } = await query;

    if (error) {
      console.error("[REMINDERS] Query error:", error);
      return new Response(JSON.stringify({ error: error.message, results: [] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ sent: 0, results: [], message: "No pending reminders found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; status: string; detail: string }> = [];

    for (const reminder of reminders) {
      try {
        const { data: customer } = await adminClient
          .from("customers")
          .select("phone, name")
          .eq("id", reminder.customer_id)
          .single();

        if (!customer?.phone) {
          await adminClient
            .from("reminders")
            .update({ status: "failed", sent_at: new Date().toISOString() })
            .eq("id", reminder.id);
          results.push({ id: reminder.id, status: "failed", detail: "no_phone" });
          continue;
        }

        await sendWhatsAppText(inst, customer.phone, reminder.message);

        await adminClient
          .from("reminders")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", reminder.id);

        results.push({ id: reminder.id, status: "sent", detail: `sent to ${customer.phone}` });
        console.log(`[REMINDERS] Sent to ${customer.phone}`);
      } catch (err) {
        console.error(`[REMINDERS] Failed for ${reminder.id}:`, err);
        await adminClient
          .from("reminders")
          .update({ status: "failed", sent_at: new Date().toISOString() })
          .eq("id", reminder.id);
        results.push({ id: reminder.id, status: "failed", detail: String(err) });
      }
    }

    return new Response(JSON.stringify({ sent: results.filter(r => r.status === "sent").length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[REMINDERS] Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err), results: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

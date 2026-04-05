import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

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
  const res = await fetch(`${inst.server_url}/message/sendText`, {
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
    const inst = await getWhatsAppInstance();
    if (!inst) {
      console.log("[REMINDERS] No WhatsApp instance found");
      return new Response(JSON.stringify({ error: "No WhatsApp instance" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch pending reminders where scheduled_at <= now
    const { data: reminders, error } = await adminClient
      .from("reminders")
      .select("id, customer_id, message, scheduled_at")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString());

    if (error) {
      console.error("[REMINDERS] Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const reminder of reminders) {
      try {
        // Get customer phone
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
          console.log(`[REMINDERS] No phone for customer ${reminder.customer_id}`);
          continue;
        }

        await sendWhatsAppText(inst, customer.phone, reminder.message);

        await adminClient
          .from("reminders")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", reminder.id);

        sentCount++;
        console.log(`[REMINDERS] Sent to ${customer.phone}`);
      } catch (err) {
        console.error(`[REMINDERS] Failed for ${reminder.id}:`, err);
        await adminClient
          .from("reminders")
          .update({ status: "failed", sent_at: new Date().toISOString() })
          .eq("id", reminder.id);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[REMINDERS] Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

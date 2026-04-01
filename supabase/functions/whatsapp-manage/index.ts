import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPI_TOKEN = Deno.env.get("WHATSAPI_API_TOKEN")!;
const CREATE_URL = Deno.env.get("WHATSAPI_CREATE_URL")!;

const USER_ID = "admin"; // single-tenant, no auth

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Webhook registration helper ──────────────────────────────────────
async function registerWebhook(serverUrl: string, instanceToken: string) {
  const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook?user_id=${USER_ID}`;
  console.log(`[WEBHOOK-REG] Registering webhook: ${webhookUrl} on ${serverUrl}`);
  try {
    const res = await fetch(`${serverUrl}/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: instanceToken },
      body: JSON.stringify({
        url: webhookUrl,
        enabled: true,
        active: true,
        byApi: true,
        addUrlEvents: true,
        addUrlTypesMessages: true,
        excludeMessages: ["wasSentByApi", "isGroupYes"],
        events: [
          "connection", "messages", "messages_update", "presence",
          "call", "contacts", "groups", "labels", "chats",
          "chat_labels", "blocks", "leads", "history", "sender",
        ],
      }),
    });
    const text = await res.text();
    console.log(`[WEBHOOK-REG] Result: ${res.status} ${text}`);
    return res.ok;
  } catch (e) {
    console.error(`[WEBHOOK-REG] Failed:`, e.message);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();

    if (action === "get-or-create") {
      return await handleGetOrCreate();
    } else if (action === "qrcode") {
      return await handleQrCode();
    } else if (action === "disconnect") {
      return await handleDisconnect();
    } else if (action === "delete") {
      return await handleDelete();
    } else {
      return json({ error: "Invalid action" }, 400);
    }
  } catch (e) {
    console.error("whatsapp-manage error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});

async function handleGetOrCreate() {
  const { data: existing, error: fetchErr } = await adminClient
    .from("whatsapp_instances")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (existing) {
    // Re-register webhook to ensure it's synced
    await registerWebhook(existing.server_url, existing.instance_token);
    return json({ instance: sanitize(existing), is_new: false });
  }

  // Create instance via WhatsApi proxy
  const instanceName = `locadora-${Date.now()}`;
  const createPayload = {
    token: WHATSAPI_TOKEN,
    name: instanceName,
    deviceName: "LocadoraCRM",
  };

  console.log("Creating instance:", instanceName, "URL:", CREATE_URL);
  const createRes = await fetch(CREATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createPayload),
  });

  const responseText = await createRes.text();
  console.log("Create response status:", createRes.status, "body:", responseText);

  if (!createRes.ok) {
    throw new Error(`Falha ao criar instância: ${createRes.status} - ${responseText}`);
  }

  let createJson: Record<string, unknown>;
  try {
    createJson = JSON.parse(responseText);
  } catch {
    throw new Error("Resposta inválida do proxy de criação");
  }

  const serverUrl = createJson.server_url as string;
  const instanceToken = (createJson["Instance Token"] || createJson.instance_token) as string;
  const token = (createJson.token || WHATSAPI_TOKEN) as string;

  if (!serverUrl || !instanceToken) {
    throw new Error(`Resposta da API incompleta: server_url=${serverUrl}, token=${!!instanceToken}`);
  }

  // Register webhook
  const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook?user_id=${USER_ID}`;
  await registerWebhook(serverUrl, instanceToken);

  // Save to DB
  const { data: inserted, error: insertErr } = await adminClient
    .from("whatsapp_instances")
    .insert({
      user_id: USER_ID,
      instance_name: instanceName,
      device_name: "LocadoraCRM",
      server_url: serverUrl,
      instance_token: instanceToken,
      token,
      webhook_url: webhookUrl,
      status: "created",
      is_connected: false,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;

  return json({ instance: sanitize(inserted), is_new: true });
}

async function handleQrCode() {
  const { data: inst, error } = await adminClient
    .from("whatsapp_instances")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (error) throw error;
  if (!inst) return json({ error: "Instância não encontrada" }, 404);

  // Always re-register webhook when generating QR
  await registerWebhook(inst.server_url, inst.instance_token);

  const qrRes = await fetch(`${inst.server_url}/instance/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: inst.instance_token,
    },
    body: "{}",
  });

  if (!qrRes.ok) {
    const errText = await qrRes.text();
    console.error("QR fetch failed:", qrRes.status, errText);
    throw new Error(`Falha ao buscar QR Code: ${qrRes.status}`);
  }

  const qrJson = await qrRes.json();
  const qrcode = qrJson?.instance?.qrcode || qrJson?.qrcode || "";
  const connected = qrJson?.connected === true || qrJson?.instance?.status === "connected";

  if (connected) {
    await adminClient
      .from("whatsapp_instances")
      .update({
        status: "connected",
        is_connected: true,
        last_connection_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", USER_ID);

    return json({ connected: true, qrcode: "" });
  }

  await adminClient
    .from("whatsapp_instances")
    .update({ status: "connecting", updated_at: new Date().toISOString() })
    .eq("user_id", USER_ID);

  return json({ connected: false, qrcode });
}

async function handleDisconnect() {
  const { error } = await adminClient
    .from("whatsapp_instances")
    .update({
      status: "disconnected",
      is_connected: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", USER_ID);

  if (error) throw error;
  return json({ success: true });
}

async function handleDelete() {
  const { data: inst } = await adminClient
    .from("whatsapp_instances")
    .select("server_url, instance_token")
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (inst?.server_url && inst?.instance_token) {
    try {
      const delRes = await fetch(`${inst.server_url}/instance`, {
        method: "DELETE",
        headers: { token: inst.instance_token },
      });
      await delRes.text();
      console.log("Instance deleted from API");
    } catch (e) {
      console.error("uazapi delete failed (continuing):", e.message);
    }
  }

  const { error } = await adminClient
    .from("whatsapp_instances")
    .delete()
    .eq("user_id", USER_ID);

  if (error) throw error;
  return json({ deleted: true });
}

function sanitize(inst: Record<string, unknown>) {
  const { instance_token, token, ...safe } = inst;
  return safe;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

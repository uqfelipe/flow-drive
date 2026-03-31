import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPI_TOKEN = Deno.env.get("WHATSAPI_API_TOKEN")!;
const CREATE_URL = Deno.env.get("WHATSAPI_CREATE_URL")!;
const PROXY_APIKEY = Deno.env.get("WHATSAPI_PROXY_APIKEY") || "";

const USER_ID = "admin"; // single-tenant, no auth

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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
  // Check existing
  const { data: existing, error: fetchErr } = await adminClient
    .from("whatsapp_instances")
    .select("*")
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (existing) {
    return json({ instance: sanitize(existing), is_new: false });
  }

  // Create instance via WhatsApi proxy
  const instanceName = `whatsapi-${USER_ID}-${Date.now()}`;
  const createPayload = {
    token: WHATSAPI_TOKEN,
    name: instanceName,
    deviceName: "LocadoraCRM",
    systemName: "LocadoraCRM",
    system_name: "LocadoraCRM",
    system: "LocadoraCRM",
    profileName: "LocadoraCRM",
    browser: "chrome",
    fingerprintProfile: "chrome",
  };

  console.log("Creating instance:", instanceName);
  const createJson = await createInstanceViaProxy(createPayload);
  console.log("Create response:", JSON.stringify(createJson));

  const serverUrl = createJson.server_url;
  const instanceToken = createJson["Instance Token"] || createJson.instance_token;
  const token = createJson.token || WHATSAPI_TOKEN;

  if (!serverUrl || !instanceToken) {
    throw new Error("Resposta da API incompleta — server_url ou Instance Token ausente");
  }

  // Build webhook URL
  const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook?user_id=${USER_ID}`;

  // Register webhook on uazapi
  try {
    const webhookRes = await fetch(`${serverUrl}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: instanceToken,
      },
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
    const webhookJson = await webhookRes.json();
    console.log("Webhook registered:", JSON.stringify(webhookJson));
  } catch (e) {
    console.error("Webhook registration failed (continuing):", e.message);
  }

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

  // Update status to connecting
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

  // Try to delete on uazapi (resilient)
  if (inst?.server_url && inst?.instance_token) {
    try {
      const delRes = await fetch(`${inst.server_url}/instance`, {
        method: "DELETE",
        headers: { token: inst.instance_token },
      });
      await delRes.text(); // consume body
      console.log("Instance deleted from API");
    } catch (e) {
      console.error("uazapi delete failed (continuing):", e.message);
    }
  }

  // Remove from DB
  const { error } = await adminClient
    .from("whatsapp_instances")
    .delete()
    .eq("user_id", USER_ID);

  if (error) throw error;
  return json({ deleted: true });
}

// Strip sensitive fields before sending to frontend
function sanitize(inst: Record<string, unknown>) {
  const { instance_token, token, ...safe } = inst;
  return safe;
}

async function createInstanceViaProxy(createPayload: Record<string, string>) {
  const queryString = new URLSearchParams(createPayload).toString();

  const attemptConfigs = [
    {
      label: "POST json + apikey + bearer",
      method: "POST",
      url: CREATE_URL,
      headers: buildProxyHeaders({ includeApikey: true, includeBearer: true }),
      body: JSON.stringify(createPayload),
    },
    {
      label: "POST json + apikey",
      method: "POST",
      url: CREATE_URL,
      headers: buildProxyHeaders({ includeApikey: true, includeBearer: false }),
      body: JSON.stringify(createPayload),
    },
    {
      label: "POST json + bearer",
      method: "POST",
      url: CREATE_URL,
      headers: buildProxyHeaders({ includeApikey: false, includeBearer: true }),
      body: JSON.stringify(createPayload),
    },
    {
      label: "POST json only",
      method: "POST",
      url: CREATE_URL,
      headers: buildProxyHeaders({ includeApikey: false, includeBearer: false }),
      body: JSON.stringify(createPayload),
    },
    {
      label: "GET query + apikey + bearer",
      method: "GET",
      url: `${CREATE_URL}${CREATE_URL.includes("?") ? "&" : "?"}${queryString}`,
      headers: buildProxyHeaders({ includeApikey: true, includeBearer: true }),
    },
    {
      label: "GET query + apikey",
      method: "GET",
      url: `${CREATE_URL}${CREATE_URL.includes("?") ? "&" : "?"}${queryString}`,
      headers: buildProxyHeaders({ includeApikey: true, includeBearer: false }),
    },
    {
      label: "GET query + bearer",
      method: "GET",
      url: `${CREATE_URL}${CREATE_URL.includes("?") ? "&" : "?"}${queryString}`,
      headers: buildProxyHeaders({ includeApikey: false, includeBearer: true }),
    },
    {
      label: "GET query only",
      method: "GET",
      url: `${CREATE_URL}${CREATE_URL.includes("?") ? "&" : "?"}${queryString}`,
      headers: buildProxyHeaders({ includeApikey: false, includeBearer: false }),
    },
  ];

  let lastStatus = 500;
  let lastText = "";

  for (const attempt of attemptConfigs) {
    console.log(`Create instance attempt: ${attempt.label}`);
    const res = await fetch(attempt.url, {
      method: attempt.method,
      headers: attempt.headers,
      body: attempt.method === "GET" ? undefined : attempt.body,
    });

    const text = await res.text();
    if (res.ok) {
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Resposta JSON inválida do proxy de criação");
      }
    }

    console.error(`Create instance failed [${attempt.label}]:`, res.status, text);
    lastStatus = res.status;
    lastText = text;

    if (res.status !== 405) {
      break;
    }
  }

  throw new Error(`Falha ao criar instância: ${lastStatus}${lastText ? ` - ${lastText}` : ""}`);
}

function buildProxyHeaders({ includeApikey, includeBearer }: { includeApikey: boolean; includeBearer: boolean }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (PROXY_APIKEY && includeApikey) {
    headers.apikey = PROXY_APIKEY;
    headers["x-api-key"] = PROXY_APIKEY;
  }

  if (PROXY_APIKEY && includeBearer) {
    headers.Authorization = `Bearer ${PROXY_APIKEY}`;
  }

  return headers;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

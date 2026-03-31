import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
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
    const eventType = body.EventType ?? body.event ?? "";

    // Handle ChatPresence events (typing indicator)
    if (eventType === "ChatPresence" || eventType === "chatPresence" || eventType === "presence") {
      const chatId = body.chatid ?? body.chat?.wa_chatid ?? body.from ?? "";
      const state = (body.state ?? body.State ?? body.presence ?? "").toLowerCase();
      const isTyping = state === "composing" || state === "recording";
      const isOnline = isTyping || state === "available" || state === "online";

      console.log("ChatPresence event:", JSON.stringify({ chatId, state, isTyping, isOnline }));

      if (chatId) {
        await adminClient
          .from("presence_cache")
          .upsert(
            {
              chat_id: chatId,
              is_typing: isTyping,
              is_online: isOnline,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "chat_id" }
          );
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle message events — upsert signal for Realtime
    if (eventType === "messages" || eventType === "message") {
      const msgType = body.message?.messageType ?? body.message?.type ?? "unknown";
      const chatId = body.message?.chatid ?? body.chat?.wa_chatid ?? "";
      console.log(`Webhook received for user: ${userId}/${eventType}/${msgType}`);

      if (chatId) {
        await adminClient
          .from("message_signals")
          .upsert(
            { chat_id: chatId, updated_at: new Date().toISOString() },
            { onConflict: "chat_id" }
          );
      }
    } else {
      console.log(`Webhook received for user: ${userId} event: ${eventType}`);
    }

    // Handle connection/disconnection events
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

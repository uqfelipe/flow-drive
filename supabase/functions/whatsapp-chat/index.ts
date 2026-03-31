import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getInstance() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data, error } = await supabase
    .from("whatsapp_instances")
    .select("server_url, instance_token, instance_name")
    .eq("user_id", "admin")
    .limit(1)
    .single();
  if (error || !data) throw new Error("Instância WhatsApp não encontrada");
  return data as { server_url: string; instance_token: string; instance_name: string };
}

async function apiCall(serverUrl: string, token: string, path: string, body: unknown) {
  const res = await fetch(`${serverUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} error ${res.status}: ${text}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, phone, text, imageUrl, chatLid, type, fileUrl, docName, messageId: msgId, remoteJid, fromMe } = await req.json();
    const inst = await getInstance();

    if (action === "list-chats") {
      const data = await apiCall(inst.server_url, inst.instance_token, "/chat/find", {
        sort: "-wa_lastMsgTimestamp",
        limit: 50,
        offset: 0,
        wa_isGroup: false,
      });
      return json(data);
    }

    if (action === "fetch-messages") {
      if (!phone) return json({ error: "phone required" }, 400);
      const chatid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
      const data = await apiCall(inst.server_url, inst.instance_token, "/message/find", {
        chatid,
        limit: 50,
        offset: 0,
      });
      return json(data);
    }

    if (action === "get-profile-pic") {
      if (!phone) return json({ error: "phone required" }, 400);
      const data = await apiCall(inst.server_url, inst.instance_token, "/chat/details", {
        number: phone,
        preview: false,
      });
      return json({ image: data?.image || data?.imagePreview || "" });
    }

    if (action === "send-image") {
      if (!phone || !imageUrl) return json({ error: "phone and imageUrl required" }, 400);
      const data = await apiCall(inst.server_url, inst.instance_token, "/send/image", {
        number: phone,
        file: imageUrl,
        text: text || "",
      });
      return json(data);
    }

    if (action === "send-media") {
      if (!phone || !fileUrl || !type) return json({ error: "phone, fileUrl and type required" }, 400);
      const body: Record<string, string> = {
        number: phone,
        type, // image, video, audio, ptt, document, sticker
        file: fileUrl,
      };
      if (text) body.text = text;
      if (docName) body.docName = docName;
      const data = await apiCall(inst.server_url, inst.instance_token, "/send/media", body);
      return json(data);
    }

    if (action === "download-media") {
      if (!phone) return json({ error: "message id required (phone field)" }, 400);
      const body: Record<string, unknown> = {
        id: phone,
        return_link: true,
        generate_mp3: true,
      };
      const data = await apiCall(inst.server_url, inst.instance_token, "/message/download", body);
      return json(data);
    }

    if (action === "send-text") {
      if (!phone || !text) return json({ error: "phone and text required" }, 400);
      const data = await apiCall(inst.server_url, inst.instance_token, "/send/text", {
        number: phone,
        text,
      });
      return json(data);
    }

    if (action === "check-presence") {
      if (!phone) return json({ error: "phone required" }, 400);
      const chatid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const { data: row } = await supabase
          .from("presence_cache")
          .select("is_typing, is_online, updated_at")
          .eq("chat_id", chatid)
          .maybeSingle();

        let isTyping = false;
        let isOnline = false;
        if (row) {
          const age = Date.now() - new Date(row.updated_at).getTime();
          if (age < 15000) {
            isTyping = row.is_typing;
            isOnline = row.is_online;
          }
        }
        return json({ isOnline, isTyping });
      } catch (_e) {
        return json({ isOnline: false, isTyping: false });
      }
    }

    if (action === "mark-read") {
      if (!phone) return json({ error: "phone required" }, 400);
      const chatid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabaseAdmin.from("chat_read_status")
        .upsert(
          { chat_id: chatid, read_at: new Date().toISOString() },
          { onConflict: "chat_id" }
        );

      try {
        await apiCall(inst.server_url, inst.instance_token, "/chat/read", { number: phone });
      } catch (_e) {
        // Ignorar — persistência local já garantida
      }

      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e: any) {
    console.error("whatsapp-chat error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});

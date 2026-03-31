import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

async function chatAction(action: string, extra?: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("whatsapp-chat", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message || "Erro na função");
  return data;
}

export interface WhatsAppChat {
  wa_chatid: string;
  wa_contactName?: string;
  wa_name?: string;
  name?: string;
  wa_lastMsgTimestamp?: number;
  wa_lastMsg?: string;
  wa_profilePicUrl?: string;
  wa_unreadCount?: number;
  image?: string;
  imagePreview?: string;
}

export interface WhatsAppMessage {
  id: string;
  chatid: string;
  content: string;
  fromMe: boolean;
  timestamp: number;
  type: string;
  status?: string;
  fileURL?: string;
}

export function useWhatsAppChats() {
  return useQuery<WhatsAppChat[]>({
    queryKey: ["whatsapp-chats"],
    queryFn: async () => {
      // Fetch connected instance number to hide own chat
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("instance_name")
        .eq("user_id", "admin")
        .limit(1)
        .maybeSingle();
      const ownNumber = inst?.instance_name ?? "";

      const [chatData, readStatusResult] = await Promise.all([
        chatAction("list-chats"),
        supabase.from("chat_read_status").select("chat_id, read_at"),
      ]);

      const chats = chatData?.chats ?? [];
      const readStatuses = readStatusResult.data ?? [];

      return chats
        .filter((c: any) => {
          const chatId = c.wa_chatid ?? "";
          if (chatId.startsWith("13135550002")) return false;
          if (ownNumber && chatId.startsWith(ownNumber)) return false;
          return true;
        })
        .map((c: any) => {
          const rs = readStatuses.find((r: any) => r.chat_id === c.wa_chatid);
          if (rs) {
            const readAtMs = new Date(rs.read_at).getTime();
            const lastMsgTs = c.wa_lastMsgTimestamp ?? 0;
            if (readAtMs >= lastMsgTs) {
              return { ...c, wa_unreadCount: 0 };
            }
          }
          return c;
        });
    },
    refetchInterval: 10000,
  });
}

/**
 * Subscribe to Supabase Realtime on message_signals table.
 * When webhook inserts/updates a signal, instantly refetch messages and chats.
 */
export function useRealtimeMessages() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("message-signals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_signals" },
        (payload: any) => {
          // Instantly refetch messages for the affected chat
          const chatId = payload.new?.chat_id ?? "";
          if (chatId) {
            // Extract phone from chatId (e.g. "553398417049@s.whatsapp.net" -> "553398417049")
            const phone = chatId.replace(/@.*$/, "");
            qc.invalidateQueries({ queryKey: ["whatsapp-messages", phone] });
          }
          // Also refresh chat list
          qc.invalidateQueries({ queryKey: ["whatsapp-chats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export interface PresenceData {
  isOnline?: boolean;
  isTyping?: boolean;
  lastSeen?: number;
}

export function usePresence(phone: string | null) {
  return useQuery<PresenceData>({
    queryKey: ["whatsapp-presence", phone],
    queryFn: async () => {
      if (!phone) return { isOnline: false, isTyping: false };
      const chatid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
      // Query presence_cache directly from Supabase for fastest response
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
      return { isOnline, isTyping };
    },
    enabled: !!phone,
    refetchInterval: 1500,
  });
}

export function useChatMessages(phone: string | null) {
  return useQuery<WhatsAppMessage[]>({
    queryKey: ["whatsapp-messages", phone],
    queryFn: async () => {
      if (!phone) return [];
      const data = await chatAction("fetch-messages", { phone });
      const raw = data?.messages ?? [];
      // Normalize API fields to our WhatsAppMessage interface
      const normalized: WhatsAppMessage[] = raw
        .filter((msg: any) => {
          // Filter out Meta AI messages (UnknownMessageType with no text)
          const rawType = (msg.messageType ?? msg.type ?? "");
          if (rawType === "UnknownMessageType") return false;
          return true;
        })
        .map((msg: any) => {
          // Timestamp: API returns ms (13 digits) — convert to seconds
          let ts = msg.messageTimestamp ?? msg.timestamp ?? 0;
          if (ts > 9999999999999) ts = Math.floor(ts / 1000);
          else if (ts > 9999999999) ts = Math.floor(ts / 1000);

          return {
            id: msg.id ?? msg.messageid ?? "",
            chatid: msg.chatid ?? "",
            content: msg.content,
            fromMe: msg.fromMe ?? false,
            timestamp: ts,
            type: (msg.messageType ?? msg.type ?? "").toLowerCase(),
            status: (msg.status ?? "").toLowerCase(),
            fileURL: msg.fileURL ?? msg.fileUrl ?? "",
            text: msg.text ?? "",
          } as WhatsAppMessage & { text?: string };
        });
      return normalized.sort((a, b) => a.timestamp - b.timestamp);
    },
    enabled: !!phone,
    refetchInterval: 8000, // Fallback only — Realtime handles instant updates
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, text }: { phone: string; text: string }) => {
      return chatAction("send-text", { phone, text });
    },
    onMutate: async ({ phone, text }) => {
      await qc.cancelQueries({ queryKey: ["whatsapp-messages", phone] });
      const previous = qc.getQueryData<WhatsAppMessage[]>(["whatsapp-messages", phone]);
      const optimisticMsg: WhatsAppMessage = {
        id: `temp-${Date.now()}`,
        chatid: `${phone}@s.whatsapp.net`,
        content: text,
        fromMe: true,
        timestamp: Math.floor(Date.now() / 1000),
        type: "text",
        status: "pending",
      };
      qc.setQueryData<WhatsAppMessage[]>(["whatsapp-messages", phone], (old) => [...(old || []), optimisticMsg]);
      return { previous };
    },
    onError: (_, vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["whatsapp-messages", vars.phone], context.previous);
      }
    },
    onSettled: (_, __, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-messages", vars.phone] });
      qc.invalidateQueries({ queryKey: ["whatsapp-chats"] });
    },
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (phone: string) => chatAction("mark-read", { phone }),
    onMutate: async (phone) => {
      await qc.cancelQueries({ queryKey: ["whatsapp-chats"] });
      const previous = qc.getQueryData<WhatsAppChat[]>(["whatsapp-chats"]);
      qc.setQueryData<WhatsAppChat[]>(["whatsapp-chats"], (old) =>
        (old || []).map((c) => {
          const chatPhone = c.wa_chatid?.replace(/@.*$/, "");
          if (chatPhone === phone) {
            return { ...c, wa_unreadCount: 0 };
          }
          return c;
        })
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        qc.setQueryData(["whatsapp-chats"], context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["whatsapp-chats"] }),
  });
}

export function useSendImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, imageUrl, text }: { phone: string; imageUrl: string; text?: string }) => {
      return chatAction("send-image", { phone, imageUrl, text: text || "" });
    },
    onMutate: async ({ phone, imageUrl, text }) => {
      await qc.cancelQueries({ queryKey: ["whatsapp-messages", phone] });
      const previous = qc.getQueryData<WhatsAppMessage[]>(["whatsapp-messages", phone]);
      const optimisticMsg: WhatsAppMessage = {
        id: `temp-${Date.now()}`,
        chatid: `${phone}@s.whatsapp.net`,
        content: text || "",
        fromMe: true,
        timestamp: Math.floor(Date.now() / 1000),
        type: "image",
        status: "pending",
        fileURL: imageUrl,
      };
      qc.setQueryData<WhatsAppMessage[]>(["whatsapp-messages", phone], (old) => [...(old || []), optimisticMsg]);
      return { previous };
    },
    onError: (_, vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["whatsapp-messages", vars.phone], context.previous);
      }
    },
    onSettled: (_, __, vars) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-messages", vars.phone] });
      qc.invalidateQueries({ queryKey: ["whatsapp-chats"] });
    },
  });
}

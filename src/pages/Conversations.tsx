import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search, Send, MessageSquare, ArrowLeft, Phone, Image, FileText,
  Smile, Check, CheckCheck, Mic, Paperclip, MoreVertical, Video, X
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useWhatsAppChats, useChatMessages, useSendMessage, useSendImage, type WhatsAppChat, type WhatsAppMessage } from "@/hooks/use-chat";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function chatName(chat: WhatsAppChat) {
  return chat.wa_contactName || chat.wa_name || chat.name || chat.wa_chatid?.replace("@s.whatsapp.net", "") || "—";
}

function phoneFromChatId(chatid: string) {
  return chatid?.replace("@s.whatsapp.net", "") ?? "";
}

function smartTimestamp(ts: number): Date {
  // Auto-detect: >10 digits = ms, otherwise seconds
  if (ts > 9999999999) return new Date(ts);
  return new Date(ts * 1000);
}

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = smartTimestamp(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Ontem";
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatMsgTime(ts?: number) {
  if (!ts) return "";
  const d = smartTimestamp(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function extractContent(msg: WhatsAppMessage): { text: string; type: "text" | "image" | "document" | "audio" | "video" | "sticker" | "other"; imageUrl?: string } {
  const content = msg.content;
  // Check for fileURL first (media messages from uazapi)
  const fileUrl = (msg as any).fileURL || (msg as any).fileUrl;

  if (typeof content === "object" && content !== null) {
    const c = content as any;
    const imgUrl = fileUrl || c.url || c.fileURL || c.fileUrl;

    if (c.mimetype?.startsWith("image") || msg.type?.toLowerCase().includes("image")) {
      return { text: c.caption || c.text || "", type: "image", imageUrl: imgUrl };
    }
    if (c.caption && imgUrl) return { text: c.caption, type: "image", imageUrl: imgUrl };
    if (c.text) return { text: c.text, type: "text" };
    if (c.fileName) return { text: `📄 ${c.fileName}`, type: "document" };
    if (c.mimetype?.startsWith("video")) return { text: c.caption || "🎥 Vídeo", type: "video" };
    if (c.mimetype?.startsWith("audio")) return { text: "🎵 Áudio", type: "audio" };
    if (c.title) return { text: c.title, type: "other" };
  }

  if (typeof content === "string") {
    const msgType = msg.type?.toLowerCase() ?? "";
    if (msgType.includes("image") && fileUrl) return { text: content || "", type: "image", imageUrl: fileUrl };
    if (content) return { text: content, type: "text" };
  }

  const msgType = msg.type?.toLowerCase() ?? "";
  if (msgType.includes("image")) return { text: "📷 Imagem", type: "image", imageUrl: fileUrl };
  if (msgType.includes("video")) return { text: "🎥 Vídeo", type: "video" };
  if (msgType.includes("audio") || msgType.includes("ptt")) return { text: "🎵 Áudio", type: "audio" };
  if (msgType.includes("document")) return { text: "📄 Documento", type: "document" };
  if (msgType.includes("sticker")) return { text: "🏷️ Sticker", type: "sticker" };
  return { text: "[mídia]", type: "other" };
}

function formatPhone(phone: string) {
  if (phone.length === 13 && phone.startsWith("55")) {
    const ddd = phone.slice(2, 4);
    const num = phone.slice(4);
    if (num.length === 9) return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
  }
  return phone;
}

function shouldShowDateSeparator(msgs: WhatsAppMessage[], idx: number) {
  if (idx === 0) return true;
  const curr = new Date(msgs[idx].timestamp * 1000).toDateString();
  const prev = new Date(msgs[idx - 1].timestamp * 1000).toDateString();
  return curr !== prev;
}

function formatDateSeparator(ts: number) {
  const d = new Date(ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Hoje";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// WhatsApp-style chat background SVG pattern
const chatBgPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

export default function Conversations() {
  const [search, setSearch] = useState("");
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [text, setText] = useState("");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [lightboxLoading, setLightboxLoading] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const openLightbox = async (phone: string, fallbackImg?: string) => {
    setLightboxImg(fallbackImg || null);
    setLightboxLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-chat", {
        body: { action: "get-profile-pic", phone },
      });
      if (!error && data?.image) {
        setLightboxImg(data.image);
      }
    } catch {} finally {
      setLightboxLoading(false);
    }
  };

  const openImgLightbox = (url: string) => {
    setLightboxImg(url);
    setLightboxLoading(false);
  };

  const { data: chats, isLoading: chatsLoading } = useWhatsAppChats();
  const selectedPhone = selectedChat ? phoneFromChatId(selectedChat.wa_chatid) : null;
  const { data: messages, isLoading: msgsLoading } = useChatMessages(selectedPhone);
  const sendMutation = useSendMessage();
  const sendImageMutation = useSendImage();

  const filtered = (chats ?? []).filter((c) => {
    const q = search.toLowerCase();
    const name = chatName(c).toLowerCase();
    const phone = phoneFromChatId(c.wa_chatid);
    return name.includes(q) || phone.includes(search);
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !selectedPhone) return;
    sendMutation.mutate({ phone: selectedPhone, text: text.trim() });
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
    <AdminLayout title="Conversas" subtitle="Chat via WhatsApp">
      <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-xl border border-border shadow-lg mx-1 mb-1">
        {/* ─── Left panel ─── */}
        <div className={cn(
          "w-full md:w-[360px] md:min-w-[360px] flex flex-col bg-card/80 backdrop-blur-sm",
          selectedChat && "hidden md:flex"
        )}>
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-sm font-display font-bold tracking-tight">Conversas</h2>
              {chats && (
                <Badge variant="secondary" className="text-[10px] h-5 ml-auto rounded-full px-2.5 font-semibold">
                  {chats.length}
                </Badge>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                className="pl-9 bg-background/70 backdrop-blur-sm h-9 text-xs rounded-xl border-border/50 focus-visible:ring-primary/30"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Chat list */}
          <ScrollArea className="flex-1">
            {chatsLoading ? (
              <div className="p-2 space-y-0.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                    <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center">
                  <Search className="h-6 w-6 opacity-30" />
                </div>
                <p className="text-xs font-medium">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {filtered.map((chat, idx) => {
                  const isActive = selectedChat?.wa_chatid === chat.wa_chatid;
                  const hasUnread = (chat.wa_unreadCount ?? 0) > 0;
                  return (
                    <button
                      key={chat.wa_chatid}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 text-left rounded-xl transition-all duration-200",
                        isActive
                          ? "bg-primary/12 shadow-sm shadow-primary/10"
                          : "hover:bg-accent/40 active:scale-[0.99]",
                        hasUnread && !isActive && "bg-accent/20"
                      )}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="relative">
                        <Avatar
                          className={cn(
                            "h-12 w-12 shrink-0 transition-all duration-200",
                            isActive && "ring-2 ring-primary/40 ring-offset-2 ring-offset-card",
                            (chat.image || chat.imagePreview || chat.wa_profilePicUrl) && "cursor-pointer hover:opacity-80"
                          )}
                          onClick={(e) => {
                            const src = chat.image || chat.imagePreview || chat.wa_profilePicUrl;
                            if (src) { e.stopPropagation(); openLightbox(phoneFromChatId(chat.wa_chatid), src); }
                          }}
                        >
                          {(chat.image || chat.imagePreview || chat.wa_profilePicUrl) && <AvatarImage src={chat.image || chat.imagePreview || chat.wa_profilePicUrl} />}
                          <AvatarFallback className={cn(
                            "text-xs font-bold transition-colors",
                            isActive
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {getInitials(chatName(chat))}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online indicator */}
                        <span className={cn(
                          "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card",
                          hasUnread ? "bg-success" : "bg-muted-foreground/30"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            "text-[13px] truncate",
                            hasUnread || isActive ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                          )}>
                            {chatName(chat)}
                          </p>
                          <span className={cn(
                            "text-[10px] shrink-0 font-medium",
                            hasUnread ? "text-success" : "text-muted-foreground/70"
                          )}>
                            {formatTime(chat.wa_lastMsgTimestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={cn(
                            "text-[11px] truncate leading-relaxed",
                            hasUnread ? "text-foreground/70 font-medium" : "text-muted-foreground/70"
                          )}>
                            {typeof chat.wa_lastMsg === "string"
                              ? chat.wa_lastMsg
                              : typeof chat.wa_lastMsg === "object" && chat.wa_lastMsg !== null
                                ? (chat.wa_lastMsg as any).text ?? (chat.wa_lastMsg as any).caption ?? ""
                                : formatPhone(phoneFromChatId(chat.wa_chatid))}
                          </p>
                          {hasUnread && (
                            <span className="bg-success text-success-foreground text-[10px] font-bold rounded-full h-[18px] min-w-[18px] flex items-center justify-center px-1 shrink-0">
                              {chat.wa_unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Separator */}
        <div className="hidden md:block w-px bg-border/50" />

        {/* ─── Right panel ─── */}
        <div className={cn(
          "flex-1 flex flex-col bg-background",
          !selectedChat && "hidden md:flex"
        )}>
          {!selectedChat ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-6" style={{ backgroundImage: chatBgPattern }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="relative"
              >
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <MessageSquare className="h-12 w-12 text-primary/40" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                </div>
              </motion.div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-display font-bold text-foreground">WhatsApp Chat</h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Selecione uma conversa ao lado para visualizar mensagens e responder em tempo real
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ─── Chat header ─── */}
              <div className="h-[68px] border-b border-border/50 flex items-center justify-between px-4 bg-card/90 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <button
                    className="md:hidden p-2 hover:bg-accent rounded-xl transition-colors"
                    onClick={() => setSelectedChat(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <Avatar
                    className={cn(
                      "h-10 w-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-card",
                      (selectedChat.image || selectedChat.imagePreview || selectedChat.wa_profilePicUrl) && "cursor-pointer hover:opacity-80"
                    )}
                    onClick={() => {
                      const src = selectedChat.image || selectedChat.imagePreview || selectedChat.wa_profilePicUrl;
                      if (src) openLightbox(phoneFromChatId(selectedChat.wa_chatid), src);
                    }}
                  >
                    {(selectedChat.image || selectedChat.imagePreview || selectedChat.wa_profilePicUrl) && <AvatarImage src={selectedChat.image || selectedChat.imagePreview || selectedChat.wa_profilePicUrl} />}
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                      {getInitials(chatName(selectedChat))}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-display font-bold">{chatName(selectedChat)}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
                      {formatPhone(phoneFromChatId(selectedChat.wa_chatid))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* ─── Messages area ─── */}
              <div className="flex-1 overflow-hidden relative">
                {/* Background */}
                <div className="absolute inset-0 bg-background" style={{ backgroundImage: chatBgPattern }} />

                <ScrollArea className="h-full relative z-10">
                  <div className="px-4 md:px-8 lg:px-16 py-4 min-h-full flex flex-col justify-end">
                    {msgsLoading ? (
                      <div className="space-y-4 py-8">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                            <Skeleton className={cn("rounded-2xl", i % 2 === 0 ? "h-12 w-56" : "h-16 w-64")} />
                          </div>
                        ))}
                      </div>
                    ) : (messages ?? []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center rotate-3">
                          <Smile className="h-8 w-8 text-primary/30" />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-sm font-medium">Nenhuma mensagem</p>
                          <p className="text-xs text-muted-foreground/70">Envie a primeira mensagem!</p>
                        </div>
                      </div>
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedChat.wa_chatid}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-0.5"
                        >
                          {(messages ?? []).map((msg, idx) => {
                            const { text: msgText, type: msgType, imageUrl: msgImgUrl } = extractContent(msg);
                            const showDate = shouldShowDateSeparator(messages!, idx);

                            return (
                              <div key={msg.id}>
                                {showDate && (
                                  <div className="flex justify-center my-5">
                                    <span className="bg-card/95 backdrop-blur-md text-muted-foreground/80 text-[10px] uppercase tracking-wider px-4 py-1.5 rounded-full border border-border/30 shadow-sm font-semibold">
                                      {formatDateSeparator(msg.timestamp)}
                                    </span>
                                  </div>
                                )}

                                <div className={cn(
                                  "flex mb-0.5",
                                  msg.fromMe ? "justify-end" : "justify-start"
                                )}>
                                  <div className={cn(
                                    "relative max-w-[70%] px-3 py-2 text-[13px] leading-[1.45] break-words",
                                    msg.fromMe
                                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-br-md shadow-md shadow-primary/10"
                                      : "bg-card text-card-foreground border border-border/50 rounded-2xl rounded-bl-md shadow-sm"
                                  )}>
                                    {/* Tail / triangle */}
                                    <div className={cn(
                                      "absolute top-0 w-3 h-3 overflow-hidden",
                                      msg.fromMe ? "-right-1.5" : "-left-1.5"
                                    )}>
                                      <div className={cn(
                                        "w-3 h-3 rotate-45 transform origin-center",
                                        msg.fromMe
                                          ? "bg-primary translate-x-[-50%]"
                                          : "bg-card border-l border-t border-border/50 translate-x-[50%]"
                                      )} />
                                    </div>

                                    {/* Inline image */}
                                    {msgType === "image" && msgImgUrl && (
                                      <img
                                        src={msgImgUrl}
                                        alt="Imagem"
                                        loading="lazy"
                                        onClick={() => openImgLightbox(msgImgUrl)}
                                        className="rounded-xl max-w-[280px] w-full h-auto cursor-pointer hover:opacity-90 transition-opacity mb-1"
                                      />
                                    )}

                                    {/* Media indicator for non-image types */}
                                    {msgType !== "text" && msgType !== "image" && (
                                      <div className={cn(
                                        "flex items-center gap-1.5 mb-1 text-[11px] font-medium",
                                        msg.fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                                      )}>
                                        {msgType === "document" && <><FileText className="h-3 w-3" /> Documento</>}
                                        {msgType === "audio" && <><Mic className="h-3 w-3" /> Áudio</>}
                                        {msgType === "video" && <><Video className="h-3 w-3" /> Vídeo</>}
                                      </div>
                                    )}

                                    {/* Image without URL — show indicator */}
                                    {msgType === "image" && !msgImgUrl && (
                                      <div className={cn(
                                        "flex items-center gap-1.5 mb-1 text-[11px] font-medium",
                                        msg.fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                                      )}>
                                        <Image className="h-3 w-3" /> Imagem
                                      </div>
                                    )}

                                    {msgText && <p className="whitespace-pre-wrap">{msgText}</p>}

                                    {/* Timestamp & status */}
                                    <div className={cn(
                                      "flex items-center justify-end gap-1 mt-1",
                                      msg.fromMe ? "text-primary-foreground/50" : "text-muted-foreground/60"
                                    )}>
                                      <span className="text-[10px]">{formatMsgTime(msg.timestamp)}</span>
                                      {msg.fromMe && (
                                        msg.status === "read" || msg.status === "played"
                                          ? <CheckCheck className="h-3 w-3" style={{ color: "hsl(199, 89%, 70%)" }} />
                                          : msg.status === "delivered"
                                            ? <CheckCheck className="h-3 w-3" />
                                            : <Check className="h-3 w-3" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* ─── Input area ─── */}
              <div className="border-t border-border/50 px-4 md:px-8 lg:px-16 py-3 bg-card/90 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0 text-muted-foreground hover:text-foreground">
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setImageDialogOpen(true)}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Digite uma mensagem..."
                      className="bg-background/80 backdrop-blur-sm h-11 text-sm rounded-2xl border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/30"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sendMutation.isPending}
                    />
                  </div>
                  {text.trim() ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={sendMutation.isPending}
                        className={cn(
                          "shrink-0 h-11 w-11 rounded-2xl shadow-md shadow-primary/20 transition-all",
                          sendMutation.isPending && "opacity-60 animate-pulse"
                        )}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-11 w-11 rounded-2xl text-muted-foreground hover:text-foreground"
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>

    {/* Lightbox overlay for profile picture */}
    <AnimatePresence>
      {lightboxImg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxImg(null)}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-3 -right-3 z-10 rounded-full bg-card p-1.5 shadow-lg border border-border hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {lightboxLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
            <img
              src={lightboxImg}
              alt="Foto de perfil"
              className="max-h-[80vh] max-w-[80vw] rounded-2xl shadow-2xl object-contain"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Send image dialog */}
    <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Imagem</DialogTitle>
          <DialogDescription>Cole a URL da imagem que deseja enviar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="https://exemplo.com/imagem.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Preview"
              className="rounded-xl max-h-48 w-auto object-contain mx-auto"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
          <Input
            placeholder="Legenda (opcional)"
            value={imageCaption}
            onChange={(e) => setImageCaption(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setImageDialogOpen(false); setImageUrl(""); setImageCaption(""); }}>
            Cancelar
          </Button>
          <Button
            disabled={!imageUrl.trim() || !selectedPhone || sendImageMutation.isPending}
            onClick={() => {
              if (!selectedPhone || !imageUrl.trim()) return;
              sendImageMutation.mutate(
                { phone: selectedPhone, imageUrl: imageUrl.trim(), text: imageCaption.trim() },
                {
                  onSuccess: () => {
                    setImageDialogOpen(false);
                    setImageUrl("");
                    setImageCaption("");
                  },
                }
              );
            }}
          >
            {sendImageMutation.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

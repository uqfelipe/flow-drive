import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Send, MessageSquare, ArrowLeft, Phone, Image, FileText, Smile, Check, CheckCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useWhatsAppChats, useChatMessages, useSendMessage, type WhatsAppChat, type WhatsAppMessage } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

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

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts * 1000);
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
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function extractContent(msg: WhatsAppMessage): { text: string; type: "text" | "image" | "document" | "audio" | "video" | "sticker" | "other" } {
  const content = msg.content;
  if (typeof content === "string") {
    return { text: content, type: "text" };
  }
  if (typeof content === "object" && content !== null) {
    const c = content as any;
    if (c.text) return { text: c.text, type: "text" };
    if (c.caption) return { text: c.caption, type: "image" };
    if (c.fileName) return { text: `📄 ${c.fileName}`, type: "document" };
    if (c.mimetype?.startsWith("image")) return { text: "📷 Imagem", type: "image" };
    if (c.mimetype?.startsWith("video")) return { text: "🎥 Vídeo", type: "video" };
    if (c.mimetype?.startsWith("audio")) return { text: "🎵 Áudio", type: "audio" };
    if (c.title) return { text: c.title, type: "other" };
  }
  const msgType = msg.type?.toLowerCase() ?? "";
  if (msgType.includes("image")) return { text: "📷 Imagem", type: "image" };
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

export default function Conversations() {
  const [search, setSearch] = useState("");
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chats, isLoading: chatsLoading } = useWhatsAppChats();
  const selectedPhone = selectedChat ? phoneFromChatId(selectedChat.wa_chatid) : null;
  const { data: messages, isLoading: msgsLoading } = useChatMessages(selectedPhone);
  const sendMutation = useSendMessage();

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
    <AdminLayout title="Conversas" subtitle="Chat via WhatsApp">
      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {/* Left panel - chat list */}
        <div className={cn(
          "w-full md:w-[340px] md:min-w-[340px] border-r border-border flex flex-col bg-card",
          selectedChat && "hidden md:flex"
        )}>
          {/* Search header */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold">Conversas</h2>
              {chats && (
                <Badge variant="secondary" className="text-[10px] h-5 ml-auto">
                  {chats.length}
                </Badge>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                className="pl-9 bg-background h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {chatsLoading ? (
              <div className="p-3 space-y-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                    <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Search className="h-8 w-8 opacity-20" />
                <p className="text-sm">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <div className="p-1.5">
                {filtered.map((chat) => {
                  const isActive = selectedChat?.wa_chatid === chat.wa_chatid;
                  const hasUnread = (chat.wa_unreadCount ?? 0) > 0;
                  return (
                    <button
                      key={chat.wa_chatid}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 text-left transition-all rounded-lg group",
                        isActive
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-accent/50 border border-transparent",
                        hasUnread && !isActive && "bg-accent/30"
                      )}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="relative">
                        <Avatar className="h-11 w-11 shrink-0 ring-2 ring-background">
                          {chat.wa_profilePicUrl && <AvatarImage src={chat.wa_profilePicUrl} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(chatName(chat))}
                          </AvatarFallback>
                        </Avatar>
                        {hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 bg-success h-3.5 w-3.5 rounded-full border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            "text-sm truncate",
                            hasUnread ? "font-semibold" : "font-medium"
                          )}>
                            {chatName(chat)}
                          </p>
                          <span className={cn(
                            "text-[10px] shrink-0",
                            hasUnread ? "text-success font-semibold" : "text-muted-foreground"
                          )}>
                            {formatTime(chat.wa_lastMsgTimestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={cn(
                            "text-xs truncate",
                            hasUnread ? "text-foreground/80" : "text-muted-foreground"
                          )}>
                            {chat.wa_lastMsg || formatPhone(phoneFromChatId(chat.wa_chatid))}
                          </p>
                          {hasUnread && (
                            <span className="bg-success text-success-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 shrink-0">
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

        {/* Right panel - chat area */}
        <div className={cn(
          "flex-1 flex flex-col",
          !selectedChat && "hidden md:flex"
        )}>
          {!selectedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 bg-background/50">
              <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center">
                <MessageSquare className="h-10 w-10 text-primary/30" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-medium">WhatsApp Chat</p>
                <p className="text-sm text-muted-foreground">Selecione uma conversa para começar a conversar</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="h-16 border-b border-border flex items-center justify-between px-4 bg-card shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    className="md:hidden p-1.5 hover:bg-accent rounded-lg transition-colors"
                    onClick={() => setSelectedChat(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <Avatar className="h-10 w-10 ring-2 ring-background">
                    {selectedChat.wa_profilePicUrl && <AvatarImage src={selectedChat.wa_profilePicUrl} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(chatName(selectedChat))}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{chatName(selectedChat)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {formatPhone(phoneFromChatId(selectedChat.wa_chatid))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-hidden relative">
                {/* Chat background pattern */}
                <div className="absolute inset-0 bg-background opacity-95" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--muted)) 1px, transparent 0)`,
                  backgroundSize: '24px 24px',
                }} />
                
                <ScrollArea className="h-full relative z-10">
                  <div className="px-4 py-4 min-h-full flex flex-col justify-end">
                    {msgsLoading ? (
                      <div className="space-y-4 py-8">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                            <Skeleton className={cn("rounded-2xl", i % 2 === 0 ? "h-10 w-52" : "h-14 w-64")} />
                          </div>
                        ))}
                      </div>
                    ) : (messages ?? []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                        <Smile className="h-8 w-8 opacity-20" />
                        <p className="text-sm">Nenhuma mensagem ainda</p>
                        <p className="text-xs">Envie a primeira mensagem!</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {(messages ?? []).map((msg, idx) => {
                          const { text: msgText, type: msgType } = extractContent(msg);
                          const showDate = shouldShowDateSeparator(messages!, idx);
                          
                          return (
                            <div key={msg.id}>
                              {showDate && (
                                <div className="flex justify-center my-4">
                                  <span className="bg-card/90 backdrop-blur-sm text-muted-foreground text-[11px] px-4 py-1.5 rounded-full border border-border shadow-sm font-medium">
                                    {formatDateSeparator(msg.timestamp)}
                                  </span>
                                </div>
                              )}
                              
                              <div className={cn(
                                "flex mb-1",
                                msg.fromMe ? "justify-end" : "justify-start"
                              )}>
                                <div className={cn(
                                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm relative group",
                                  msg.fromMe
                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                    : "bg-card border border-border rounded-bl-sm"
                                )}>
                                  {/* Media type indicator */}
                                  {msgType !== "text" && (
                                    <div className={cn(
                                      "flex items-center gap-1.5 mb-1 text-xs",
                                      msg.fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                                    )}>
                                      {msgType === "image" && <Image className="h-3.5 w-3.5" />}
                                      {msgType === "document" && <FileText className="h-3.5 w-3.5" />}
                                    </div>
                                  )}
                                  
                                  <p className="whitespace-pre-wrap leading-relaxed">{msgText}</p>
                                  
                                  <div className={cn(
                                    "flex items-center justify-end gap-1 mt-1 -mb-0.5",
                                    msg.fromMe ? "text-primary-foreground/60" : "text-muted-foreground"
                                  )}>
                                    <span className="text-[10px]">{formatMsgTime(msg.timestamp)}</span>
                                    {msg.fromMe && (
                                      msg.status === "read" || msg.status === "played"
                                        ? <CheckCheck className="h-3.5 w-3.5 text-primary" />
                                        : msg.status === "delivered"
                                          ? <CheckCheck className="h-3.5 w-3.5" />
                                          : <Check className="h-3.5 w-3.5" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Input area */}
              <div className="border-t border-border p-3 bg-card">
                <div className="flex items-center gap-2 max-w-4xl mx-auto">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Digite uma mensagem..."
                      className="bg-background h-11 pr-12 text-sm rounded-xl"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sendMutation.isPending}
                    />
                  </div>
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!text.trim() || sendMutation.isPending}
                    className="shrink-0 h-11 w-11 rounded-xl"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

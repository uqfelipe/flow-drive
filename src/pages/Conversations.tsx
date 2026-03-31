import { AdminLayout } from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, Send, MessageSquare, ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useWhatsAppChats, useChatMessages, useSendMessage, type WhatsAppChat } from "@/hooks/use-chat";
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
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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
          "w-full md:w-80 md:min-w-[320px] border-r border-border flex flex-col bg-card",
          selectedChat && "hidden md:flex"
        )}>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {chatsLoading ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2.5 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhuma conversa encontrada.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((chat) => {
                  const isActive = selectedChat?.wa_chatid === chat.wa_chatid;
                  return (
                    <button
                      key={chat.wa_chatid}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-accent/50",
                        isActive && "bg-accent"
                      )}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        {chat.wa_profilePicUrl && <AvatarImage src={chat.wa_profilePicUrl} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(chatName(chat))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{chatName(chat)}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {formatTime(chat.wa_lastMsgTimestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {chat.wa_lastMsg || phoneFromChatId(chat.wa_chatid)}
                        </p>
                      </div>
                      {(chat.wa_unreadCount ?? 0) > 0 && (
                        <span className="bg-success text-success-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                          {chat.wa_unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right panel - chat area */}
        <div className={cn(
          "flex-1 flex flex-col bg-background",
          !selectedChat && "hidden md:flex"
        )}>
          {!selectedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageSquare className="h-12 w-12 opacity-30" />
              <p className="text-sm">Selecione uma conversa para começar</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="h-14 border-b border-border flex items-center gap-3 px-4 bg-card">
                <button
                  className="md:hidden p-1 hover:bg-accent rounded"
                  onClick={() => setSelectedChat(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar className="h-8 w-8">
                  {selectedChat.wa_profilePicUrl && <AvatarImage src={selectedChat.wa_profilePicUrl} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(chatName(selectedChat))}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{chatName(selectedChat)}</p>
                  <p className="text-[10px] text-muted-foreground">{phoneFromChatId(selectedChat.wa_chatid)}</p>
                </div>
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1 px-4 py-3">
                {msgsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                        <Skeleton className="h-8 w-48 rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : (messages ?? []).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhuma mensagem encontrada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(messages ?? []).map((msg) => (
                      <div
                        key={msg.id}
                        className={cn("flex", msg.fromMe ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-3 py-2 text-sm break-words",
                            msg.fromMe
                              ? "bg-success/90 text-success-foreground rounded-br-md"
                              : "bg-card border border-border rounded-bl-md"
                          )}
                        >
                          <p className="whitespace-pre-wrap">
                            {typeof msg.content === "string"
                              ? msg.content
                              : typeof msg.content === "object" && msg.content !== null
                                ? (msg.content as any).text ?? (msg.content as any).caption ?? "[mídia]"
                                : String(msg.content ?? "")}
                          </p>
                          <p className={cn(
                            "text-[9px] mt-1",
                            msg.fromMe ? "text-success-foreground/70 text-right" : "text-muted-foreground text-right"
                          )}>
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input area */}
              <div className="border-t border-border p-3 bg-card">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Digite uma mensagem..."
                    className="flex-1 bg-background"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sendMutation.isPending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!text.trim() || sendMutation.isPending}
                    className="shrink-0"
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

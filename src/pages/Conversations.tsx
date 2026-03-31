import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MessageSquare, Clock } from "lucide-react";
import { useState } from "react";
import { useChatSessions } from "@/hooks/use-conversations";

const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: "Em andamento", className: "bg-success/10 text-success border-success/20" },
  waiting: { label: "Aguardando", className: "bg-warning/10 text-warning border-warning/20" },
  completed: { label: "Finalizado", className: "bg-muted text-muted-foreground border-border" },
};

export default function Conversations() {
  const [search, setSearch] = useState("");
  const { data: sessions, isLoading } = useChatSessions();

  const filtered = (sessions ?? []).filter((c) => {
    const q = search.toLowerCase();
    return (c.customers?.name ?? "").toLowerCase().includes(q) || (c.customers?.phone ?? "").includes(search);
  });

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)} dia(s) atrás`;
  };

  return (
    <AdminLayout title="Conversas" subtitle="Histórico de atendimentos via WhatsApp">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar conversa..." className="pl-9 bg-card" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="grid gap-3">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full" /></CardContent></Card>))}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma conversa encontrada.</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((session) => {
              const st = statusMap[session.status] ?? statusMap.active;
              return (
                <Card key={session.id} className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{session.customers?.name ?? "—"}</p>
                          <span className="text-[10px] text-muted-foreground">{session.customers?.phone ?? ""}</span>
                        </div>
                        <p className="text-[10px] text-primary/70 mt-0.5">Fluxo: {session.chatbot_flows?.name ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{timeAgo(session.updated_at)}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${st.className}`}>{st.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

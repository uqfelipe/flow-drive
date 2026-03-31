import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, Clock } from "lucide-react";
import { useState } from "react";

const mockConversations = [
  { id: "1", customer: "João Silva", phone: "(11) 99999-1111", lastMessage: "Quero ver os carros disponíveis", flow: "Atendimento Inicial", status: "active", time: "2 min atrás" },
  { id: "2", customer: "Maria Santos", phone: "(11) 99999-2222", lastMessage: "Confirmo a reserva do Civic", flow: "Reserva de Veículo", status: "waiting", time: "15 min atrás" },
  { id: "3", customer: "Carlos Lima", phone: "(21) 98888-3333", lastMessage: "Qual o valor da diária do HB20?", flow: "Mostrar Carros", status: "active", time: "1h atrás" },
  { id: "4", customer: "Ana Costa", phone: "(31) 97777-4444", lastMessage: "Preciso falar com um atendente", flow: "Transferência Humano", status: "human", time: "3h atrás" },
  { id: "5", customer: "Pedro Oliveira", phone: "(41) 96666-5555", lastMessage: "Obrigado, até mais!", flow: "Atendimento Inicial", status: "completed", time: "1 dia atrás" },
];

const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: "Em andamento", className: "bg-success/10 text-success border-success/20" },
  waiting: { label: "Aguardando", className: "bg-warning/10 text-warning border-warning/20" },
  human: { label: "Atendimento Humano", className: "bg-primary/10 text-primary border-primary/20" },
  completed: { label: "Finalizado", className: "bg-muted text-muted-foreground border-border" },
};

export default function Conversations() {
  const [search, setSearch] = useState("");
  const filtered = mockConversations.filter(
    (c) => c.customer.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <AdminLayout title="Conversas" subtitle="Histórico de atendimentos via WhatsApp">
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar conversa..." className="pl-9 bg-card" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="grid gap-3">
          {filtered.map((conv) => (
            <Card key={conv.id} className="bg-card border-border hover:border-primary/20 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{conv.customer}</p>
                      <span className="text-[10px] text-muted-foreground">{conv.phone}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[300px]">{conv.lastMessage}</p>
                    <p className="text-[10px] text-primary/70 mt-0.5">Fluxo: {conv.flow}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />{conv.time}
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${statusMap[conv.status].className}`}>
                    {statusMap[conv.status].label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

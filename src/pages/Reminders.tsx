import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useReminders, useCreateReminder, useCancelReminder } from "@/hooks/use-reminders";
import { useCustomers } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Ban, AlarmClock } from "lucide-react";
import { format } from "date-fns";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  sent: { label: "Enviado", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "secondary" },
};

// Convert a São Paulo local datetime string to UTC ISO string
function spToUtc(dateStr: string, timeStr: string): string {
  // Build an ISO string with the SP offset
  // São Paulo is UTC-3 (standard) but can be UTC-3 year-round since 2019
  const dt = new Date(`${dateStr}T${timeStr}-03:00`);
  return dt.toISOString();
}

// Format a UTC ISO string to São Paulo local time
function formatSP(isoStr: string): string {
  const dt = new Date(isoStr);
  return dt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default function Reminders() {
  const { data: reminders, isLoading } = useReminders();
  const { data: customers } = useCustomers();
  const createReminder = useCreateReminder();
  const cancelReminder = useCancelReminder();

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleCreate = async () => {
    if (!customerId || !message || !date || !time) {
      toast.error("Preencha todos os campos");
      return;
    }
    try {
      const scheduled_at = spToUtc(date, time);
      await createReminder.mutateAsync({ customer_id: customerId, message, scheduled_at });
      toast.success("Lembrete criado com sucesso!");
      setOpen(false);
      setCustomerId("");
      setMessage("");
      setDate("");
      setTime("");
    } catch {
      toast.error("Erro ao criar lembrete");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelReminder.mutateAsync(id);
      toast.success("Lembrete cancelado");
    } catch {
      toast.error("Erro ao cancelar");
    }
  };

  return (
    <AdminLayout title="Lembretes" subtitle="Agende envios via WhatsApp">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlarmClock className="h-5 w-5" />
            <span className="text-sm">{reminders?.length || 0} lembretes</span>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Lembrete
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Lembrete</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} — {c.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Texto do lembrete..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data (São Paulo)</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora (HH:MM:SS)</Label>
                    <Input
                      type="time"
                      step="1"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={handleCreate} disabled={createReminder.isPending} className="w-full">
                  {createReminder.isPending ? "Criando..." : "Criar Lembrete"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Todos os Lembretes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !reminders?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum lembrete criado ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Agendado para</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminders.map((r) => {
                    const st = statusMap[r.status] || statusMap.pending;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.customer_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.message}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatSP(r.scheduled_at)}</TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {r.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancel(r.id)}
                              title="Cancelar"
                            >
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

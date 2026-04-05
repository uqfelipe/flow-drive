import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useReminders, useCreateReminder, useCancelReminder, useUpdateReminder, useDeleteReminder } from "@/hooks/use-reminders";
import { useCustomers } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Ban, AlarmClock, Pencil, Trash2 } from "lucide-react";
import type { ReminderWithCustomer } from "@/hooks/use-reminders";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  sent: { label: "Enviado", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "secondary" },
};

function spToUtc(dateStr: string, timeStr: string): string {
  const dt = new Date(`${dateStr}T${timeStr}-03:00`);
  return dt.toISOString();
}

function formatSP(isoStr: string): string {
  const dt = new Date(isoStr);
  return dt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function isoToSpDate(isoStr: string): string {
  const dt = new Date(isoStr);
  const sp = new Date(dt.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${sp.getFullYear()}-${String(sp.getMonth() + 1).padStart(2, "0")}-${String(sp.getDate()).padStart(2, "0")}`;
}

function isoToSpTime(isoStr: string): string {
  const dt = new Date(isoStr);
  const sp = new Date(dt.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${String(sp.getHours()).padStart(2, "0")}:${String(sp.getMinutes()).padStart(2, "0")}:${String(sp.getSeconds()).padStart(2, "0")}`;
}

export default function Reminders() {
  const { data: reminders, isLoading } = useReminders();
  const { data: customers } = useCustomers();
  const createReminder = useCreateReminder();
  const cancelReminder = useCancelReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setCustomerId("");
    setMessage("");
    setDate("");
    setTime("");
  };

  const openForEdit = (r: ReminderWithCustomer) => {
    setEditingId(r.id);
    setCustomerId(r.customer_id);
    setMessage(r.message);
    setDate(isoToSpDate(r.scheduled_at));
    setTime(isoToSpTime(r.scheduled_at));
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!customerId || !message || !date || !time) {
      toast.error("Preencha todos os campos");
      return;
    }
    try {
      const scheduled_at = spToUtc(date, time);
      if (editingId) {
        await updateReminder.mutateAsync({ id: editingId, customer_id: customerId, message, scheduled_at });
        toast.success("Lembrete atualizado!");
      } else {
        await createReminder.mutateAsync({ customer_id: customerId, message, scheduled_at });
        toast.success("Lembrete criado com sucesso!");
      }
      setOpen(false);
      resetForm();
    } catch {
      toast.error(editingId ? "Erro ao atualizar lembrete" : "Erro ao criar lembrete");
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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReminder.mutateAsync(deleteId);
      toast.success("Lembrete removido");
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setDeleteId(null);
    }
  };

  const isPending = createReminder.isPending || updateReminder.isPending;

  return (
    <AdminLayout title="Lembretes" subtitle="Agende envios via WhatsApp">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlarmClock className="h-5 w-5" />
            <span className="text-sm">{reminders?.length || 0} lembretes</span>
          </div>

          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Lembrete
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Lembrete" : "Novo Lembrete"}</DialogTitle>
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
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora (HH:MM:SS)</Label>
                    <Input type="time" step="1" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                </div>

                <Button onClick={handleSubmit} disabled={isPending} className="w-full">
                  {isPending ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Lembrete"}
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
                    <TableHead className="w-[120px]">Ações</TableHead>
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
                          <div className="flex items-center gap-1">
                            {r.status === "pending" && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openForEdit(r)} title="Editar">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleCancel(r.id)} title="Cancelar">
                                  <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)} title="Remover">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lembrete?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lembrete será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

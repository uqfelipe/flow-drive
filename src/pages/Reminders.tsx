import { useState, useEffect, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useReminders, useCreateReminder, useCancelReminder, useUpdateReminder, useDeleteReminder, useProcessReminders } from "@/hooks/use-reminders";
import { useCustomers } from "@/hooks/use-customers";
import { useSettings, useUpdateSetting } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Ban, AlarmClock, Pencil, Trash2, Play, FlaskConical, Loader2, Radio, CheckCircle2, XCircle } from "lucide-react";
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

function isOverdue(isoStr: string): boolean {
  return new Date(isoStr) < new Date();
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default function Reminders() {
  const { data: reminders, isLoading } = useReminders();
  const { data: customers } = useCustomers();
  const { data: settings } = useSettings();
  const updateSetting = useUpdateSetting();
  const createReminder = useCreateReminder();
  const cancelReminder = useCancelReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const processReminders = useProcessReminders();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Quick test state
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [testReminderId, setTestReminderId] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-process state
  const autoEnabled = settings?.reminders_auto_process === "true";
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [lastResult, setLastResult] = useState<"success" | "fail" | "none" | null>(null);
  const [lastSentCount, setLastSentCount] = useState(0);
  const autoProcessingRef = useRef(false);
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleAutoProcess = async () => {
    const newValue = autoEnabled ? "false" : "true";
    try {
      await updateSetting.mutateAsync({ key: "reminders_auto_process", value: newValue });
      toast.success(newValue === "true" ? "Envio automático ativado" : "Envio automático desativado");
    } catch {
      toast.error("Erro ao salvar configuração");
    }
  };

  // Auto-process loop
  useEffect(() => {
    if (!autoEnabled) {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
      return;
    }

    const runAutoProcess = async () => {
      // Guard: skip if already processing
      if (autoProcessingRef.current || processReminders.isPending) return;

      // Check if there are any overdue pending reminders
      const hasOverdue = reminders?.some(
        (r) => r.status === "pending" && isOverdue(r.scheduled_at)
      );

      setLastCheck(new Date());

      if (!hasOverdue) {
        setLastResult("none");
        return;
      }

      autoProcessingRef.current = true;
      try {
        const result = await processReminders.mutateAsync(undefined);
        setLastSentCount(result.sent);
        if (result.sent > 0) {
          setLastResult("success");
          toast.success(`⚡ Auto: ${result.sent} lembrete(s) enviado(s)!`);
        } else {
          setLastResult("none");
        }
        if (result.results?.length) {
          const failures = result.results.filter((r) => r.status === "failed");
          if (failures.length > 0) {
            setLastResult("fail");
            failures.forEach((f) => toast.error(`Auto falha: ${f.detail}`));
          }
        }
      } catch (err) {
        setLastResult("fail");
        console.error("[AUTO-PROCESS]", err);
      } finally {
        autoProcessingRef.current = false;
      }
    };

    // Run immediately on enable
    runAutoProcess();

    // Then poll every 5 seconds
    autoIntervalRef.current = setInterval(runAutoProcess, 5000);

    return () => {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
    };
  }, [autoEnabled, reminders, processReminders]);

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

  const handleProcessNow = async () => {
    try {
      const result = await processReminders.mutateAsync(undefined);
      if (result.sent > 0) {
        toast.success(`${result.sent} lembrete(s) enviado(s)!`);
      } else {
        toast.info("Nenhum lembrete pendente para enviar");
      }
      if (result.results?.length) {
        result.results.forEach((r) => {
          if (r.status === "failed") {
            toast.error(`Falha: ${r.detail}`);
          }
        });
      }
    } catch (err) {
      toast.error("Erro ao processar lembretes");
      console.error(err);
    }
  };

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const processTestReminder = useCallback(async (id: string) => {
    try {
      const result = await processReminders.mutateAsync(id);
      if (result.sent > 0) {
        toast.success("✅ Teste enviado com sucesso!");
      } else {
        const detail = result.results?.[0]?.detail || "unknown";
        toast.error(`Teste falhou: ${detail}`);
      }
    } catch (err) {
      toast.error("Erro ao processar teste");
      console.error(err);
    } finally {
      setTestReminderId(null);
    }
  }, [processReminders]);

  const handleQuickTest = async () => {
    if (!customers?.length) {
      toast.error("Nenhum cliente cadastrado para teste");
      return;
    }

    const customer = customers[0];
    const scheduledAt = new Date(Date.now() + 10_000).toISOString();

    try {
      const result = await createReminder.mutateAsync({
        customer_id: customer.id,
        message: `🧪 Teste automático de lembrete — ${new Date().toLocaleTimeString("pt-BR")}`,
        scheduled_at: scheduledAt,
      });

      const newId = (result as any)?.id;
      if (!newId) {
        toast.error("Erro ao obter ID do lembrete de teste");
        return;
      }

      setTestReminderId(newId);
      setTestCountdown(10);
      toast.info(`Teste criado! Enviando em 10 segundos para ${customer.name}...`);

      if (countdownRef.current) clearInterval(countdownRef.current);
      let remaining = 10;
      countdownRef.current = setInterval(() => {
        remaining--;
        setTestCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          setTestCountdown(null);
          processTestReminder(newId);
        }
      }, 1000);
    } catch (err) {
      toast.error("Erro ao criar lembrete de teste");
      console.error(err);
    }
  };

  const isPending = createReminder.isPending || updateReminder.isPending;

  return (
    <AdminLayout title="Lembretes" subtitle="Agende envios via WhatsApp">
      <div className="space-y-6">
        {/* Auto-process status bar */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoEnabled}
                onCheckedChange={toggleAutoProcess}
                disabled={updateSetting.isPending}
              />
              <Label className="cursor-pointer font-medium" onClick={toggleAutoProcess}>
                Enviar automaticamente
              </Label>
            </div>

            {autoEnabled && (
              <div className="flex items-center gap-2">
                <Radio className="h-3.5 w-3.5 text-green-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Monitorando a cada 5s</span>
              </div>
            )}
          </div>

          {autoEnabled && lastCheck && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Última verificação: {formatTime(lastCheck)}</span>
              {lastResult === "success" && (
                <span className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {lastSentCount} enviado(s)
                </span>
              )}
              {lastResult === "fail" && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  Falha no envio
                </span>
              )}
              {lastResult === "none" && (
                <span>Nenhum pendente vencido</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlarmClock className="h-5 w-5" />
            <span className="text-sm">{reminders?.length || 0} lembretes</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {testCountdown !== null && (
              <Badge variant="outline" className="animate-pulse text-sm px-3 py-1">
                Enviando em {testCountdown}s...
              </Badge>
            )}

            <Button variant="outline" size="sm" onClick={handleQuickTest} disabled={createReminder.isPending || testCountdown !== null}>
              <FlaskConical className="h-4 w-4 mr-2" />
              Teste em 10s
            </Button>

            <Button variant="outline" size="sm" onClick={handleProcessNow} disabled={processReminders.isPending}>
              {processReminders.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Processar agora
            </Button>

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
                  <DialogDescription>
                    {editingId ? "Altere os dados do lembrete agendado." : "Agende um novo lembrete para envio via WhatsApp."}
                  </DialogDescription>
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
                    const overdue = r.status === "pending" && isOverdue(r.scheduled_at);
                    return (
                      <TableRow key={r.id} className={overdue ? "bg-destructive/5" : undefined}>
                        <TableCell className="font-medium">{r.customer_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.message}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatSP(r.scheduled_at)}
                          {overdue && (
                            <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0">
                              Vencido
                            </Badge>
                          )}
                        </TableCell>
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

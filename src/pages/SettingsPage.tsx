import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Shield, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { useSettings, useUpdateSetting } from "@/hooks/use-settings";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();

  const [form, setForm] = useState({ company_name: "", company_cnpj: "", company_phone: "" });
  

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name ?? "",
        company_cnpj: settings.company_cnpj ?? "",
        company_phone: settings.company_phone ?? "",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: "company_name", value: form.company_name }),
        updateSetting.mutateAsync({ key: "company_cnpj", value: form.company_cnpj }),
        updateSetting.mutateAsync({ key: "company_phone", value: form.company_phone }),
      ]);
      toast.success("Configurações salvas!");
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const toggleNotification = (key: string) => {
    const current = settings?.[key] === "true";
    updateSetting.mutate({ key, value: current ? "false" : "true" });
  };

  if (isLoading) {
    return (
      <AdminLayout title="Configurações" subtitle="Preferências do sistema">
        <div className="p-6 max-w-2xl"><Skeleton className="h-64 w-full" /></div>
      </AdminLayout>
    );
  }

  const notifications = [
    { key: "notification_payment_reminder", label: "Lembrete de pagamento", desc: "Enviar lembrete 3 dias antes do vencimento" },
    { key: "notification_overdue_alert", label: "Alerta de atraso", desc: "Notificar quando pagamento estiver vencido" },
    { key: "notification_return_reminder", label: "Lembrete de devolução", desc: "Avisar 1 dia antes da devolução" },
    { key: "notification_whatsapp_booking", label: "Nova reserva via WhatsApp", desc: "Notificar quando cliente fizer reserva pelo bot" },
  ];

  return (
    <AdminLayout title="Configurações" subtitle="Preferências do sistema">
      <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-display flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Dados da Locadora</CardTitle>
            <CardDescription className="text-xs">Informações da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome da Locadora</Label>
              <Input className="bg-muted/50" value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">CNPJ</Label>
              <Input className="bg-muted/50" value={form.company_cnpj} onChange={(e) => setForm((f) => ({ ...f, company_cnpj: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Telefone</Label>
              <Input className="bg-muted/50" value={form.company_phone} onChange={(e) => setForm((f) => ({ ...f, company_phone: e.target.value }))} />
            </div>
            <Button size="sm" onClick={handleSave} disabled={updateSetting.isPending}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </CardContent>
        </Card>



        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-display flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notificações</CardTitle>
            <CardDescription className="text-xs">Configure alertas automáticos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifications.map((n) => (
              <div key={n.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-[11px] text-muted-foreground">{n.desc}</p>
                </div>
                <Switch checked={settings?.[n.key] === "true"} onCheckedChange={() => toggleNotification(n.key)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, Shield, Bell, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useSettings, useUpdateSetting } from "@/hooks/use-settings";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();

  const [form, setForm] = useState({ company_name: "", company_cnpj: "", company_phone: "" });
  const [welcomeForm, setWelcomeForm] = useState({ welcome_enabled: "false", welcome_type: "text", welcome_text: "", welcome_audio_url: "" });

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name ?? "",
        company_cnpj: settings.company_cnpj ?? "",
        company_phone: settings.company_phone ?? "",
      });
      setWelcomeForm({
        welcome_enabled: settings.welcome_enabled ?? "false",
        welcome_type: settings.welcome_type ?? "text",
        welcome_text: settings.welcome_text ?? "",
        welcome_audio_url: settings.welcome_audio_url ?? "",
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
            <CardTitle className="text-sm font-display flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Mensagem de Boas-Vindas</CardTitle>
            <CardDescription className="text-xs">Enviada apenas no primeiro contato do cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Ativar boas-vindas</p>
                <p className="text-[11px] text-muted-foreground">Enviar mensagem automática no primeiro contato</p>
              </div>
              <Switch checked={welcomeForm.welcome_enabled === "true"} onCheckedChange={async (v) => {
                const newVal = v ? "true" : "false";
                setWelcomeForm(f => ({ ...f, welcome_enabled: newVal }));
                try {
                  await updateSetting.mutateAsync({ key: "welcome_enabled", value: newVal });
                  toast.success(v ? "Boas-vindas ativada!" : "Boas-vindas desativada!");
                } catch { toast.error("Erro ao salvar"); }
              }} />
            </div>
            {welcomeForm.welcome_enabled === "true" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Tipo de mensagem</Label>
                  <RadioGroup value={welcomeForm.welcome_type} onValueChange={(v) => setWelcomeForm(f => ({ ...f, welcome_type: v }))} className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="text" id="wt-text" />
                      <Label htmlFor="wt-text" className="text-xs cursor-pointer">Texto</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="audio" id="wt-audio" />
                      <Label htmlFor="wt-audio" className="text-xs cursor-pointer">Áudio</Label>
                    </div>
                  </RadioGroup>
                </div>
                {welcomeForm.welcome_type === "text" ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Mensagem de texto</Label>
                    <Textarea className="bg-muted/50" rows={3} placeholder="Olá! Bem-vindo à nossa locadora..." value={welcomeForm.welcome_text} onChange={(e) => setWelcomeForm(f => ({ ...f, welcome_text: e.target.value }))} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs">URL do áudio</Label>
                    <Input className="bg-muted/50" placeholder="https://exemplo.com/audio.mp3" value={welcomeForm.welcome_audio_url} onChange={(e) => setWelcomeForm(f => ({ ...f, welcome_audio_url: e.target.value }))} />
                  </div>
                )}
                <Button size="sm" onClick={async () => {
                  try {
                    await Promise.all([
                      updateSetting.mutateAsync({ key: "welcome_type", value: welcomeForm.welcome_type }),
                      updateSetting.mutateAsync({ key: "welcome_text", value: welcomeForm.welcome_text }),
                      updateSetting.mutateAsync({ key: "welcome_audio_url", value: welcomeForm.welcome_audio_url }),
                    ]);
                    toast.success("Configuração de boas-vindas salva!");
                  } catch { toast.error("Erro ao salvar"); }
                }} disabled={updateSetting.isPending}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
              </>
            )}
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

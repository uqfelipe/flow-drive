import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Smartphone, Wifi, WifiOff, QrCode, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useWhatsAppConfig, useUpdateWhatsAppConfig } from "@/hooks/use-settings";
import { toast } from "sonner";

export default function WhatsAppConfig() {
  const { data: config, isLoading } = useWhatsAppConfig();
  const updateConfig = useUpdateWhatsAppConfig();

  const [form, setForm] = useState({ instance_name: "", base_url: "", api_token: "", webhook_url: "" });

  useEffect(() => {
    if (config) {
      setForm({
        instance_name: config.instance_name ?? "",
        base_url: config.base_url ?? "",
        api_token: config.api_token ?? "",
        webhook_url: config.webhook_url ?? "",
      });
    }
  }, [config]);

  const handleSave = () => {
    if (!config) return;
    updateConfig.mutate({ id: config.id, ...form }, {
      onSuccess: () => toast.success("Configurações salvas!"),
      onError: () => toast.error("Erro ao salvar"),
    });
  };

  if (isLoading) {
    return (
      <AdminLayout title="WhatsApp" subtitle="Configuração da instância WhatsApi">
        <div className="p-6 max-w-2xl"><Skeleton className="h-64 w-full" /></div>
      </AdminLayout>
    );
  }

  const isConnected = config?.status === "connected";

  return (
    <AdminLayout title="WhatsApp" subtitle="Configuração da instância WhatsApi">
      <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" /> Status da Conexão
                </CardTitle>
                <CardDescription className="text-xs mt-1">Gerencie sua conexão com o WhatsApp</CardDescription>
              </div>
              <Badge variant="outline" className={isConnected ? "bg-success/10 text-success border-success/20 text-[10px] flex items-center gap-1" : "bg-destructive/10 text-destructive border-destructive/20 text-[10px] flex items-center gap-1"}>
                {isConnected ? <><Wifi className="h-3 w-3" /> Conectado</> : <><WifiOff className="h-3 w-3" /> Desconectado</>}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="h-24 w-24 rounded-lg bg-card border border-border flex items-center justify-center">
                <QrCode className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">QR Code para conexão</p>
                <p className="text-[11px] text-muted-foreground">Escaneie o QR Code com o WhatsApp para conectar a instância</p>
                <Button size="sm" variant="outline" className="mt-2"><QrCode className="h-3 w-3 mr-1" /> Gerar novo QR Code</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-display">Configurações da API</CardTitle>
            <CardDescription className="text-xs">Configure os dados de conexão com a WhatsApi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">URL Base da API</Label>
              <Input className="bg-muted/50" value={form.base_url} onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Token da API</Label>
              <Input type="password" className="bg-muted/50" value={form.api_token} onChange={(e) => setForm((f) => ({ ...f, api_token: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">URL do Webhook</Label>
              <Input className="bg-muted/50" value={form.webhook_url} onChange={(e) => setForm((f) => ({ ...f, webhook_url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nome da Instância</Label>
              <Input className="bg-muted/50" value={form.instance_name} onChange={(e) => setForm((f) => ({ ...f, instance_name: e.target.value }))} />
            </div>
            <Button size="sm" onClick={handleSave} disabled={updateConfig.isPending}>
              <Save className="h-4 w-4 mr-1" /> Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

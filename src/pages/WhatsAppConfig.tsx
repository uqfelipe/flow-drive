import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Wifi, WifiOff, QrCode, Save } from "lucide-react";

export default function WhatsAppConfig() {
  return (
    <AdminLayout title="WhatsApp" subtitle="Configuração da instância WhatsApi">
      <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Status da Conexão
                </CardTitle>
                <CardDescription className="text-xs mt-1">Gerencie sua conexão com o WhatsApp</CardDescription>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px] flex items-center gap-1">
                <Wifi className="h-3 w-3" /> Conectado
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
                <Button size="sm" variant="outline" className="mt-2">
                  <QrCode className="h-3 w-3 mr-1" /> Gerar novo QR Code
                </Button>
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
              <Input placeholder="https://api.whatsapi.com.br" className="bg-muted/50" defaultValue="https://api.whatsapi.com.br" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Token da API</Label>
              <Input type="password" placeholder="Seu token da API" className="bg-muted/50" defaultValue="••••••••••••" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">URL do Webhook</Label>
              <Input placeholder="URL para receber mensagens" className="bg-muted/50" defaultValue="https://seusite.com/api/webhook" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nome da Instância</Label>
              <Input placeholder="Ex: Locadora Principal" className="bg-muted/50" defaultValue="Locadora Principal" />
            </div>
            <Button size="sm">
              <Save className="h-4 w-4 mr-1" /> Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

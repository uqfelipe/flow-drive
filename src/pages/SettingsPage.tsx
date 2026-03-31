import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Shield, Bell } from "lucide-react";

export default function SettingsPage() {
  return (
    <AdminLayout title="Configurações" subtitle="Preferências do sistema">
      <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Dados da Locadora
            </CardTitle>
            <CardDescription className="text-xs">Informações da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome da Locadora</Label>
              <Input className="bg-muted/50" defaultValue="LocaVeículos" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">CNPJ</Label>
              <Input className="bg-muted/50" defaultValue="12.345.678/0001-90" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Telefone</Label>
              <Input className="bg-muted/50" defaultValue="(11) 3000-0000" />
            </div>
            <Button size="sm"><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notificações
            </CardTitle>
            <CardDescription className="text-xs">Configure alertas automáticos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Lembrete de pagamento</p>
                <p className="text-[11px] text-muted-foreground">Enviar lembrete 3 dias antes do vencimento</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Alerta de atraso</p>
                <p className="text-[11px] text-muted-foreground">Notificar quando pagamento estiver vencido</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Lembrete de devolução</p>
                <p className="text-[11px] text-muted-foreground">Avisar 1 dia antes da devolução</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Nova reserva via WhatsApp</p>
                <p className="text-[11px] text-muted-foreground">Notificar quando cliente fizer reserva pelo bot</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

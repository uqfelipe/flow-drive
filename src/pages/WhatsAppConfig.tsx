import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Smartphone, Wifi, WifiOff, QrCode, RefreshCw, Trash2,
  AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";
import { useWhatsApp } from "@/hooks/use-whatsapp";

export default function WhatsAppConfig() {
  const {
    instance, qrCode, loading, error,
    loadInstance, fetchQrCode, reconnect, deleteInstance,
  } = useWhatsApp();

  if (loading && !instance) {
    return (
      <AdminLayout title="WhatsApp" subtitle="Configuração da instância WhatsApi">
        <div className="p-6 max-w-2xl space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  const isConnected = instance?.is_connected === true;

  return (
    <AdminLayout title="WhatsApp" subtitle="Configuração da instância WhatsApi">
      <div className="p-6 space-y-6 animate-fade-in max-w-2xl">

        {/* Error state */}
        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Erro</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
              <Button size="sm" variant="outline" onClick={loadInstance}>
                <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Connection status card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" /> Status da Conexão
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Gerencie sua conexão com o WhatsApp
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={
                  isConnected
                    ? "bg-success/10 text-success border-success/20 text-[10px] flex items-center gap-1"
                    : "bg-destructive/10 text-destructive border-destructive/20 text-[10px] flex items-center gap-1"
                }
              >
                {isConnected ? (
                  <><Wifi className="h-3 w-3" /> Conectado</>
                ) : (
                  <><WifiOff className="h-3 w-3" /> Desconectado</>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isConnected ? (
              /* Connected state */
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">WhatsApp Conectado!</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Instância: {instance?.instance_name}
                    </p>
                    {instance?.last_connection_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Última conexão: {new Date(instance.last_connection_at).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={reconnect} disabled={loading}>
                    {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    Reconectar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={deleteInstance} disabled={loading}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remover Instância
                  </Button>
                </div>
              </div>
            ) : (
              /* QR Code / Disconnected state */
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-48 w-48 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {qrCode ? (
                    <img
                      src={qrCode}
                      alt="QR Code para conexão WhatsApp"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <QrCode className="h-10 w-10 text-muted-foreground/30" />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {qrCode ? "Escaneie o QR Code" : "QR Code para conexão"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {qrCode
                      ? "Abra o WhatsApp no celular → Menu → Aparelhos conectados → Conectar aparelho → Escaneie o código"
                      : "Clique para gerar o QR Code e conectar sua instância"}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={fetchQrCode} disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <QrCode className="h-3 w-3 mr-1" />
                      )}
                      {qrCode ? "Atualizar QR" : "Gerar QR Code"}
                    </Button>
                    {instance && (
                      <Button size="sm" variant="destructive" onClick={deleteInstance} disabled={loading}>
                        <Trash2 className="h-3 w-3 mr-1" /> Remover
                      </Button>
                    )}
                  </div>
                  {qrCode && (
                    <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Verificando conexão automaticamente...
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instance info card */}
        {instance && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-display">Informações da Instância</CardTitle>
              <CardDescription className="text-xs">Dados técnicos da instância WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Nome</p>
                  <p className="font-medium text-foreground">{instance.instance_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Dispositivo</p>
                  <p className="font-medium text-foreground">{instance.device_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium text-foreground capitalize">{instance.status}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium text-foreground">
                    {new Date(instance.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

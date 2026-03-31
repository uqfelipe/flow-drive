import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WhatsAppInstance {
  id: string;
  user_id: string;
  instance_name: string;
  device_name: string;
  server_url: string;
  webhook_url: string | null;
  status: string;
  is_connected: boolean;
  last_connection_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseWhatsAppReturn {
  instance: WhatsAppInstance | null;
  qrCode: string;
  loading: boolean;
  error: string | null;
  loadInstance: () => Promise<void>;
  fetchQrCode: () => Promise<void>;
  reconnect: () => Promise<void>;
  deleteInstance: () => Promise<void>;
}

export function useWhatsApp(): UseWhatsAppReturn {
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(false);

  const callManage = useCallback(async (action: string) => {
    const { data, error: fnError } = await supabase.functions.invoke("whatsapp-manage", {
      body: { action },
    });
    if (fnError) throw new Error(fnError.message || "Erro na função");
    return data;
  }, []);

  const loadInstance = useCallback(async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const data = await callManage("get-or-create");
      setInstance(data.instance);

      if (data.is_new) {
        toast.success("Instância WhatsApp criada!");
      }

      // Auto-fetch QR if not connected
      if (!data.instance.is_connected) {
        try {
          const qrData = await callManage("qrcode");
          if (qrData.connected) {
            setInstance((prev) => prev ? { ...prev, is_connected: true, status: "connected" } : prev);
            toast.success("WhatsApp conectado!");
          } else if (qrData.qrcode) {
            setQrCode(qrData.qrcode);
          }
        } catch (e: any) {
          console.error("QR fetch error:", e);
        }
      }
    } catch (e: any) {
      console.error("loadInstance error:", e);
      setError(e.message || "Erro ao carregar instância");
    } finally {
      setLoading(false);
      lockRef.current = false;
    }
  }, [callManage]);

  const fetchQrCode = useCallback(async () => {
    setError(null);
    try {
      const data = await callManage("qrcode");
      if (data.connected) {
        setInstance((prev) => prev ? { ...prev, is_connected: true, status: "connected" } : prev);
        setQrCode("");
        toast.success("WhatsApp conectado!");
      } else if (data.qrcode) {
        setQrCode(data.qrcode);
      }
    } catch (e: any) {
      setError(e.message || "Erro ao buscar QR Code");
    }
  }, [callManage]);

  const reconnect = useCallback(async () => {
    setLoading(true);
    setError(null);
    setQrCode("");
    try {
      await callManage("disconnect");
      const data = await callManage("get-or-create");
      setInstance(data.instance);
      const qrData = await callManage("qrcode");
      if (qrData.connected) {
        setInstance((prev) => prev ? { ...prev, is_connected: true, status: "connected" } : prev);
        toast.success("WhatsApp reconectado!");
      } else if (qrData.qrcode) {
        setQrCode(qrData.qrcode);
      }
    } catch (e: any) {
      setError(e.message || "Erro ao reconectar");
    } finally {
      setLoading(false);
    }
  }, [callManage]);

  const deleteInstance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await callManage("delete");
      setInstance(null);
      setQrCode("");
      toast.success("Instância removida!");
    } catch (e: any) {
      setError(e.message || "Erro ao remover instância");
    } finally {
      setLoading(false);
    }
  }, [callManage]);

  // Polling every 15s when not connected
  useEffect(() => {
    if (!instance || instance.is_connected) return;

    const interval = setInterval(async () => {
      try {
        const data = await callManage("get-or-create");
        if (data?.instance?.is_connected) {
          setInstance(data.instance);
          setQrCode("");
          toast.success("WhatsApp conectado!");
        }
      } catch {
        // silent
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [instance, callManage]);

  // Initial load
  useEffect(() => {
    loadInstance();
  }, [loadInstance]);

  return { instance, qrCode, loading, error, loadInstance, fetchQrCode, reconnect, deleteInstance };
}

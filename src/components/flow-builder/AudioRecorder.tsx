import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AudioRecorderProps {
  onAudioReady: (url: string) => void;
}

export function AudioRecorder({ onAudioReady }: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "recorded">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioUrl = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
        audioUrl.current = URL.createObjectURL(blob);
        setState("recorded");
      };

      mediaRecorder.current = recorder;
      recorder.start();
      setElapsed(0);
      setState("recording");
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorder.current?.stop();
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !audioUrl.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.src = audioUrl.current;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const discard = useCallback(() => {
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    setElapsed(0);
    setIsPlaying(false);
    setState("idle");
  }, []);

  const uploadAndUse = useCallback(async () => {
    if (!chunks.current.length) return;
    setUploading(true);
    try {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      const fileName = `recording_${Date.now()}.webm`;
      const { error } = await supabase.storage
        .from("audio-files")
        .upload(fileName, blob, { contentType: "audio/webm" });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("audio-files")
        .getPublicUrl(fileName);

      onAudioReady(urlData.publicUrl);
      toast.success("Áudio salvo com sucesso");
      discard();
    } catch {
      toast.error("Erro ao fazer upload do áudio");
    } finally {
      setUploading(false);
    }
  }, [onAudioReady, discard]);

  return (
    <div className="space-y-3">
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {state === "idle" && (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 h-12 border-dashed"
          onClick={startRecording}
        >
          <Mic className="h-4 w-4 text-red-500" />
          Iniciar gravação
        </Button>
      )}

      {state === "recording" && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-mono font-medium text-red-400 flex-1">
            {formatTime(elapsed)}
          </span>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={stopRecording}
          >
            <Square className="h-3 w-3" />
            Parar
          </Button>
        </div>
      )}

      {state === "recorded" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <span className="text-sm text-muted-foreground font-mono">
              {formatTime(elapsed)}
            </span>
            <div className="flex-1" />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={discard}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            className="w-full gap-2"
            onClick={uploadAndUse}
            disabled={uploading}
          >
            <Check className="h-4 w-4" />
            {uploading ? "Enviando..." : "Usar este áudio"}
          </Button>
        </div>
      )}
    </div>
  );
}

import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { useCustomers } from "@/hooks/use-customers";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Search, Send, MessageSquare, ArrowLeft, CalendarIcon, Image, FileText, ChevronDown,
  Smile, Check, CheckCheck, Mic, Paperclip, MoreVertical, Video, X,
  MapPin, User, Download, Play, Pause, File, ExternalLink, Loader2, Trash2, Square
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useWhatsAppChats, useChatMessages, useSendMessage, useSendImage, useSendMedia, usePresence, useRealtimeMessages, useMarkAsRead, useDeleteMessage, type WhatsAppChat, type WhatsAppMessage } from "@/hooks/use-chat";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function chatName(chat: WhatsAppChat, customerMap?: Record<string, string>) {
  const phone = chat.wa_chatid?.replace(/@.*$/, "") ?? "";
  if (customerMap && phone && customerMap[phone]) return customerMap[phone];
  return chat.wa_contactName || chat.wa_name || chat.name || phone || "—";
}

function chatPreview(msg: any): string {
  if (!msg) return "";
  if (typeof msg === "string") return msg;
  if (typeof msg !== "object") return String(msg);
  const text = msg.text ?? msg.caption ?? msg.body ?? msg.conversation ?? "";
  if (text) return text;
  if (msg.mimetype?.startsWith("image") || msg.imageMessage) return "📷 Imagem";
  if (msg.mimetype?.startsWith("video") || msg.videoMessage) return "🎥 Vídeo";
  if (msg.mimetype?.startsWith("audio") || msg.audioMessage) return "🎵 Áudio";
  if (msg.documentMessage || msg.fileName) return `📄 ${msg.fileName || "Documento"}`;
  if (msg.stickerMessage) return "🏷️ Sticker";
  if (msg.contactMessage) return "👤 Contato";
  if (msg.locationMessage) return "📍 Localização";
  const str = JSON.stringify(msg);
  if (str.length > 2 && str.length < 100) return str;
  return "[mídia]";
}

function phoneFromChatId(chatid: string) {
  return chatid?.replace("@s.whatsapp.net", "") ?? "";
}

function smartTimestamp(ts: number): Date {
  if (ts > 9999999999) return new Date(ts);
  return new Date(ts * 1000);
}

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = smartTimestamp(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Ontem";
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatMsgTime(ts?: number) {
  if (!ts) return "";
  const d = smartTimestamp(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface ExtractedContent {
  text: string;
  type: "text" | "image" | "video" | "audio" | "ptt" | "document" | "sticker" | "location" | "contact" | "other";
  fileUrl?: string;
  fileName?: string;
  mimetype?: string;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
  thumbnail?: string;
}

function extractContent(msg: WhatsAppMessage): ExtractedContent {
  const content = msg.content;
  const fileUrl = msg.fileURL || "";
  const topText = msg.text || "";
  const msgType = (msg.type ?? "").toLowerCase();
  const topFileName = msg.fileName || "";
  const topMimetype = msg.mimetype || "";

  // Parse content object
  let c: any = null;
  if (typeof content === "object" && content !== null) {
    c = content;
  }

  const resolveFileUrl = () => fileUrl || c?.url || c?.URL || c?.fileURL || c?.fileUrl || "";
  const resolveText = () => c?.caption || c?.text || topText || "";
  const resolveFileName = () => topFileName || c?.fileName || c?.title || "";
  const resolveMimetype = () => topMimetype || c?.mimetype || "";

  // Base64 thumbnail helper
  const resolveThumbnail = () => {
    if (c?.JPEGThumbnail) return `data:image/jpeg;base64,${c.JPEGThumbnail}`;
    return "";
  };

  // Base64 video detection (data:video/* in content string or object fields)
  if (typeof content === "string" && content.startsWith("data:video/")) {
    return { text: "", type: "video", fileUrl: content, mimetype: "" };
  }
  if (c?.data?.startsWith?.("data:video/")) {
    return { text: resolveText(), type: "video", fileUrl: c.data, mimetype: resolveMimetype() };
  }
  if (c?.base64?.startsWith?.("data:video/")) {
    return { text: resolveText(), type: "video", fileUrl: c.base64, mimetype: resolveMimetype() };
  }

  // Image
  if (msgType.includes("image") || c?.mimetype?.startsWith("image")) {
    return { text: resolveText(), type: "image", fileUrl: resolveFileUrl(), mimetype: resolveMimetype(), thumbnail: resolveThumbnail() };
  }

  // Video
  if (msgType.includes("video") || c?.mimetype?.startsWith("video")) {
    return { text: resolveText(), type: "video", fileUrl: resolveFileUrl(), mimetype: resolveMimetype(), thumbnail: resolveThumbnail() };
  }

  // Audio / PTT (voice note)
  if (msgType === "ptt" || msgType === "myaudio" || msgType.includes("audio") || c?.mimetype?.startsWith("audio")) {
    const isPtt = msgType === "ptt" || msgType === "myaudio" || c?.PTT === true;
    const aType = isPtt ? "ptt" as const : "audio" as const;
    return { text: resolveText(), type: aType, fileUrl: resolveFileUrl(), mimetype: resolveMimetype() };
  }

  // Document
  if (msgType.includes("document") || c?.mimetype?.includes("pdf") || c?.mimetype?.includes("document") || c?.fileName) {
    return { text: resolveText(), type: "document", fileUrl: resolveFileUrl(), fileName: resolveFileName(), mimetype: resolveMimetype() };
  }

  // Sticker
  if (msgType.includes("sticker")) {
    return { text: "", type: "sticker", fileUrl: resolveFileUrl() };
  }

  // Location
  if (msgType.includes("location") || c?.degreesLatitude || c?.latitude) {
    const lat = c?.degreesLatitude || c?.latitude || 0;
    const lng = c?.degreesLongitude || c?.longitude || 0;
    return { text: c?.name || c?.address || resolveText(), type: "location", latitude: lat, longitude: lng };
  }

  // Contact (vCard)
  if (msgType.includes("contact") || c?.vcard || c?.displayName) {
    return { text: "", type: "contact", contactName: c?.displayName || c?.name || "", contactPhone: c?.vcard || "" };
  }

  // If content has caption + fileUrl → likely media
  if (c?.caption && resolveFileUrl()) {
    return { text: c.caption, type: "image", fileUrl: resolveFileUrl() };
  }

  // Text from content object
  if (c?.text) return { text: c.text, type: "text" };
  if (c?.conversation) return { text: c.conversation, type: "text" };

  // Fallback to top-level text
  const displayText = (typeof content === "string" ? content : "") || topText || "";
  if (displayText) return { text: displayText, type: "text" };

  return { text: "[mídia]", type: "other" };
}

function formatPhone(phone: string) {
  if (phone.length === 13 && phone.startsWith("55")) {
    const ddd = phone.slice(2, 4);
    const num = phone.slice(4);
    if (num.length === 9) return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
  }
  return phone;
}

function shouldShowDateSeparator(msgs: WhatsAppMessage[], idx: number) {
  if (idx === 0) return true;
  const curr = smartTimestamp(msgs[idx].timestamp).toDateString();
  const prev = smartTimestamp(msgs[idx - 1].timestamp).toDateString();
  return curr !== prev;
}

function formatDateSeparator(ts: number) {
  const d = smartTimestamp(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Hoje";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Media Bubble Components ───

function MediaImage({ url, caption, fromMe, onClickImage, thumbnail, messageId }: { url: string; caption?: string; fromMe: boolean; onClickImage: (url: string) => void; thumbnail?: string; messageId?: string }) {
  const [displayUrl, setDisplayUrl] = useState(() => {
    if (messageId && mediaUrlCache.has(messageId)) return mediaUrlCache.get(messageId)!;
    // If URL is encrypted (.enc), use thumbnail; otherwise use URL directly
    if (url && url.includes(".enc")) return thumbnail || "";
    return url || thumbnail || "";
  });
  const [isDownloading, setIsDownloading] = useState(false);

  const isEncrypted = url && url.includes(".enc") && !mediaUrlCache.has(messageId || "");

  const handleClick = async () => {
    // If we already have a good URL, open lightbox
    if (!isEncrypted || mediaUrlCache.has(messageId || "")) {
      onClickImage(displayUrl);
      return;
    }
    // Download decrypted version
    if (!messageId) return;
    setIsDownloading(true);
    try {
      const { data } = await supabase.functions.invoke("whatsapp-chat", {
        body: { action: "download-media", phone: messageId },
      });
      if (data?.fileURL) {
        mediaUrlCache.set(messageId, data.fileURL);
        setDisplayUrl(data.fileURL);
        onClickImage(data.fileURL);
      }
    } catch (e) {
      console.error("Failed to download image:", e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-1 relative">
      {displayUrl ? (
        <img
          src={displayUrl}
          alt="Imagem"
          loading="lazy"
          onClick={handleClick}
          className={cn(
            "rounded-xl max-w-[280px] w-full h-auto cursor-pointer hover:opacity-90 transition-opacity",
            isEncrypted && "blur-[1px]"
          )}
        />
      ) : (
        <div
          onClick={handleClick}
          className="rounded-xl max-w-[280px] w-full h-[150px] bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <Image className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      {isDownloading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      )}
      {caption && <p className="whitespace-pre-wrap text-[13px]">{caption}</p>}
    </div>
  );
}

function MediaVideo({ url, caption, fromMe, thumbnail, messageId }: { url: string; caption?: string; fromMe: boolean; thumbnail?: string; messageId?: string }) {
  const [playableUrl, setPlayableUrl] = useState<string>(() => {
    if (url && url.startsWith("data:video/")) return url;
    if (messageId && mediaUrlCache.has(messageId)) return mediaUrlCache.get(messageId)!;
    if (url && !url.includes(".enc")) return url;
    return "";
  });
  const [isDownloading, setIsDownloading] = useState(false);

  const isEncrypted = url && url.includes(".enc") && !playableUrl;

  const handlePlay = async () => {
    if (playableUrl || !messageId) return;
    setIsDownloading(true);
    try {
      const { data } = await supabase.functions.invoke("whatsapp-chat", {
        body: { action: "download-media", phone: messageId },
      });
      if (data?.fileURL) {
        mediaUrlCache.set(messageId, data.fileURL);
        setPlayableUrl(data.fileURL);
      }
    } catch (e) {
      console.error("Failed to download video:", e);
    } finally {
      setIsDownloading(false);
    }
  };

  // Video already playable
  if (playableUrl) {
    return (
      <div className="space-y-1.5">
        <div className="rounded-2xl overflow-hidden bg-black/80 shadow-lg max-w-[320px] w-full">
          <video
            src={playableUrl}
            controls
            controlsList="nodownload"
            preload="metadata"
            className="w-full h-auto"
          />
        </div>
        {caption && <p className="whitespace-pre-wrap text-[13px] mt-1">{caption}</p>}
      </div>
    );
  }

  // Encrypted / needs download — show thumbnail with play button
  return (
    <div className="space-y-1.5">
      <div
        onClick={handlePlay}
        className="relative rounded-2xl max-w-[320px] w-full cursor-pointer group overflow-hidden shadow-lg"
      >
        {thumbnail ? (
          <img src={thumbnail} alt="Vídeo" className="w-full h-auto object-cover" />
        ) : (
          <div className="w-full h-[180px] bg-black/60 flex items-center justify-center">
            <Video className="h-12 w-12 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/50 via-black/20 to-transparent group-hover:from-black/60 group-hover:via-black/30 transition-all duration-300">
          {isDownloading ? (
            <Loader2 className="h-11 w-11 animate-spin text-white drop-shadow-lg" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-white/95 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-200">
              <Play className="h-8 w-8 fill-black text-black ml-0.5" />
            </div>
          )}
        </div>
      </div>
      {caption && <p className="whitespace-pre-wrap text-[13px] mt-1">{caption}</p>}
    </div>
  );
}

// Cache for downloaded media URLs
const mediaUrlCache = new Map<string, string>();

function MediaAudio({ url, isPtt, fromMe, messageId, durationHint }: { url: string; isPtt: boolean; fromMe: boolean; messageId?: string; durationHint?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationHint || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playableUrl, setPlayableUrl] = useState<string>(() => {
    if (messageId && mediaUrlCache.has(messageId)) return mediaUrlCache.get(messageId)!;
    // Only use url if it's not an encrypted WhatsApp CDN URL
    if (url && !url.includes(".enc?") && !url.includes("mmg.whatsapp.net")) return url;
    return "";
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [userRequestedPlay, setUserRequestedPlay] = useState(false);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const downloadMedia = async () => {
    if (!messageId || isDownloading) return;
    setIsDownloading(true);
    setDownloadError(false);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-chat", {
        body: { action: "download-media", phone: messageId },
      });
      if (error) throw error;
      const downloadedUrl = data?.fileURL || "";
      if (downloadedUrl) {
        mediaUrlCache.set(messageId, downloadedUrl);
        setPlayableUrl(downloadedUrl);
      } else {
        setDownloadError(true);
      }
    } catch (e) {
      console.error("Failed to download media:", e);
      setDownloadError(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const togglePlay = async () => {
    if (!playableUrl) {
      setUserRequestedPlay(true);
      await downloadMedia();
      return;
    }
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) { a.pause(); } else { a.play(); }
  };

  // Auto-play only after user-initiated download
  useEffect(() => {
    if (playableUrl && audioRef.current && userRequestedPlay && !isDownloading) {
      const timer = setTimeout(() => {
        audioRef.current?.play().catch(() => {});
        setUserRequestedPlay(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playableUrl, userRequestedPlay, isDownloading]);

  // Waveform bars pattern
  const bars = [3, 6, 4, 8, 5, 9, 3, 7, 4, 6, 8, 3, 5, 7, 4, 9, 6, 3, 7, 5, 8, 4, 6, 3, 7, 5, 9, 4];
  const progress = duration > 0 ? currentTime / duration : 0;
  const activeIndex = Math.floor(progress * bars.length);

  return (
    <div className={cn(
      "flex items-center gap-2 min-w-[250px] max-w-[320px] py-1",
    )}>
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={isDownloading}
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
          fromMe
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
            : "bg-primary/15 hover:bg-primary/25 text-primary",
          isDownloading && "opacity-50 cursor-wait"
        )}
      >
        {isDownloading ? (
          <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-5 w-5 fill-current" />
        ) : (
          <Play className="h-5 w-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform + duration */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-end gap-[2px] h-[28px]">
          {bars.map((h, i) => (
            <div
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-colors",
                i <= activeIndex
                  ? fromMe ? "bg-primary-foreground/90" : "bg-primary"
                  : fromMe ? "bg-primary-foreground/30" : "bg-muted-foreground/30"
              )}
              style={{ height: `${h * 3}px` }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-[11px]",
            fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {downloadError ? "Erro" : isPlaying || currentTime > 0 ? fmtTime(currentTime) : fmtTime(duration)}
          </span>
          <div className="flex items-center gap-1">
            {playableUrl && (
              <button
                onClick={() => {
                  const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
                  setPlaybackRate(next);
                  if (audioRef.current) audioRef.current.playbackRate = next;
                }}
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors",
                  playbackRate !== 1
                    ? fromMe ? "bg-primary-foreground/30 text-primary-foreground" : "bg-primary/20 text-primary"
                    : fromMe ? "bg-primary-foreground/10 text-primary-foreground/50" : "bg-muted-foreground/10 text-muted-foreground/50"
                )}
              >
                {playbackRate}x
              </button>
            )}
            {isPtt && (
              <Mic className={cn(
                "h-3.5 w-3.5",
                fromMe ? "text-primary-foreground/70" : "text-primary"
              )} />
            )}
          </div>
        </div>
      </div>

      {/* Hidden audio element */}
      {playableUrl && (
        <audio
          ref={audioRef}
          src={playableUrl}
          preload="metadata"
          onLoadedMetadata={() => {
            if (audioRef.current && audioRef.current.duration && isFinite(audioRef.current.duration)) {
              setDuration(audioRef.current.duration);
            }
          }}
          onTimeUpdate={() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        />
      )}
    </div>
  );
}

function MediaDocument({ url, fileName, fromMe }: { url: string; fileName?: string; fromMe: boolean }) {
  const displayName = fileName || "Documento";
  const ext = displayName.split(".").pop()?.toUpperCase() || "DOC";
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-colors min-w-[220px]",
        fromMe
          ? "border-primary-foreground/20 hover:bg-primary-foreground/10"
          : "border-border/50 bg-muted/30 hover:bg-muted/60"
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
        fromMe ? "bg-primary-foreground/20" : "bg-primary/15"
      )}>
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium truncate">{displayName}</p>
        <p className={cn("text-[10px]", fromMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {ext}
        </p>
      </div>
      <Download className="h-4 w-4 shrink-0 opacity-60" />
    </a>
  );
}

function MediaSticker({ url }: { url: string }) {
  return (
    <img
      src={url}
      alt="Sticker"
      loading="lazy"
      className="max-w-[150px] max-h-[150px] object-contain"
    />
  );
}

function MediaLocation({ latitude, longitude, name, fromMe }: { latitude: number; longitude: number; name?: string; fromMe: boolean }) {
  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=280x150&markers=${latitude},${longitude}`;
  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-colors min-w-[200px]",
        fromMe
          ? "border-primary-foreground/20 hover:bg-primary-foreground/10"
          : "border-border/50 bg-muted/30 hover:bg-muted/60"
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
        fromMe ? "bg-primary-foreground/20" : "bg-primary/15"
      )}>
        <MapPin className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium">{name || "📍 Localização"}</p>
        <p className={cn("text-[10px]", fromMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 opacity-60" />
    </a>
  );
}

function MediaContact({ contactName, fromMe }: { contactName?: string; fromMe: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border min-w-[200px]",
      fromMe
        ? "border-primary-foreground/20"
        : "border-border/50 bg-muted/30"
    )}>
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
        fromMe ? "bg-primary-foreground/20" : "bg-primary/15"
      )}>
        <User className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium">{contactName || "Contato"}</p>
        <p className={cn("text-[10px]", fromMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
          👤 Cartão de contato
        </p>
      </div>
    </div>
  );
}

// WhatsApp-style chat background SVG pattern
const chatBgPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

export default function Conversations() {
  const { data: customers } = useCustomers();
  const customerMap = useMemo(() => {
    const map: Record<string, string> = {};
    (customers ?? []).forEach((c) => {
      const digits = c.phone.replace(/\D/g, "");
      if (digits) map[digits] = c.name;
    });
    return map;
  }, [customers]);

  const [search, setSearch] = useState("");
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [text, setText] = useState("");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [lightboxLoading, setLightboxLoading] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaType, setMediaType] = useState<string>("image");
  const [mediaDocName, setMediaDocName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const lastHandledIncomingRef = useRef<string | null>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioPreview, setAudioPreview] = useState<{ url: string; base64: string } | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    // Discard any previous preview
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview.url);
      setAudioPreview(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      // Permission denied or no mic
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  };

  const stopRecordingForPreview = () => {
    if (!mediaRecorderRef.current) return;
    const recorder = mediaRecorderRef.current;
    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
      recorder.stream.getTracks().forEach((t) => t.stop());
      const objectUrl = URL.createObjectURL(blob);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAudioPreview({ url: objectUrl, base64: reader.result as string });
      };
      reader.readAsDataURL(blob);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
    };
    recorder.stop();
  };

  const discardPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (audioPreview) URL.revokeObjectURL(audioPreview.url);
    setAudioPreview(null);
    setIsPlayingPreview(false);
    setRecordingTime(0);
  };

  const togglePreviewPlayback = () => {
    if (!audioPreview) return;
    if (isPlayingPreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }
    const audio = new Audio(audioPreview.url);
    audio.onended = () => setIsPlayingPreview(false);
    audio.play();
    previewAudioRef.current = audio;
    setIsPlayingPreview(true);
  };

  const sendRecordedAudio = () => {
    if (!audioPreview || !selectedPhone) return;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    sendMediaMutation.mutate({
      phone: selectedPhone,
      type: "audio",
      fileUrl: audioPreview.base64,
      text: "",
    });
    URL.revokeObjectURL(audioPreview.url);
    setAudioPreview(null);
    setIsPlayingPreview(false);
    setRecordingTime(0);
  };

  const openLightbox = async (phone: string, fallbackImg?: string) => {
    setLightboxImg(fallbackImg || null);
    setLightboxLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-chat", {
        body: { action: "get-profile-pic", phone },
      });
      if (!error && data?.image) {
        setLightboxImg(data.image);
      }
    } catch {} finally {
      setLightboxLoading(false);
    }
  };

  const openImgLightbox = (url: string) => {
    setLightboxImg(url);
    setLightboxLoading(false);
  };

  const { data: chats, isLoading: chatsLoading } = useWhatsAppChats();
  const selectedPhone = selectedChat ? phoneFromChatId(selectedChat.wa_chatid) : null;
  useRealtimeMessages(selectedPhone);
  const { data: messages, isLoading: msgsLoading } = useChatMessages(selectedPhone);
  const { data: presence } = usePresence(selectedPhone);
  const sendMutation = useSendMessage();
  const sendImageMutation = useSendImage();
  const sendMediaMutation = useSendMedia();
  const markAsRead = useMarkAsRead();
  const deleteMessageMutation = useDeleteMessage();
  const lastMessageId = messages?.[messages.length - 1]?.id;

  useEffect(() => {
    if (!selectedPhone) {
      lastHandledIncomingRef.current = null;
      return;
    }

    const key = messages?.length
      ? `${selectedPhone}:${messages[messages.length - 1].id}`
      : `${selectedPhone}:empty`;

    if (lastHandledIncomingRef.current === key) return;
    lastHandledIncomingRef.current = key;
    markAsRead.mutate(selectedPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhone, messages]);

  const filtered = (chats ?? [])
    .filter((c) => {
      const q = search.toLowerCase();
      const name = chatName(c, customerMap).toLowerCase();
      const phone = phoneFromChatId(c.wa_chatid);
      return name.includes(q) || phone.includes(search);
    })
    .sort((a, b) => {
      const aUnread = (a.wa_unreadCount ?? 0) > 0 ? 1 : 0;
      const bUnread = (b.wa_unreadCount ?? 0) > 0 ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      return (b.wa_lastMsgTimestamp ?? 0) - (a.wa_lastMsgTimestamp ?? 0);
    });

  useEffect(() => {
    if (!selectedPhone) return;
    const frame = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedPhone, lastMessageId]);

  const handleSend = () => {
    if (!text.trim() || !selectedPhone) return;
    sendMutation.mutate({ phone: selectedPhone, text: text.trim() });
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };

  const handleSendMedia = () => {
    if (!selectedPhone || !mediaUrl.trim()) return;
    sendMediaMutation.mutate(
      {
        phone: selectedPhone,
        type: mediaType,
        fileUrl: mediaUrl.trim(),
        text: mediaCaption.trim() || undefined,
        docName: mediaDocName.trim() || undefined,
      },
      {
        onSuccess: () => {
          setMediaDialogOpen(false);
          setMediaUrl("");
          setMediaCaption("");
          setMediaDocName("");
          setMediaType("image");
        },
      }
    );
  };

  // ─── Render a message bubble's media content ───
  const renderMediaContent = (msg: WhatsAppMessage, extracted: ExtractedContent) => {
    const { type, text: msgText, fileUrl, fileName, latitude, longitude, contactName, thumbnail } = extracted;

    switch (type) {
      case "image": {
        const rawMsgId = msg.id?.includes(":") ? msg.id.split(":").pop() : msg.id;
        if (fileUrl || thumbnail) {
          return <MediaImage url={fileUrl || ""} caption={msgText} fromMe={msg.fromMe} onClickImage={openImgLightbox} thumbnail={thumbnail} messageId={rawMsgId} />;
        }
        return (
          <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", msg.fromMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
            <Image className="h-3 w-3" /> {msgText || "📷 Imagem"}
          </div>
        );
      }

      case "video":
        if (fileUrl) {
          return <MediaVideo url={fileUrl} caption={msgText} fromMe={msg.fromMe} thumbnail={extracted.thumbnail} messageId={msg.id?.split?.("_")?.pop?.()} />;
        }
        return (
          <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", msg.fromMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
            <Video className="h-3 w-3" /> {msgText || "🎥 Vídeo"}
          </div>
        );

      case "audio":
      case "ptt": {
        // Extract duration hint from content.seconds
        const c = typeof msg.content === "object" && msg.content !== null ? msg.content as any : null;
        const durationHint = c?.seconds || 0;
        // Extract the raw message ID (without owner prefix)
        const rawMsgId = msg.id?.includes(":") ? msg.id.split(":").pop() : msg.id;
        return <MediaAudio url={fileUrl || ""} isPtt={type === "ptt"} fromMe={msg.fromMe} messageId={rawMsgId} durationHint={durationHint} />;
      }

      case "document":
        if (fileUrl) {
          return (
            <div className="space-y-1">
              <MediaDocument url={fileUrl} fileName={fileName} fromMe={msg.fromMe} />
              {msgText && <p className="whitespace-pre-wrap text-[13px]">{msgText}</p>}
            </div>
          );
        }
        return (
          <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", msg.fromMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
            <FileText className="h-3 w-3" /> {fileName || msgText || "📄 Documento"}
          </div>
        );

      case "sticker":
        if (fileUrl) {
          return <MediaSticker url={fileUrl} />;
        }
        return <span className="text-2xl">🏷️</span>;

      case "location":
        if (latitude && longitude) {
          return <MediaLocation latitude={latitude} longitude={longitude} name={msgText} fromMe={msg.fromMe} />;
        }
        return (
          <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", msg.fromMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
            <MapPin className="h-3 w-3" /> {msgText || "📍 Localização"}
          </div>
        );

      case "contact":
        return <MediaContact contactName={contactName || msgText} fromMe={msg.fromMe} />;

      case "text":
        return msgText ? <p className="whitespace-pre-wrap">{msgText}</p> : null;

      default:
        return msgText ? <p className="whitespace-pre-wrap">{msgText}</p> : <span className="text-[11px] opacity-60">[mídia]</span>;
    }
  };

  return (
    <>
    <AdminLayout title="Conversas" subtitle="Chat via WhatsApp">
      <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-xl border border-border shadow-lg mx-1 mb-1">
        {/* ─── Left panel ─── */}
        <div className={cn(
          "w-full md:w-[360px] md:min-w-[360px] flex-col bg-card/80 backdrop-blur-sm",
          selectedChat ? "hidden md:flex" : "flex"
        )}>
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-sm font-display font-bold tracking-tight">Conversas</h2>
              {chats && (
                <Badge variant="secondary" className="text-[10px] h-5 ml-auto rounded-full px-2.5 font-semibold">
                  {chats.length}
                </Badge>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                className="pl-9 bg-background/70 backdrop-blur-sm h-9 text-xs rounded-xl border-border/50 focus-visible:ring-primary/30"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Chat list */}
          <ScrollArea className="flex-1">
            {chatsLoading ? (
              <div className="p-2 space-y-0.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                    <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center">
                  <Search className="h-6 w-6 opacity-30" />
                </div>
                <p className="text-xs font-medium">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <div className="p-1.5 space-y-0.5">
                {filtered.map((chat) => {
                  const isActive = selectedChat?.wa_chatid === chat.wa_chatid;
                  const hasUnread = (chat.wa_unreadCount ?? 0) > 0;
                  return (
                    <button
                      key={chat.wa_chatid}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 text-left rounded-xl transition-all duration-200 border-l-[3px]",
                        isActive
                          ? "bg-primary/12 shadow-sm shadow-primary/10 border-primary"
                          : "hover:bg-accent/40 active:scale-[0.99] border-transparent",
                        hasUnread && !isActive && "bg-accent/20"
                      )}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="relative">
                        <Avatar
                          className={cn(
                            "h-12 w-12 shrink-0 transition-all duration-200",
                            isActive && "ring-2 ring-primary/40 ring-offset-2 ring-offset-card",
                            (chat.image || chat.imagePreview || chat.wa_profilePicUrl) && "cursor-pointer hover:opacity-80"
                          )}
                          onClick={(e) => {
                            const src = chat.image || chat.imagePreview || chat.wa_profilePicUrl;
                            if (src) { e.stopPropagation(); openLightbox(phoneFromChatId(chat.wa_chatid), src); }
                          }}
                        >
                          {(chat.image || chat.imagePreview || chat.wa_profilePicUrl) && <AvatarImage src={chat.image || chat.imagePreview || chat.wa_profilePicUrl} />}
                          <AvatarFallback className={cn(
                            "text-xs font-bold transition-colors",
                            isActive
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {getInitials(chatName(chat))}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card",
                          hasUnread ? "bg-success" : "bg-muted-foreground/30"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            "text-[13px] truncate",
                            hasUnread || isActive ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                          )}>
                            {chatName(chat)}
                          </p>
                          <span className={cn(
                            "text-[10px] shrink-0 font-medium",
                            hasUnread ? "text-success" : "text-muted-foreground/70"
                          )}>
                            {formatTime(chat.wa_lastMsgTimestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={cn(
                            "text-[11px] truncate leading-relaxed",
                            hasUnread ? "text-foreground/70 font-medium" : "text-muted-foreground/70"
                          )}>
                            {chatPreview(chat.wa_lastMsg) || formatPhone(phoneFromChatId(chat.wa_chatid))}
                          </p>
                          {hasUnread && !isActive && (
                            <span className="bg-success text-success-foreground text-[10px] font-bold rounded-full h-[18px] min-w-[18px] flex items-center justify-center px-1 shrink-0">
                              {chat.wa_unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Separator */}
        <div className="hidden md:block w-px bg-border/50" />

        {/* ─── Right panel ─── */}
        <div className={cn(
          "flex-1 flex-col bg-background",
          !selectedChat ? "hidden md:flex" : "flex"
        )}>
          {!selectedChat ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-6" style={{ backgroundImage: chatBgPattern }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="relative"
              >
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <MessageSquare className="h-12 w-12 text-primary/40" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                </div>
              </motion.div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-display font-bold text-foreground">WhatsApp Chat</h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Selecione uma conversa ao lado para visualizar mensagens e responder em tempo real
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ─── Chat header ─── */}
              <div className="h-[68px] border-b border-border/50 flex items-center justify-between px-4 bg-card/90 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <button
                    className="md:hidden p-2 hover:bg-accent rounded-xl transition-colors"
                    onClick={() => setSelectedChat(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <Avatar
                    className={cn(
                      "h-10 w-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-card",
                      (selectedChat.image || selectedChat.imagePreview || selectedChat.wa_profilePicUrl) && "cursor-pointer hover:opacity-80"
                    )}
                    onClick={() => {
                      const src = selectedChat.image || selectedChat.imagePreview || selectedChat.wa_profilePicUrl;
                      if (src) openLightbox(phoneFromChatId(selectedChat.wa_chatid), src);
                    }}
                  >
                    {(selectedChat.image || selectedChat.imagePreview || selectedChat.wa_profilePicUrl) && <AvatarImage src={selectedChat.image || selectedChat.imagePreview || selectedChat.wa_profilePicUrl} />}
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                      {getInitials(chatName(selectedChat))}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-display font-bold">{chatName(selectedChat)}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
                      {formatPhone(phoneFromChatId(selectedChat.wa_chatid))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        onSelect={(date) => {
                          if (!date || !messages?.length) return;
                          setCalendarOpen(false);
                          const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000;
                          const endOfDay = startOfDay + 86400;
                          const target = messages.find((m) => m.timestamp >= startOfDay && m.timestamp < endOfDay);
                          if (target) {
                            const el = document.getElementById(`msg-${target.id}`);
                            if (el) {
                              el.scrollIntoView({ behavior: "smooth", block: "center" });
                              el.classList.add("ring-2", "ring-primary/50", "rounded-2xl");
                              setTimeout(() => el.classList.remove("ring-2", "ring-primary/50", "rounded-2xl"), 2000);
                            }
                          }
                        }}
                        className={cn("p-3 pointer-events-auto")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* ─── Messages area ─── */}
              <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 bg-background" style={{ backgroundImage: chatBgPattern }} />

                <ScrollArea className="h-full relative z-10" ref={scrollAreaRef} onScrollCapture={(e) => {
                  const target = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
                  if (!target) return;
                  const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
                  setShowScrollBtn(distanceFromBottom > 120);
                }}>
                  <div className="px-4 md:px-8 lg:px-16 py-4 min-h-full flex flex-col justify-end">
                    {msgsLoading ? (
                      <div className="space-y-4 py-8">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                            <Skeleton className={cn("rounded-2xl", i % 2 === 0 ? "h-12 w-56" : "h-16 w-64")} />
                          </div>
                        ))}
                      </div>
                    ) : (messages ?? []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center rotate-3">
                          <Smile className="h-8 w-8 text-primary/30" />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-sm font-medium">Nenhuma mensagem</p>
                          <p className="text-xs text-muted-foreground/70">Envie a primeira mensagem!</p>
                        </div>
                      </div>
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedChat.wa_chatid}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-0.5"
                        >
                          {(messages ?? []).map((msg, idx) => {
                            const extracted = extractContent(msg);
                            const showDate = shouldShowDateSeparator(messages!, idx);
                            const isSticker = extracted.type === "sticker" && extracted.fileUrl;

                            return (
                              <div key={msg.id} id={`msg-${msg.id}`}>
                                {showDate && (
                                  <div className="flex justify-center my-5">
                                    <span className="bg-card/95 backdrop-blur-md text-muted-foreground/80 text-[10px] uppercase tracking-wider px-4 py-1.5 rounded-full border border-border/30 shadow-sm font-semibold">
                                      {formatDateSeparator(msg.timestamp)}
                                    </span>
                                  </div>
                                )}

                                <div className={cn(
                                  "flex mb-0.5 group/msg",
                                  msg.fromMe ? "justify-end" : "justify-start"
                                )}>
                                  {/* Stickers rendered without bubble */}
                                  {isSticker ? (
                                    <div className="relative max-w-[70%] px-1 py-1">
                                      {renderMediaContent(msg, extracted)}
                                      <div className={cn(
                                        "flex items-center justify-end gap-1 mt-0.5",
                                        "text-muted-foreground/60"
                                      )}>
                                        <span className="text-[10px]">{formatMsgTime(msg.timestamp)}</span>
                                        {msg.fromMe && (
                                          msg.status === "read" || msg.status === "played"
                                            ? <CheckCheck className="h-3 w-3" style={{ color: "hsl(199, 89%, 70%)" }} />
                                            : msg.status === "delivered"
                                              ? <CheckCheck className="h-3 w-3" />
                                              : <Check className="h-3 w-3" />
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="relative flex items-start gap-1">
                                      {/* Delete dropdown - before bubble for fromMe */}
                                      {msg.fromMe && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className="opacity-0 group-hover/msg:opacity-100 transition-opacity mt-2 p-1 rounded-full hover:bg-accent text-muted-foreground">
                                              <ChevronDown className="h-3.5 w-3.5" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="min-w-[160px]">
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive cursor-pointer"
                                              onClick={() => {
                                                if (!selectedPhone) return;
                                                deleteMessageMutation.mutate({
                                                  messageId: msg.id,
                                                  remoteJid: msg.chatid || `${selectedPhone}@s.whatsapp.net`,
                                                  fromMe: msg.fromMe,
                                                  phone: selectedPhone,
                                                });
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Apagar para todos
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}

                                      <div className={cn(
                                        "relative max-w-[70%] px-3 py-2 text-[13px] leading-[1.45] break-words",
                                        msg.fromMe
                                          ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-br-md shadow-md shadow-primary/10"
                                          : "bg-card text-card-foreground border border-border/50 rounded-2xl rounded-bl-md shadow-sm"
                                      )}>

                                        {/* Media content */}
                                        {renderMediaContent(msg, extracted)}

                                        {/* Timestamp & status */}
                                        <div className={cn(
                                          "flex items-center justify-end gap-1 mt-1",
                                          msg.fromMe ? "text-primary-foreground/50" : "text-muted-foreground/60"
                                        )}>
                                          <span className="text-[10px]">{formatMsgTime(msg.timestamp)}</span>
                                          {msg.fromMe && (
                                            msg.status === "read" || msg.status === "played"
                                              ? <CheckCheck className="h-3 w-3" style={{ color: "hsl(199, 89%, 70%)" }} />
                                              : msg.status === "delivered"
                                                ? <CheckCheck className="h-3 w-3" />
                                                : <Check className="h-3 w-3" />
                                          )}
                                        </div>
                                      </div>

                                      {/* Delete dropdown - after bubble for received */}
                                      {!msg.fromMe && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className="opacity-0 group-hover/msg:opacity-100 transition-opacity mt-2 p-1 rounded-full hover:bg-accent text-muted-foreground">
                                              <ChevronDown className="h-3.5 w-3.5" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="start" className="min-w-[160px]">
                                            <DropdownMenuItem
                                              className="text-destructive focus:text-destructive cursor-pointer"
                                              onClick={() => {
                                                if (!selectedPhone) return;
                                                deleteMessageMutation.mutate({
                                                  messageId: msg.id,
                                                  remoteJid: msg.chatid || `${selectedPhone}@s.whatsapp.net`,
                                                  fromMe: msg.fromMe,
                                                  phone: selectedPhone,
                                                });
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Apagar para todos
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {/* Typing indicator */}
                          <AnimatePresence>
                            {presence?.isTyping && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="flex justify-start px-2 py-1"
                              >
                                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                                  <div className="flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div ref={messagesEndRef} />
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </ScrollArea>

                {/* Scroll to bottom button */}
                <AnimatePresence>
                  {showScrollBtn && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                      className="absolute bottom-4 right-6 z-20 h-10 w-10 rounded-full bg-card border border-border/60 shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* ─── Input area ─── */}
              <div className="border-t border-border/50 px-4 md:px-8 lg:px-16 py-3 bg-card/90 backdrop-blur-sm">
                <AnimatePresence mode="wait">
                  {isRecording ? (
                    <motion.div
                      key="recording"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelRecording}
                        className="shrink-0 h-11 w-11 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                      <div className="flex-1 flex items-center gap-3 px-4 h-11 rounded-2xl bg-background/80 border border-border/50">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                        </span>
                        <span className="text-sm font-mono text-foreground">{formatRecordingTime(recordingTime)}</span>
                        <span className="text-xs text-muted-foreground">Gravando...</span>
                      </div>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={stopRecordingForPreview}
                        className="shrink-0 h-11 w-11 rounded-2xl"
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ) : audioPreview ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={discardPreview}
                        className="shrink-0 h-11 w-11 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                      <div className="flex-1 flex items-center gap-3 px-4 h-11 rounded-2xl bg-background/80 border border-border/50">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full shrink-0"
                          onClick={togglePreviewPlayback}
                        >
                          {isPlayingPreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <span className="text-sm text-foreground">{formatRecordingTime(recordingTime)}</span>
                        <span className="text-xs text-muted-foreground">Áudio gravado</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => { discardPreview(); startRecording(); }}
                        >
                          <Mic className="h-3.5 w-3.5 mr-1" />
                          Re-gravar
                        </Button>
                      </div>
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      >
                        <Button
                          size="icon"
                          onClick={sendRecordedAudio}
                          disabled={sendMediaMutation.isPending}
                          className="shrink-0 h-11 w-11 rounded-2xl shadow-md shadow-primary/20 transition-all"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2"
                    >
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl shrink-0 text-muted-foreground hover:text-foreground">
                        <Smile className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setMediaDialogOpen(true)}
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                      <div className="flex-1 relative">
                        <Input
                          placeholder="Digite uma mensagem..."
                          className="bg-background/80 backdrop-blur-sm h-11 text-sm rounded-2xl border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/30"
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />
                      </div>
                      {text.trim() ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Button
                            size="icon"
                            onClick={handleSend}
                            className="shrink-0 h-11 w-11 rounded-2xl shadow-md shadow-primary/20 transition-all"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-11 w-11 rounded-2xl text-muted-foreground hover:text-foreground"
                          onClick={startRecording}
                        >
                          <Mic className="h-5 w-5" />
                        </Button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>

    {/* Lightbox overlay */}
    <AnimatePresence>
      {lightboxImg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxImg(null)}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-3 -right-3 z-10 rounded-full bg-card p-1.5 shadow-lg border border-border hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {lightboxLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            )}
            <img
              src={lightboxImg}
              alt="Imagem"
              className="max-h-[80vh] max-w-[80vw] rounded-2xl shadow-2xl object-contain"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Send media dialog (unified) */}
    <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Mídia</DialogTitle>
          <DialogDescription>Selecione o tipo e cole a URL do arquivo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">📷 Imagem</SelectItem>
                <SelectItem value="video">🎥 Vídeo</SelectItem>
                <SelectItem value="audio">🎵 Áudio</SelectItem>
                <SelectItem value="document">📄 Documento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="https://exemplo.com/arquivo.jpg"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
          />

          {/* Preview for images */}
          {mediaType === "image" && mediaUrl && (
            <img
              src={mediaUrl}
              alt="Preview"
              className="rounded-xl max-h-48 w-auto object-contain mx-auto"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}

          {/* Document name field */}
          {mediaType === "document" && (
            <Input
              placeholder="Nome do arquivo (ex: contrato.pdf)"
              value={mediaDocName}
              onChange={(e) => setMediaDocName(e.target.value)}
            />
          )}

          <Input
            placeholder="Legenda (opcional)"
            value={mediaCaption}
            onChange={(e) => setMediaCaption(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setMediaDialogOpen(false); setMediaUrl(""); setMediaCaption(""); setMediaDocName(""); setMediaType("image"); }}>
            Cancelar
          </Button>
          <Button
            disabled={!mediaUrl.trim() || !selectedPhone || sendMediaMutation.isPending}
            onClick={handleSendMedia}
          >
            {sendMediaMutation.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

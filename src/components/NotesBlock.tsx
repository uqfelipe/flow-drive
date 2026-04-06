import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StickyNote, Search, Plus, Trash2, Pencil, Mic, Square, Play, Pause, X, FileText, Music } from "lucide-react";
import { useNotes, type Note } from "@/hooks/use-notes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ─── Inline Audio Recorder ─── */
function InlineAudioRecorder({ audioUrl, onAudioChange }: { audioUrl?: string; onAudioChange: (url?: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const MAX_SECONDS = 120;

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => onAudioChange(reader.result as string);
        reader.readAsDataURL(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s >= MAX_SECONDS - 1) { recorder.stop(); setRecording(false); clearInterval(timerRef.current); return 0; }
          return s + 1;
        });
      }, 1000);
    } catch { /* mic denied */ }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
    setSeconds(0);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Áudio</p>
      {audioUrl && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
          <audio src={audioUrl} controls className="h-8 flex-1 [&::-webkit-media-controls-panel]:bg-transparent" />
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onAudioChange(undefined)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {!audioUrl && !recording && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={start}>
          <Mic className="h-3.5 w-3.5" /> Gravar áudio
        </Button>
      )}
      {recording && (
        <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
          <span className="text-xs font-mono text-destructive">{fmtTime(seconds)} / {fmtTime(MAX_SECONDS)}</span>
          <Button type="button" variant="destructive" size="sm" className="ml-auto h-7 gap-1 text-xs" onClick={stop}>
            <Square className="h-3 w-3" /> Parar
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Mini Player ─── */
function MiniPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <>
      <audio ref={audioRef} src={src} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        <span>{playing ? "Pausar" : "Ouvir"}</span>
      </button>
    </>
  );
}

/* ─── Note type badge ─── */
function TypeBadge({ note }: { note: Note }) {
  const hasText = !!note.content;
  const hasAudio = !!note.audioUrl;
  if (hasText && hasAudio) return <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/20 text-[10px] px-1.5 py-0">Texto + Áudio</Badge>;
  if (hasAudio) return <Badge className="bg-red-500/15 text-red-400 border-red-500/20 text-[10px] px-1.5 py-0"><Music className="h-2.5 w-2.5 mr-0.5" />Áudio</Badge>;
  return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-[10px] px-1.5 py-0"><FileText className="h-2.5 w-2.5 mr-0.5" />Texto</Badge>;
}

/* ─── Main Component ─── */
export function NotesBlock() {
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | undefined>();

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  const openNew = () => { setEditing(null); setTitle(""); setContent(""); setAudioUrl(undefined); setDialogOpen(true); };
  const openEdit = (note: Note) => { setEditing(note); setTitle(note.title); setContent(note.content); setAudioUrl(note.audioUrl); setDialogOpen(true); };

  const handleSave = () => {
    if (!title.trim()) return;
    if (editing) updateNote(editing.id, title.trim(), content.trim(), audioUrl);
    else addNote(title.trim(), content.trim(), audioUrl);
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (editing) { deleteNote(editing.id); setDeleteOpen(false); setDialogOpen(false); }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <StickyNote className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-display font-semibold">Minhas Notas</h2>
            <p className="text-xs text-muted-foreground">{notes.length} {notes.length === 1 ? "nota" : "notas"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar anotações..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs bg-muted/30 border-border/50 focus:bg-background transition-colors" />
          </div>
          <Button size="sm" className="h-9 gap-1.5 shrink-0" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" /> Nova Nota
          </Button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="h-16 w-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
            <StickyNote className="h-8 w-8 opacity-40" />
          </div>
          <p className="text-sm font-medium mb-1">{search ? "Nenhuma nota encontrada" : "Nenhuma anotação ainda"}</p>
          <p className="text-xs opacity-60 mb-4">{search ? "Tente buscar por outro termo" : "Crie sua primeira nota para começar"}</p>
          {!search && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> Criar primeira nota
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(note => (
            <Card
              key={note.id}
              onClick={() => openEdit(note)}
              className="group cursor-pointer border-border/40 bg-card/50 hover:bg-card hover:border-border/60 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200"
            >
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate flex-1">{note.title}</p>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                </div>
                {note.content && (
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{note.content}</p>
                )}
                {note.audioUrl && <MiniPlayer src={note.audioUrl} />}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
                  <TypeBadge note={note} />
                  <span className="text-[10px] text-muted-foreground/60">
                    {format(new Date(note.updatedAt), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              {editing ? "Editar Nota" : "Nova Nota"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input placeholder="Título da nota" value={title} onChange={e => setTitle(e.target.value)} className="text-sm" autoFocus />
            <Textarea placeholder="Escreva sua anotação..." value={content} onChange={e => setContent(e.target.value)} rows={5} className="text-sm resize-none" />
            <InlineAudioRecorder audioUrl={audioUrl} onAudioChange={setAudioUrl} />
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            {editing && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={!title.trim()}>Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{editing?.title}"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

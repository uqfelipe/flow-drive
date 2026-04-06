import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StickyNote, Search, Plus, Trash2, Pencil } from "lucide-react";
import { useNotes, type Note } from "@/hooks/use-notes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotesBlock() {
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  const openNew = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setDialogOpen(true);
  };

  const openEdit = (note: Note) => {
    setEditing(note);
    setTitle(note.title);
    setContent(note.content);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    if (editing) {
      updateNote(editing.id, title.trim(), content.trim());
    } else {
      addNote(title.trim(), content.trim());
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (editing) {
      deleteNote(editing.id);
      setDeleteOpen(false);
      setDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" />
              Bloco de Notas
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> Nova Nota
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar anotações..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[260px] pr-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                <StickyNote className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">{search ? "Nenhuma nota encontrada." : "Nenhuma anotação ainda."}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(note => (
                  <button
                    key={note.id}
                    onClick={() => openEdit(note)}
                    className="w-full text-left p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-xs font-medium truncate">{note.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {note.content || "Sem conteúdo"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {format(new Date(note.updatedAt), "dd MMM", { locale: ptBR })}
                        </Badge>
                        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              {editing ? "Editar Nota" : "Nova Nota"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Título da nota"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-sm"
              autoFocus
            />
            <Textarea
              placeholder="Escreva sua anotação..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              className="text-sm resize-none"
            />
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            {editing && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!title.trim()}>
                Salvar
              </Button>
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

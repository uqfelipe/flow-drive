import { useState, useCallback } from "react";

export interface Note {
  id: string;
  title: string;
  content: string;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "app-notes";

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);

  const persist = useCallback((updated: Note[]) => {
    setNotes(updated);
    saveNotes(updated);
  }, []);

  const addNote = useCallback((title: string, content: string, audioUrl?: string) => {
    const now = new Date().toISOString();
    const note: Note = { id: crypto.randomUUID(), title, content, audioUrl, createdAt: now, updatedAt: now };
    persist([note, ...loadNotes()]);
  }, [persist]);

  const updateNote = useCallback((id: string, title: string, content: string, audioUrl?: string) => {
    const current = loadNotes();
    persist(current.map(n => n.id === id ? { ...n, title, content, audioUrl, updatedAt: new Date().toISOString() } : n));
  }, [persist]);

  const deleteNote = useCallback((id: string) => {
    persist(loadNotes().filter(n => n.id !== id));
  }, [persist]);

  return { notes, addNote, updateNote, deleteNote };
}

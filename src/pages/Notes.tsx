import { AdminLayout } from "@/components/AdminLayout";
import { NotesBlock } from "@/components/NotesBlock";

export default function Notes() {
  return (
    <AdminLayout title="Bloco de Notas" subtitle="Suas anotações pessoais">
      <div className="p-6 animate-fade-in">
        <div className="max-w-2xl mx-auto">
          <NotesBlock />
        </div>
      </div>
    </AdminLayout>
  );
}

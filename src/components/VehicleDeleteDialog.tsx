import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDeleteVehicle } from "@/hooks/use-vehicles";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string | null;
  vehicleName: string;
}

export function VehicleDeleteDialog({ open, onOpenChange, vehicleId, vehicleName }: Props) {
  const deleteMutation = useDeleteVehicle();

  const handleDelete = async () => {
    if (!vehicleId) return;
    try {
      await deleteMutation.mutateAsync(vehicleId);
      toast({ title: "Veículo excluído com sucesso" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir veículo</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{vehicleName}</strong>? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

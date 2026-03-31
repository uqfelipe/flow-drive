import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/hooks/use-customers";
import { useVehicles } from "@/hooks/use-vehicles";
import { useCreateRental } from "@/hooks/use-rentals";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RentalFormDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: customers } = useCustomers();
  const { data: vehicles } = useVehicles();
  const createRental = useCreateRental();

  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [totalValue, setTotalValue] = useState("");
  const [rentalStatus, setRentalStatus] = useState("pending");
  const [paymentStatus, setPaymentStatus] = useState("pending");

  const activeCustomers = useMemo(() => (customers ?? []).filter(c => c.status === "active"), [customers]);
  const availableVehicles = useMemo(() => (vehicles ?? []).filter(v => v.status === "available"), [vehicles]);

  const selectedVehicle = useMemo(() => vehicles?.find(v => v.id === vehicleId), [vehicles, vehicleId]);

  // Auto-calculate value based on daily_rate × days
  useEffect(() => {
    if (selectedVehicle && pickupDate && returnDate) {
      const days = differenceInDays(returnDate, pickupDate);
      if (days > 0) {
        setTotalValue(String(Number(selectedVehicle.daily_rate) * days));
      }
    }
  }, [selectedVehicle, pickupDate, returnDate]);

  useEffect(() => {
    if (!open) {
      setCustomerId("");
      setVehicleId("");
      setPickupDate(undefined);
      setReturnDate(undefined);
      setTotalValue("");
      setRentalStatus("pending");
      setPaymentStatus("pending");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!customerId || !vehicleId || !pickupDate || !returnDate || !totalValue) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    createRental.mutate(
      {
        customer_id: customerId,
        vehicle_id: vehicleId,
        pickup_date: format(pickupDate, "yyyy-MM-dd"),
        return_date: format(returnDate, "yyyy-MM-dd"),
        total_value: Number(totalValue),
        rental_status: rentalStatus,
        payment_status: paymentStatus,
        origin: "manual",
      },
      {
        onSuccess: () => {
          toast({ title: "Reserva criada com sucesso!" });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Erro ao criar reserva", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Reserva</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {activeCustomers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Veículo */}
          <div className="space-y-2">
            <Label>Veículo *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
              <SelectContent>
                {availableVehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} {v.year} — {v.plate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedVehicle && (
              <p className="text-[11px] text-muted-foreground">Diária: R$ {Number(selectedVehicle.daily_rate).toLocaleString("pt-BR")}</p>
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Retirada *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !pickupDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pickupDate ? format(pickupDate, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Devolução *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !returnDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {returnDate ? format(returnDate, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={returnDate} onSelect={setReturnDate} locale={ptBR} disabled={(d) => pickupDate ? d < pickupDate : false} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label>Valor Total (R$) *</Label>
            <Input type="number" min="0" value={totalValue} onChange={e => setTotalValue(e.target.value)} placeholder="0" />
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status da Reserva</Label>
              <Select value={rentalStatus} onValueChange={setRentalStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovada</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status do Pagamento</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createRental.isPending}>
            {createRental.isPending ? "Criando..." : "Criar Reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

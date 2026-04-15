import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentRow {
  id: string;
  rental_id: string;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  rentals: {
    customers: { name: string; photo: string | null } | null;
    vehicles: { name: string; brand: string; model: string; year: number } | null;
  } | null;
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, rentals(customers(name, photo), vehicles(name, brand, model, year))")
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data as PaymentRow[];
    },
  });
}

export function useUpdatePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "paid" | "overdue" }) => {
      const updates: { status: "pending" | "paid" | "overdue"; paid_at?: string } = { status };
      if (status === "paid") updates.paid_at = new Date().toISOString();
      const { data, error } = await supabase.from("payments").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["rentals"] });
    },
  });
}

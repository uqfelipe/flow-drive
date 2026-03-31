import { useQuery } from "@tanstack/react-query";
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
    customers: { name: string } | null;
    vehicles: { name: string; brand: string; model: string; year: number } | null;
  } | null;
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, rentals(customers(name), vehicles(name, brand, model, year))")
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data as PaymentRow[];
    },
  });
}

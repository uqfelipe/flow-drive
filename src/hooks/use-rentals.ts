import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RentalRow {
  id: string;
  vehicle_id: string;
  customer_id: string;
  pickup_date: string;
  return_date: string;
  total_value: number;
  rental_status: string;
  payment_status: string;
  origin: string;
  created_at: string;
  vehicles: { name: string; brand: string; model: string; year: number } | null;
  customers: { name: string; phone: string } | null;
}

export function useRentals() {
  return useQuery({
    queryKey: ["rentals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rentals")
        .select("*, vehicles(name, brand, model, year), customers(name, phone)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RentalRow[];
    },
  });
}

export function useCreateRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rental: {
      vehicle_id: string;
      customer_id: string;
      pickup_date: string;
      return_date: string;
      total_value: number;
      rental_status?: string;
      payment_status?: string;
      origin?: string;
    }) => {
      const { data, error } = await supabase.from("rentals").insert([rental as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rentals"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

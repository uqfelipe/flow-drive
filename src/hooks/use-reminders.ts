import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReminderRow {
  id: string;
  customer_id: string;
  message: string;
  scheduled_at: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export interface ReminderWithCustomer extends ReminderRow {
  customer_name: string;
  customer_phone: string;
}

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: async (): Promise<ReminderWithCustomer[]> => {
      const { data, error } = await supabase
        .from("reminders" as any)
        .select("*")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;

      const reminders = (data as any[]) || [];

      // Fetch customer names
      const customerIds = [...new Set(reminders.map((r) => r.customer_id))];
      if (customerIds.length === 0) return [];

      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone")
        .in("id", customerIds);

      const customerMap = new Map(
        (customers || []).map((c) => [c.id, { name: c.name, phone: c.phone }])
      );

      return reminders.map((r) => ({
        ...r,
        customer_name: customerMap.get(r.customer_id)?.name || "Desconhecido",
        customer_phone: customerMap.get(r.customer_id)?.phone || "",
      }));
    },
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reminder: {
      customer_id: string;
      message: string;
      scheduled_at: string;
    }) => {
      const { error } = await supabase
        .from("reminders" as any)
        .insert(reminder as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function useCancelReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reminders" as any)
        .update({ status: "cancelled" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

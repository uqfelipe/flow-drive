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
        .from("reminders")
        .select("*")
        .order("scheduled_at", { ascending: false });
      if (error) throw error;

      const reminders = (data as any[]) || [];

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
      const { data, error } = await supabase
        .from("reminders")
        .insert(reminder)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function useCancelReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reminders")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function useUpdateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; customer_id?: string; message?: string; scheduled_at?: string }) => {
      const { error } = await supabase
        .from("reminders")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reminders")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

export function useProcessReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reminderId: string | undefined = undefined) => {
      const { data, error } = await supabase.functions.invoke("send-reminders", {
        body: reminderId ? { reminderId } : {},
      });
      if (error) throw error;
      return data as { sent: number; results: Array<{ id: string; status: string; detail: string }> };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });
}

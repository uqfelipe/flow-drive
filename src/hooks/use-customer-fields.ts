import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FieldDefinition {
  id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  sort_order: number;
  created_at: string;
}

export function useCustomerFieldDefinitions() {
  return useQuery({
    queryKey: ["customer-field-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_field_definitions" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as any[]) as FieldDefinition[];
    },
  });
}

export function useCreateFieldDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (def: { field_key: string; field_label: string; field_type?: string }) => {
      const { data, error } = await supabase
        .from("customer_field_definitions" as any)
        .insert(def as any)
        .select()
        .single();
      if (error) throw error;
      return data as FieldDefinition;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-field-definitions"] }),
  });
}

export function useDeleteFieldDefinition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customer_field_definitions" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-field-definitions"] }),
  });
}

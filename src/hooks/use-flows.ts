import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Edge, Node } from "@xyflow/react";

export interface FlowRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  nodes: unknown[];
  edges: unknown[];
  created_at: string;
  updated_at: string;
}

export function useFlows() {
  return useQuery({
    queryKey: ["flows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_flows")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FlowRow[];
    },
  });
}

export function useFlow(id: string | null) {
  return useQuery({
    queryKey: ["flows", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_flows")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as FlowRow | null;
    },
  });
}

export function useSaveFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nodes, edges, name, description, status }: {
      id: string;
      nodes: Node[];
      edges: Edge[];
      name?: string;
      description?: string;
      status?: string;
    }) => {
      const update: Record<string, unknown> = { nodes, edges, updated_at: new Date().toISOString() };
      if (name) update.name = name;
      if (description) update.description = description;
      if (status) update.status = status;
      const { data, error } = await supabase
        .from("chatbot_flows")
        .update(update)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows"] }),
  });
}

export function useCreateFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (flow: { name: string; description?: string; nodes?: Node[]; edges?: Edge[] }) => {
      const { data, error } = await supabase
        .from("chatbot_flows")
        .insert({ ...flow, nodes: flow.nodes || [], edges: flow.edges || [] })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flows"] }),
  });
}

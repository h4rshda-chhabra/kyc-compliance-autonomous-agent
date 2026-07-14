import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { SARReport } from "@/types/models";

export function useSarReports() {
  return useQuery({
    queryKey: ["sar-reports"],
    queryFn: async () => {
      const { data } = await apiClient.get<SARReport[]>("/review/sar");
      return data;
    },
  });
}

export function useSarReport(id: string | undefined) {
  return useQuery({
    queryKey: ["sar-reports", id],
    queryFn: async () => {
      const { data } = await apiClient.get<SARReport>(`/review/sar/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useSarDecision(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (decision: "approved" | "rejected") => {
      const { data } = await apiClient.post<SARReport>(
        `/review/sar/${id}/decision`,
        { decision }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sar-reports"] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { Company } from "@/types/models";

/** Companies directory, served straight from the sanctions dataset on the
 *  backend. Pass `search` to query the full dataset server-side. */
export function useCompanies(search?: string) {
  const q = search?.trim() || undefined;
  return useQuery({
    queryKey: ["companies", { q: q ?? "" }],
    queryFn: async () => {
      const { data } = await apiClient.get<Company[]>("/companies", {
        params: q ? { q } : undefined,
      });
      return data;
    },
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: async () => {
      const { data } = await apiClient.get<Company>(`/companies/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (company: { legal_name: string; jurisdiction?: string; industry?: string }) => {
      const { data } = await apiClient.post<Company>("/companies", company);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

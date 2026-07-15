import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { MonitoringRun } from "@/types/models";

export function useMonitoringRuns() {
  return useQuery({
    queryKey: ["monitoring-runs"],
    queryFn: async () => {
      const { data } = await apiClient.get<MonitoringRun[]>("/monitor/runs");
      return data;
    },
  });
}

export function useMonitoringRun(id: string | undefined) {
  return useQuery({
    queryKey: ["monitoring-runs", id],
    queryFn: async () => {
      const { data } = await apiClient.get<MonitoringRun>(`/monitor/runs/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useTriggerMonitoringRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const { data } = await apiClient.post<MonitoringRun>(
        `/monitor/companies/${companyId}/trigger`
      );
      return data;
    },
    onSuccess: () => {
      // A scan touches the company row, its risk/evidence reports, possibly
      // drafts a SAR, and writes audit entries — refresh all of it.
      queryClient.invalidateQueries({ queryKey: ["monitoring-runs"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["sar-reports"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export interface SanctionsSyncLog {
  id: string;
  sync_timestamp: string;
  provider: string;
  dataset_version: string;
  records_added: number;
  records_updated: number;
  records_removed: number;
  total_records: number;
  sync_duration_seconds: number;
  success: boolean;
  failure_reason: string | null;
}

export function useSanctionsSyncHistory() {
  return useQuery({
    queryKey: ["sanctions-sync-history"],
    queryFn: async () => {
      const { data } = await apiClient.get<SanctionsSyncLog[]>("/monitor/sync/history");
      return data;
    },
  });
}

export function useTriggerSanctionsSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (feedUrl?: string) => {
      const { data } = await apiClient.post<any>("/monitor/sync", null, {
        params: feedUrl ? { feed_url: feedUrl } : {},
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sanctions-sync-history"] });
      queryClient.invalidateQueries({ queryKey: ["monitoring-runs"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["sar-reports"] });
    },
  });
}


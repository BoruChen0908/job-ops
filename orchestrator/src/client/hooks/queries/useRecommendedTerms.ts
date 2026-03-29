import * as api from "@client/api";
import { queryKeys } from "@/client/lib/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useRecommendedTerms(status?: string) {
  return useQuery({
    queryKey: queryKeys.recommendedTerms.list(status),
    queryFn: () => api.getRecommendedTerms(status),
  });
}

export function useUpdateRecommendedTermMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "accepted" | "dismissed";
    }) => api.updateRecommendedTermStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recommendedTerms.all,
      });
    },
  });
}

export function useBatchUpdateRecommendedTermsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      status,
    }: {
      ids: string[];
      status: "accepted" | "dismissed";
    }) => api.batchUpdateRecommendedTerms(ids, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.recommendedTerms.all,
      });
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { toast } from "sonner"
import { getCookie } from "@curriculum-services/auth"

interface ReorderModulesPayload {
  trainingId: string
  orderedModuleIds: string[]
}

interface ReorderModulesResponse {
  code: string
  message: string
}

export function useReorderModules() {
  const queryClient = useQueryClient()

  return useMutation<ReorderModulesResponse, Error, ReorderModulesPayload>({
    mutationFn: async (data: ReorderModulesPayload) => {
      const token = getCookie("token")
      const response = await axios.post<ReorderModulesResponse>(
        `${process.env.NEXT_PUBLIC_API_TRAINING_DELIVERY}/training-delivery/module/reorder`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["modules", variables.trainingId],
      })
      toast.success("Module order updated successfully")
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to reorder modules"
        )
      } else {
        toast.error("An unexpected error occurred")
      }
    },
  })
}

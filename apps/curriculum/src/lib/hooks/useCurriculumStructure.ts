import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { toast } from "sonner"
import { getCookie } from "@curriculum-services/auth"

// ---- Types ----

export interface CurriculumModule {
  id: string
  name: string
  description: string
  moduleOrder: number
  lessonCount: number
  contentCount: number
  catCount: number
  progress: number | null
}

interface CurriculumModulesResponse {
  code: string
  totalPages: number
  pageSize: number
  message: string
  currentPage: number
  modules: CurriculumModule[]
  totalElements: number
}

interface ReorderModulesPayload {
  trainingId: string
  orderedModuleIds: string[]
}

export interface ContentOrderItem {
  type: "CONTENT" | "ASSESSMENT" | "SURVEY"
  id: string
}

interface ReorderContentItemsPayload {
  cohortId: string
  moduleId: string
  orderedItems: ContentOrderItem[]
}

export interface ModuleContentItem {
  id: string
  type: "CONTENT" | "ASSESSMENT" | "SURVEY"
  name: string
  description: string
  contentFileType?: string
  lessonName?: string | null
  assessmentName?: string | null
  order?: number
}

export interface ModuleContentsResponse {
  cohortName: string
  cohortId: string
  code: string
  hasCustomOrder: boolean
  contents: ModuleContentItem[]
  message: string
  totalCount: number
}

interface ApiResponse {
  code: string
  message: string
}

// ---- Hooks ----

/**
 * Fetch training modules using the paginated endpoint.
 * Returns modules with moduleOrder, lessonCount, contentCount, catCount.
 */
export function useCurriculumModules(
  trainingId: string,
  page: number = 1,
  pageSize: number = 50
) {
  return useQuery<CurriculumModulesResponse>({
    queryKey: ["curriculum-modules", trainingId, page, pageSize],
    queryFn: async () => {
      const token = getCookie("token")
      const response = await axios.get<CurriculumModulesResponse>(
        `${process.env.NEXT_PUBLIC_API_TRAINING_DELIVERY}/training-delivery/module/training/${trainingId}`,
        {
          params: { page, "page-size": pageSize },
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      return response.data
    },
    enabled: !!trainingId,
  })
}

/**
 * Fetch content items for a module, optionally scoped to a cohort.
 * GET /api/training-delivery/content-item/module/{moduleId}?cohortId=
 */
export function useModuleContents(moduleId: string, cohortId?: string) {
  return useQuery<ModuleContentsResponse>({
    queryKey: ["module-contents", moduleId, cohortId],
    queryFn: async () => {
      const token = getCookie("token")
      const response = await axios.get<ModuleContentsResponse>(
        `${process.env.NEXT_PUBLIC_API_TRAINING_DELIVERY}/training-delivery/content-item/module/${moduleId}`,
        {
          params: cohortId ? { cohortId } : undefined,
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      return response.data
    },
    enabled: !!moduleId,
  })
}

/**
 * Reorder modules at the training level.
 */
export function useReorderModules() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse, Error, ReorderModulesPayload>({
    mutationFn: async (data: ReorderModulesPayload) => {
      const token = getCookie("token")
      const response = await axios.post<ApiResponse>(
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
        queryKey: ["curriculum-modules", variables.trainingId],
      })
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

/**
 * Reorder content items (lessons, assessments, surveys) within a cohort + module.
 */
export function useReorderContentItems() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse, Error, ReorderContentItemsPayload>({
    mutationFn: async (data: ReorderContentItemsPayload) => {
      const token = getCookie("token")
      const response = await axios.post<ApiResponse>(
        `${process.env.NEXT_PUBLIC_API_TRAINING_DELIVERY}/training-delivery/content-item/reorder`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["module-contents", variables.moduleId],
      })
      queryClient.invalidateQueries({
        queryKey: ["lessons", variables.moduleId],
      })
      toast.success("Content order updated successfully")
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to reorder content items"
        )
      } else {
        toast.error("An unexpected error occurred")
      }
    },
  })
}

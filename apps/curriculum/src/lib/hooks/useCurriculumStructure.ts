import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { toast } from "sonner"
import { getCookie } from "@curriculum-services/auth"

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
  displayOrder: number
  type: "CONTENT" | "ASSESSMENT" | "SURVEY"
  id: string
  title: string
  description: string
  lessonId: string | null
  lessonName: string | null
  contentLevel: "MODULE" | "LESSON"
  isRequired: boolean
  isLocked: boolean
  lockReason: string | null
  prerequisiteContentIds: string[] | null
  unlockDate: string | null
  dueDate: string | null
  isOverdue: boolean | null
  isCompleted: boolean
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

export interface AvailableContentItem {
  id: string
  name: string
  description: string
}

interface AvailableItemsResponse {
  code: string
  message: string
  surveys?: AvailableContentItem[]
  assessments?: AvailableContentItem[]
}

interface AddContentItemParams {
  cohortId: string
  moduleId: string
  type: "ASSESSMENT" | "SURVEY"
  contentId: string
}

interface RemoveContentItemParams {
  cohortId: string
  moduleId: string
  type: "CONTENT" | "ASSESSMENT" | "SURVEY"
  contentId: string
}

interface CopyOrderingPayload {
  sourceCohortId: string
  moduleId: string
  targetCohortIds: string[]
}

interface ApiResponse {
  code: string
  message: string
}

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

export function useAvailableSurveys(cohortId: string, moduleId: string, enabled = true) {
  return useQuery<AvailableContentItem[]>({
    queryKey: ["available-surveys", cohortId, moduleId],
    queryFn: async () => {
      const token = getCookie("token")
      const response = await axios.get<AvailableItemsResponse>(
        `${process.env.NEXT_PUBLIC_API_TRAINING_DELIVERY}/training-delivery/content-item/cohort/${cohortId}/module/${moduleId}/available-surveys`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return response.data.surveys ?? []
    },
    enabled: enabled && !!cohortId && !!moduleId,
  })
}

export function useAvailableAssessments(cohortId: string, moduleId: string, enabled = true) {
  return useQuery<AvailableContentItem[]>({
    queryKey: ["available-assessments", cohortId, moduleId],
    queryFn: async () => {
      const token = getCookie("token")
      const response = await axios.get<AvailableItemsResponse>(
        `${process.env.NEXT_PUBLIC_API_TRAINING_DELIVERY}/training-delivery/content-item/cohort/${cohortId}/module/${moduleId}/available-assessments`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return response.data.assessments ?? []
    },
    enabled: enabled && !!cohortId && !!moduleId,
  })
}

export function useAddContentItem() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse, Error, AddContentItemParams>({
    mutationFn: async ({ cohortId, moduleId, type, contentId }) => {
      const token = getCookie("token")
      const response = await axios.post<ApiResponse>(
        `${process.env.NEXT_PUBLIC_API_TRAINING_DELIVERY}/training-delivery/content-item/cohort/${cohortId}/module/${moduleId}/add`,
        null,
        {
          params: { type, contentId },
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
        queryKey: ["available-surveys", variables.cohortId, variables.moduleId],
      })
      queryClient.invalidateQueries({
        queryKey: ["available-assessments", variables.cohortId, variables.moduleId],
      })
      toast.success("Content added successfully")
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to add content")
      } else {
        toast.error("An unexpected error occurred")
      }
    },
  })
}

export function useCopyOrdering() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse, Error, CopyOrderingPayload>({
    mutationFn: async (data) => {
      const token = getCookie("token")
      const response = await axios.post<ApiResponse>(
        `${process.env.NEXT_PUBLIC_API_TRAINING_DELIVERY}/training-delivery/content-item/copy-ordering`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-contents"] })
      toast.success("Ordering applied to selected cohorts")
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to copy ordering")
      } else {
        toast.error("An unexpected error occurred")
      }
    },
  })
}

export function useRemoveContentItem() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse, Error, RemoveContentItemParams>({
    mutationFn: async ({ cohortId, moduleId, type, contentId }) => {
      const token = getCookie("token")
      const response = await axios.delete<ApiResponse>(
        `${process.env.NEXT_PUBLIC_API_TRAINING_DELIVERY}/training-delivery/content-item/cohort/${cohortId}/module/${moduleId}/remove`,
        {
          params: { type, contentId },
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
        queryKey: ["available-surveys", variables.cohortId, variables.moduleId],
      })
      queryClient.invalidateQueries({
        queryKey: ["available-assessments", variables.cohortId, variables.moduleId],
      })
      toast.success("Content removed successfully")
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to remove content")
      } else {
        toast.error("An unexpected error occurred")
      }
    },
  })
}

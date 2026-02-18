/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError } from "axios"
import { toast } from "sonner"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getCookie } from "@curriculum-services/auth"

interface ContentDeveloperRole {
  name: string
  colorCode: string
}

interface ContentDeveloper {
  id: string
  firstName: string | null
  lastName: string | null
  phoneNumber: string | null
  email: string
  role: ContentDeveloperRole
  profilePictureUrl: string | null
  emailVerified: boolean
  phoneVerified: boolean
}

export interface Content {
  id: string
  name: string
  description: string
  contentLevel: 'MODULE' | 'SECTION' | 'LESSON' | 'ASSESSMENT'
  contentFileType: 'PDF' | 'VIDEO' | 'LINK'
  link: string | null
  referenceLink: string | null
  rejectionReason: string | null
  contentStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  contentDeveloper: ContentDeveloper
  moduleName: string | null
  lessonName: string | null
  assessmentName: string | null
}

interface ContentResponse {
  code: string
  contents: Content[]
  totalPages: number
  pageSize: number
  message: string
  currentPage: number
  totalElements: number
}

interface ContentPayload {
  singleContentRequestDTO: {
    name: string
    description: string
    contentFileType: 'PDF' | 'VIDEO' | 'LINK'
  }[]
  email: string
  moduleId?: string
  lessonId?: string
  assessmentId?: string
}

interface GetContentsParams {
  trainingId: string
  page?: number
  pageSize?: number
  searchQuery?: string
}

interface ErrorResponse {
  message: string;
  code: string;
}

interface SingleContentResponse {
  code: string
  message: string
  content: Content
}

export function useContentById(contentId: string, enabled = true) {
  return useQuery<Content>({
    queryKey: ['content', contentId],
    queryFn: async () => {
      const token = getCookie('token')
      const response = await axios.get<SingleContentResponse>(
        `${process.env.NEXT_PUBLIC_API}/content/${contentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      return response.data.content
    },
    enabled: enabled && !!contentId,
  })
}

export function useGetContents({ trainingId, page = 1, pageSize = 10, searchQuery = "" }: GetContentsParams) {
  return useQuery<ContentResponse>({
    queryKey: ['contents', trainingId, page, pageSize, searchQuery],
    queryFn: async () => {
      const token = getCookie('token')
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API}/content/training/${trainingId}`,
        {
          params: {
            page,
            'page-size': pageSize,
            'search-query': searchQuery
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data
    }
  })
}

export function useCreateContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: ContentPayload) => {
      const token = getCookie('token')
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/content`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success('Content created successfully')
      queryClient.invalidateQueries({ queryKey: ['contents'] })
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      toast.error("Error", { 
        description: error.response?.data?.message || "Failed to create content" 
      })
    }
  })
}

export function useAcceptContent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (contentId: string) => {
      const token = getCookie('token')
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/content/accept-content/${contentId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] })
      toast.success('Content accepted successfully')
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      toast.error("Error", { 
        description: error.response?.data?.message || "Failed to accept content" 
      })
    }
  })
}

export function useRejectContent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ contentId, reason }: { contentId: string, reason: string }) => {
      const token = getCookie('token')
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/content/reject-content/${contentId}`,
        {},
        {
          params: { 'rejection-reason': reason },
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] })
      toast.success('Content rejected successfully')
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      toast.error("Error", { 
        description: error.response?.data?.message || "Failed to reject content" 
      })
    }
  })
}

export function useAddContentLink() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ contentId, link, referenceLink }: { 
      contentId: string;
      link: string;
      referenceLink: string;
    }) => {
      const token = getCookie('token')
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/content/add-link/${contentId}`,
        { link, referenceLink },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] })
      toast.success('Content link added successfully')
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      toast.error("Error", { 
        description: error.response?.data?.message || "Failed to add content link" 
      })
    }
  })
}

export function useEditContentLink() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ contentId, link, referenceLink }: { 
      contentId: string;
      link: string;
      referenceLink: string;
    }) => {
      const token = getCookie('token')
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/content/add-link/${contentId}`,
        { link, referenceLink },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] })
      toast.success('Content link updated successfully')
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      toast.error("Error", { 
        description: error.response?.data?.message || "Failed to update content link" 
      })
    }
  })
}

export function useDeleteContentLink() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (contentId: string) => {
      const token = getCookie('token')
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/content/delete-link/${contentId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] })
      toast.success('Content link deleted successfully')
    },
    onError: (error: AxiosError<ErrorResponse>) => {
      toast.error("Error", { 
        description: error.response?.data?.message || "Failed to delete content link" 
      })
    }
  })
} 
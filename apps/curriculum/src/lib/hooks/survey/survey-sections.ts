import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { getCookie } from "@curriculum-services/auth";
import { toast } from "sonner";
import { 
  surveyQueryKeys, 
  SurveyEntryPayload,
  ApiErrorResponse 
} from "../survey-types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Update section data type for v2 API
 */
export interface UpdateSectionDataV2 {
  title: string;
  description?: string;
  sectionNumber?: number;
}

/**
 * Bulk section payload type for v2 API
 */
export interface BulkSectionPayload {
  title: string;
  description?: string;
  sectionNumber: number;
  entries: SurveyEntryPayload[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build FormData for bulk sections POST
 */
function buildBulkSectionsFormData(sections: BulkSectionPayload[]): FormData {
  const formData = new FormData();
  
  sections.forEach((section, si) => {
    formData.append(`[${si}].title`, section.title);
    if (section.description) {
      formData.append(`[${si}].description`, section.description);
    }
    formData.append(`[${si}].sectionNumber`, String(section.sectionNumber));
    
    // Entries
    section.entries.forEach((entry, ei) => {
      const prefix = `[${si}].entries[${ei}]`;
      
      formData.append(`${prefix}.clientId`, entry.clientId);
      formData.append(`${prefix}.question`, entry.question);
      formData.append(`${prefix}.questionType`, entry.questionType);
      formData.append(`${prefix}.isRequired`, String(entry.isRequired));
      formData.append(`${prefix}.isFollowUp`, String(entry.isFollowUp));
      formData.append(`${prefix}.hasTextInput`, String(entry.hasTextInput || false));
      
      if (entry.questionNumber != null) {
        formData.append(`${prefix}.questionNumber`, String(entry.questionNumber));
      }
      
      // Follow-up references
      if (entry.isFollowUp) {
        if (entry.parentQuestionClientId) {
          formData.append(`${prefix}.parentQuestionClientId`, entry.parentQuestionClientId);
        }
        if (entry.triggerChoiceClientIds && entry.triggerChoiceClientIds.length > 0) {
          entry.triggerChoiceClientIds.forEach((id, idx) => {
            formData.append(`${prefix}.triggerChoiceClientIds[${idx}]`, id);
          });
        }
        if (entry.parentQuestionId) {
          formData.append(`${prefix}.parentQuestionId`, entry.parentQuestionId);
        }
        if (entry.triggerChoiceIds && entry.triggerChoiceIds.length > 0) {
          entry.triggerChoiceIds.forEach((id, idx) => {
            formData.append(`${prefix}.triggerChoiceIds[${idx}]`, id);
          });
        }
      }
      
      // Choices
      entry.choices.forEach((choice, ci) => {
        const choicePrefix = `${prefix}.choices[${ci}]`;
        formData.append(`${choicePrefix}.clientId`, choice.clientId);
        formData.append(`${choicePrefix}.choiceText`, choice.choiceText);
        if (choice.choiceOrder) {
          formData.append(`${choicePrefix}.choiceOrder`, choice.choiceOrder);
        }
        formData.append(`${choicePrefix}.hasTextInput`, String(choice.hasTextInput || false));
        
        // Choice image - only send if it's a File
        if ((choice as any).choiceImageFile instanceof File) {
          formData.append(`${choicePrefix}.choiceImage`, (choice as any).choiceImageFile);
        }
      });
      
      // Grid rows
      entry.gridRows.forEach((row, ri) => {
        const rowPrefix = `${prefix}.gridRows[${ri}]`;
        formData.append(`${rowPrefix}.rowNumber`, String(row.rowNumber));
        formData.append(`${rowPrefix}.rowText`, row.rowText);
        // Row image - only send if it's a File
        if ((row as any).rowImageFile instanceof File) {
          formData.append(`${rowPrefix}.rowImage`, (row as any).rowImageFile);
        }
      });
      
      // Question image - only send if it's a File
      if ((entry as any).questionImageFile instanceof File) {
        formData.append(`${prefix}.questionImage`, (entry as any).questionImageFile);
      }
    });
  });
  
  return formData;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for adding sections in bulk (v2 API)
 * POST /v2/survey-sections/survey/{surveyId}/bulk
 */
export function useAddSectionsBulk(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sections: BulkSectionPayload[]) => {
      const token = getCookie("token");
      const formData = buildBulkSectionsFormData(sections);
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-sections/survey/${surveyId}/bulk`,
        formData,
        {
          headers: { 
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}` 
          },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Sections added successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.detail(surveyId) });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to add sections");
    },
  });
}

/**
 * Hook for updating a survey section
 * PUT /v2/survey-sections/{sectionId}
 */
export function useUpdateSurveySection() {
  const queryClient = useQueryClient();

  const updateSurveySectionMutation = useMutation({
    mutationFn: async ({ 
      sectionId, 
      data 
    }: { 
      sectionId: string; 
      data: UpdateSectionDataV2;
    }) => {
      const token = getCookie("token");
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-sections/${sectionId}`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Section updated successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to update section");
    },
  });

  return {
    updateSurveySection: updateSurveySectionMutation.mutate,
    updateSurveySectionAsync: updateSurveySectionMutation.mutateAsync,
    isLoading: updateSurveySectionMutation.isPending,
    isSuccess: updateSurveySectionMutation.isSuccess,
    isError: updateSurveySectionMutation.isError,
    error: updateSurveySectionMutation.error,
  };
}

/**
 * Hook for reordering a section
 * PATCH /v2/survey-sections/{sectionId}/reorder?newPosition={newPosition}
 */
export function useReorderSection() {
  const queryClient = useQueryClient();

  const reorderSectionMutation = useMutation({
    mutationFn: async ({
      sectionId,
      newPosition,
    }: {
      sectionId: string;
      newPosition: number;
    }) => {
      const token = getCookie("token");
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-sections/${sectionId}/reorder?newPosition=${newPosition}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Section reordered successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to reorder section");
    },
  });

  return {
    reorderSection: reorderSectionMutation.mutate,
    reorderSectionAsync: reorderSectionMutation.mutateAsync,
    isLoading: reorderSectionMutation.isPending,
    isSuccess: reorderSectionMutation.isSuccess,
    isError: reorderSectionMutation.isError,
    error: reorderSectionMutation.error,
  };
}

/**
 * Hook for deleting a survey section - v2 API
 * DELETE /v2/survey-sections/{sectionId}
 * Deletes a section and reorders remaining sections.
 * Cannot delete if survey has been answered.
 */
export function useDeleteSurveySection() {
  const queryClient = useQueryClient();

  const deleteSurveySectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const token = getCookie("token");
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-sections/${sectionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Section deleted successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to delete section");
    },
  });

  return {
    deleteSurveySection: deleteSurveySectionMutation.mutate,
    deleteSurveySectionAsync: deleteSurveySectionMutation.mutateAsync,
    isLoading: deleteSurveySectionMutation.isPending,
    isSuccess: deleteSurveySectionMutation.isSuccess,
    isError: deleteSurveySectionMutation.isError,
    error: deleteSurveySectionMutation.error,
  };
}

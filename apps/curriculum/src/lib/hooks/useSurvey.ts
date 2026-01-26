import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { getCookie } from "@curriculum-services/auth";
import { toast } from "sonner";

// =============================================================================
// Re-export everything from survey module
// =============================================================================
export * from "./survey-types";
export * from "./survey/survey-sections";
export * from "./survey/survey-entries";
export * from "./survey/survey-answers";

import {
  SurveyType,
  CreateSurveyPayload,
  SurveyDetailApiResponse,
  SurveysApiResponse,
  ApiErrorResponse,
  surveyQueryKeys,
  transformResponseToForm,
} from "./survey-types";

// =============================================================================
// TYPES
// =============================================================================

/** Update survey metadata request */
export interface UpdateSurveyData {
  name: string;
  type: SurveyType;
  description: string;
}

// =============================================================================
// GET HOOKS
// =============================================================================

/**
 * Hook to fetch all surveys for a training
 * GET /v2/surveys/training/{trainingId}
 */
export function useSurveys(trainingId: string) {
  return useQuery({
    queryKey: surveyQueryKeys.training(trainingId),
    queryFn: async () => {
      try {
        const token = getCookie("token");
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API}/v2/surveys/training/${trainingId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        return response.data as SurveysApiResponse;
      } catch (error: unknown) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        throw new Error(axiosError?.response?.data?.message || "Failed to load surveys");
      }
    },
  });
}

/**
 * Hook to fetch survey details (v2 API format)
 * GET /v2/surveys/{surveyId}
 */
export function useSurveyDetailNew(surveyId: string) {
  return useQuery({
    queryKey: surveyQueryKeys.detail(surveyId),
    queryFn: async () => {
      try {
        const token = getCookie("token");
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API}/v2/surveys/${surveyId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        const data = response.data as SurveyDetailApiResponse;
        return {
          ...data,
          formSections: transformResponseToForm(data.survey)
        };
      } catch (error: unknown) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        throw new Error(axiosError?.response?.data?.message || "Failed to load survey details");
      }
    },
    enabled: !!surveyId,
  });
}

// =============================================================================
// CREATE SURVEY MUTATION
// =============================================================================

/**
 * Build FormData for new survey POST format
 */
function buildSurveyFormData(payload: CreateSurveyPayload): FormData {
  const formData = new FormData();
  
  // Top-level fields
  formData.append('name', payload.name);
  formData.append('type', payload.type);
  formData.append('description', payload.description);
  
  // Sections
  payload.sections.forEach((section, si) => {
    formData.append(`sections[${si}].title`, section.title);
    if (section.description) {
      formData.append(`sections[${si}].description`, section.description);
    }
    if (section.sectionNumber != null) {
      formData.append(`sections[${si}].sectionNumber`, String(section.sectionNumber));
    }
    
    // Entries
    section.entries.forEach((entry, ei) => {
      const prefix = `sections[${si}].entries[${ei}]`;
      
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
        
        // Choice image
        if ((choice as any).choiceImageFile instanceof File) {
          formData.append(`${choicePrefix}.choiceImage`, (choice as any).choiceImageFile);
        } else if (choice.choiceImage) {
          formData.append(`${choicePrefix}.choiceImage`, choice.choiceImage);
        }
      });
      
      // Grid rows
      entry.gridRows.forEach((row, ri) => {
        const rowPrefix = `${prefix}.gridRows[${ri}]`;
        formData.append(`${rowPrefix}.rowNumber`, String(row.rowNumber));
        formData.append(`${rowPrefix}.rowText`, row.rowText);
        if ((row as any).rowImageFile instanceof File) {
          formData.append(`${rowPrefix}.rowImage`, (row as any).rowImageFile);
        } else if (row.rowImage) {
          formData.append(`${rowPrefix}.rowImage`, row.rowImage);
        }
      });
      
      // Question image
      if ((entry as any).questionImageFile instanceof File) {
        formData.append(`${prefix}.questionImage`, (entry as any).questionImageFile);
      } else if (entry.questionImage) {
        formData.append(`${prefix}.questionImage`, entry.questionImage);
      }
    });
  });
  
  return formData;
}

/**
 * Hook for creating a new survey
 * POST /v2/surveys/training/{trainingId}
 */
export function useCreateSurveyNew(trainingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSurveyPayload) => {
      const token = getCookie("token");
      const formData = buildSurveyFormData(payload);
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/v2/surveys/training/${trainingId}`,
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
      toast.success(data.message || "Survey created successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.training(trainingId) });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to create survey");
    },
  });
}

// =============================================================================
// UPDATE SURVEY METADATA
// =============================================================================

/**
 * Hook for updating survey metadata (name, type, description)
 * PUT /v2/surveys/{surveyId}
 */
export function useUpdateSurvey() {
  const queryClient = useQueryClient();

  const updateSurveyMutation = useMutation({
    mutationFn: async ({ surveyId, data }: { surveyId: string; data: UpdateSurveyData }) => {
      const token = getCookie("token");
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API}/v2/surveys/${surveyId}`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return { responseData: response.data, surveyId };
    },
    onSuccess: ({ responseData, surveyId }) => {
      toast.success(responseData.message || "Survey updated successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.detail(surveyId) });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to update survey");
    },
  });

  return {
    updateSurvey: updateSurveyMutation.mutate,
    updateSurveyAsync: updateSurveyMutation.mutateAsync,
    isLoading: updateSurveyMutation.isPending,
    isSuccess: updateSurveyMutation.isSuccess,
    isError: updateSurveyMutation.isError,
    error: updateSurveyMutation.error,
  };
}

// =============================================================================
// DELETE SURVEY
// =============================================================================

/**
 * Hook for deleting a survey - v2 API
 * DELETE /v2/surveys/{surveyId}
 * Deletes a survey and all associated files.
 * Cannot delete if survey has been answered.
 */
export function useDeleteSurvey() {
  const queryClient = useQueryClient();

  const deleteSurveyMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const token = getCookie("token");
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/v2/surveys/${surveyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Survey deleted successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to delete survey");
    },
  });

  return {
    deleteSurvey: deleteSurveyMutation.mutate,
    deleteSurveyAsync: deleteSurveyMutation.mutateAsync,
    isLoading: deleteSurveyMutation.isPending,
    isSuccess: deleteSurveyMutation.isSuccess,
    isError: deleteSurveyMutation.isError,
    error: deleteSurveyMutation.error,
  };
}

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
  SurveyQuestionType,
  CreateSurveyPayload,
  SurveyDetailApiResponse,
  ApiErrorResponse,
  surveyQueryKeys,
  transformResponseToForm,
} from "./survey-types";

// =============================================================================
// LEGACY TYPES (for backward compatibility during migration)
// These will be removed once all components are migrated
// =============================================================================

/** @deprecated Use SurveyQuestionType from survey-types.ts */
export type QuestionType = SurveyQuestionType;

/** @deprecated Use SurveyEntryForm from survey-types.ts */
export interface CreateSurveyEntry {
  question: string;
  questionImage?: string;
  questionImageUrl?: string;
  questionImageFile?: File;
  questionType: QuestionType;
  choices: CreateSurveyChoice[];
  allowTextAnswer: boolean;
  rows: string[];
  required: boolean;
  questionNumber?: number;
  parentQuestionNumber?: number;
  parentChoice?: string;
  followUp?: boolean;
}

/** @deprecated Use SurveyChoiceForm from survey-types.ts */
export interface CreateSurveyChoice {
  choice: string;
  choiceImage?: string;
  choiceImageFile?: File;
}

/** @deprecated Use SurveySectionForm from survey-types.ts */
export interface CreateSurveySection {
  title: string;
  description?: string;
  surveyEntries: CreateSurveyEntry[];
}

/** @deprecated Use CreateSurveyPayload from survey-types.ts */
export interface CreateSurveyData {
  name: string;
  type: SurveyType;
  description: string;
  sections: CreateSurveySection[];
}

// Legacy response types for backward compatibility
export interface SurveyEntry {
  id?: string;
  question: string;
  questionType: QuestionType;
  questionImage?: string;
  questionImageUrl?: string;
  choices: string[] | SurveyChoice[];
  allowMultipleAnswers: boolean;
  allowOtherAnswer: boolean;
  rows: string[];
  required: boolean;
  answer?: string | null;
  questionNumber?: number;
  parentQuestionNumber?: number | null;
  parentChoice?: string | null;
  followUp?: boolean;
}

export interface SurveyChoice {
  order: string;
  choiceText: string;
  choiceImageUrl?: string;
}

export interface SurveySection {
  id?: string;
  title: string;
  description?: string | null;
  questions: SurveyEntry[];
}

export interface Survey {
  id: string;
  name: string;
  type: SurveyType | null;
  description: string;
  sectionCount: number;
}

export interface SurveyDetail {
  id: string;
  name: string;
  type: SurveyType | null;
  description: string;
  sections: SurveySection[];
  sessions: null;
}

export interface SurveysResponse {
  code: string;
  surveys: Survey[];
  message: string;
}

export interface SurveyDetailResponse_Legacy {
  code: string;
  survey: SurveyDetail;
  message: string;
}

export interface UpdateSurveyData {
  name: string;
  type: SurveyType;
  description: string;
}

/** @deprecated Use UpdateSurveyEntryDataV2 from survey-entries.ts */
export interface UpdateSurveyEntryData {
  question: string;
  questionImage?: string;
  questionImageFile?: File;
  questionType: QuestionType;
  questionNumber?: number;
  isRequired: boolean;
  choices: {
    choice: string;
    choiceImage?: string;
    choiceImageFile?: File;
  }[];
  allowOtherAnswer: boolean;
  rows: string[];
  isFollowUp?: boolean;
  parentQuestionNumber?: number;
  parentChoice?: string;
}

// =============================================================================
// LEGACY HELPERS (for backward compatibility)
// =============================================================================

/**
 * Get default question fields in LEGACY format (for SurveyQuestionManager)
 * @deprecated Use getDefaultQuestionFields from survey-types.ts for new components
 */
export function getDefaultQuestionFieldsLegacy(questionType: QuestionType): {
  choices: string[];
  rows: string[];
  allowTextAnswer: boolean;
} {
  switch (questionType) {
    case "TEXT":
      return { choices: [], rows: [], allowTextAnswer: false };
    case "RADIO":
    case "CHECKBOX":
      return { choices: ["", ""], rows: [], allowTextAnswer: false };
    case "GRID":
      return { choices: ["", ""], rows: ["", ""], allowTextAnswer: false };
    default:
      return { choices: [], rows: [], allowTextAnswer: false };
  }
}

/**
 * Validate survey entry in LEGACY format (for SurveyQuestionManager)
 * @deprecated Use validateSurveyEntry from survey-types.ts for new components
 */
export function validateSurveyEntryLegacy(entry: {
  question: string;
  questionType: QuestionType;
  choices: string[];
  rows: string[];
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!entry.question.trim()) {
    errors.push("Question text is required");
  }
  
  if (entry.questionType === "RADIO" || entry.questionType === "CHECKBOX") {
    if (entry.choices.length < 2) {
      errors.push("At least 2 choices are required");
    }
    const emptyChoices = entry.choices.filter(c => !c.trim());
    if (emptyChoices.length > 0) {
      errors.push("All choices must have text");
    }
  }
  
  if (entry.questionType === "GRID") {
    if (entry.choices.length < 2) {
      errors.push("At least 2 column options are required");
    }
    if (entry.rows.length < 2) {
      errors.push("At least 2 row options are required");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
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
        return response.data as SurveysResponse;
      } catch (error: unknown) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        throw new Error(axiosError?.response?.data?.message || "Failed to load surveys");
      }
    },
  });
}

/**
 * Hook to fetch survey details (with legacy format transformation)
 * GET /v2/surveys/{surveyId}
 */
export function useSurveyDetail(surveyId: string, traineeId?: string) {
  return useQuery({
    queryKey: surveyQueryKeys.detail(surveyId, traineeId),
    queryFn: async () => {
      try {
        const token = getCookie("token");
        let url = `${process.env.NEXT_PUBLIC_API}/v2/surveys/${surveyId}`;
        if (traineeId) {
          url += `?traineeId=${traineeId}`;
        }
        
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const data = response.data as SurveyDetailApiResponse;
        
        // Transform to legacy format for backward compatibility
        const legacyFormat: SurveyDetailResponse_Legacy = {
          code: data.code,
          message: data.message,
          survey: {
            id: data.survey.id,
            name: data.survey.name,
            type: data.survey.type,
            description: data.survey.description,
            sessions: null,
            sections: data.survey.sections.map(section => ({
              id: section.id,
              title: section.title,
              description: section.description,
              questions: section.entries.map(entry => ({
                id: entry.id,
                questionNumber: entry.questionNumber,
                question: entry.question,
                questionType: entry.questionType,
                questionImageUrl: entry.questionImageUrl || undefined,
                choices: entry.choices.map(c => ({
                  order: c.choiceOrder,
                  choiceText: c.choiceText,
                  choiceImageUrl: c.choiceImageUrl || undefined
                })),
                allowMultipleAnswers: entry.questionType === 'CHECKBOX',
                allowOtherAnswer: entry.hasTextInput || false,
                rows: entry.gridRows.map(r => r.rowText),
                required: entry.isRequired,
                followUp: entry.isFollowUp,
                parentQuestionNumber: null,
                parentChoice: null,
                isFollowUp: entry.isFollowUp,
                parentQuestionId: entry.parentQuestionId,
                triggerChoiceIds: entry.triggerChoiceIds,
              }))
            }))
          }
        };
        
        return legacyFormat;
      } catch (error: unknown) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        throw new Error(axiosError?.response?.data?.message || "Failed to load survey details");
      }
    },
    enabled: !!surveyId,
  });
}

/**
 * Hook to fetch survey details in NEW format (for new components)
 * GET /v2/surveys/{surveyId}
 */
export function useSurveyDetailNew(surveyId: string) {
  return useQuery({
    queryKey: [...surveyQueryKeys.detail(surveyId), 'new'] as const,
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


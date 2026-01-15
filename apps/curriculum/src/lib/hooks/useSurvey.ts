import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { getCookie } from "@curriculum-services/auth";
import { toast } from "sonner";

// =============================================================================
// Re-export new types from survey-types.ts
// =============================================================================
export * from "./survey-types";

import {
  SurveyType,
  SurveyQuestionType,
  SurveyEntryForm,
  SurveyChoiceForm,
  SurveySectionForm,
  SurveyEntryPayload,
  SurveySectionPayload,
  CreateSurveyPayload,
  SurveyDetailResponse,
  SurveySummary,
  SurveysApiResponse,
  SurveyDetailApiResponse,
  ApiErrorResponse,
  surveyQueryKeys,
  emptyChoice,
  getDefaultQuestionFields,
  validateSurveyEntry,
  flattenEntriesForPayload,
  transformResponseToForm,
} from "./survey-types";

// =============================================================================
// Legacy Types (for backward compatibility during migration)
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

export interface AddSurveyEntryData {
  question: string;
  questionImage?: string;
  questionImageFile?: File;
  questionType: QuestionType;
  questionNumber?: number;
  choices: {
    choice: string;
    choiceImage?: string;
    choiceImageFile?: File;
  }[];
  allowTextAnswer: boolean;
  rows: string[];
  parentQuestionNumber?: number;
  parentChoice?: string;
  followUp?: boolean;
  required: boolean;
}

export interface SubmitAnswerData {
  answer: string;
  traineeId: string;
}

export interface SurveySectionsResponse {
  code: string;
  message: string;
  sections: SurveySection[];
}

export interface AddSectionData {
  title: string;
  description?: string;
  surveyEntries: CreateSurveyEntry[];
}

// =============================================================================
// Helper exports
// =============================================================================
export { 
  getDefaultQuestionFields as getDefaultAddQuestionFields,
  validateSurveyEntry as validateCreateSurveyEntry,
};

// =============================================================================
// Legacy helper for backward compatibility
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
 * Hook to fetch survey details including all questions (NEW API format)
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
        
        // The new API returns sections with "entries" instead of "questions"
        // Transform to match the expected format
        const data = response.data as SurveyDetailApiResponse;
        
        // Also provide legacy format for backward compatibility
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
                parentQuestionNumber: null, // New API uses parentQuestionId instead
                parentChoice: null, // New API uses triggerChoiceIds instead
                // New fields
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
 */
export function useSurveyDetailNew(surveyId: string) {
  return useQuery({
    queryKey: [...surveyQueryKeys.detail(surveyId), 'new'] as const,
    queryFn: async () => {
      try {
        const token = getCookie("token");
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API}/survey/${surveyId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        const data = response.data as SurveyDetailApiResponse;
        return {
          ...data,
          // Also provide transformed form state for easy loading
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

/**
 * Hook to fetch survey sections (legacy compatibility)
 */
export function useSurveySections(surveyId: string) {
  return useQuery({
    queryKey: surveyQueryKeys.sections(surveyId),
    queryFn: async () => {
      try {
        const token = getCookie("token");
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API}/survey-section/survey/${surveyId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        return response.data as SurveySectionsResponse;
      } catch (error: unknown) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        throw new Error(axiosError?.response?.data?.message || "Failed to load survey sections");
      }
    },
    enabled: !!surveyId,
  });
}

// =============================================================================
// CREATE SURVEY MUTATION (NEW API FORMAT)
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
        // Server IDs for editing
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
 * Hook for creating a new survey with NEW API format
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

/**
 * Hook for creating a new survey (LEGACY - for backward compatibility)
 */
export function useCreateSurvey(trainingId: string) {
  const queryClient = useQueryClient();

  const createSurveyMutation = useMutation({
    mutationFn: async (surveyData: CreateSurveyData) => {
      const token = getCookie("token");

      // Convert legacy format to new format
      const payload: CreateSurveyPayload = {
        name: surveyData.name,
        type: surveyData.type,
        description: surveyData.description,
        sections: surveyData.sections.map((sec, si) => {
          // Flatten entries including follow-ups
          const entries: SurveyEntryPayload[] = [];
          let questionNumber = 1;
          
          sec.surveyEntries.forEach((entry) => {
            const clientId = crypto.randomUUID();
            const choices = (entry.choices || []).map((c, ci) => ({
              clientId: crypto.randomUUID(),
              choiceOrder: String.fromCharCode(65 + ci),
              choiceText: c.choice || "",
              choiceImage: c.choiceImage
            }));
            
            entries.push({
              clientId,
              question: entry.question,
              questionNumber: entry.questionNumber || questionNumber++,
              questionImage: entry.questionImage,
              questionType: entry.questionType,
              isRequired: entry.required,
              hasTextInput: entry.allowTextAnswer || false,
              choices,
              gridRows: (entry.rows || []).map((r, ri) => ({
                rowNumber: ri + 1,
                rowText: r,
                rowImage: undefined
              })),
              isFollowUp: entry.followUp || false,
              parentQuestionClientId: undefined,
              triggerChoiceClientIds: undefined,
            });
          });
          
          return {
            title: sec.title,
            description: sec.description,
            sectionNumber: si + 1,
            entries
          };
        })
      };

      const formData = buildSurveyFormData(payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/survey/training/${trainingId}`,
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

  return {
    createSurvey: createSurveyMutation.mutate,
    isLoading: createSurveyMutation.isPending,
    isSuccess: createSurveyMutation.isSuccess,
    isError: createSurveyMutation.isError,
    error: createSurveyMutation.error,
  };
}

// =============================================================================
// UPDATE HOOKS
// =============================================================================

/**
 * Hook for updating survey name and description only
 */
export function useUpdateSurvey() {
  const queryClient = useQueryClient();

  const updateSurveyMutation = useMutation({
    mutationFn: async ({ surveyId, data }: { surveyId: string; data: UpdateSurveyData }) => {
      const token = getCookie("token");
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API}/survey/${surveyId}`,
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
    isLoading: updateSurveyMutation.isPending,
    isSuccess: updateSurveyMutation.isSuccess,
    isError: updateSurveyMutation.isError,
    error: updateSurveyMutation.error,
  };
}

/**
 * Hook for updating a specific question (survey entry)
 */
export function useUpdateSurveyEntry() {
  const queryClient = useQueryClient();

  const updateSurveyEntryMutation = useMutation({
    mutationFn: async ({
      surveyEntryId,
      questionData,
    }: {
      surveyEntryId: string;
      questionData: Partial<UpdateSurveyEntryData>;
    }) => {
      const token = getCookie("token");
      
      const formData = new FormData();
      
      if (questionData.question !== undefined) {
        formData.append('question', questionData.question);
      }
      if (questionData.questionType !== undefined) {
        formData.append('questionType', questionData.questionType);
      }
      if (questionData.allowOtherAnswer !== undefined) {
        formData.append('allowOtherAnswer', String(!!questionData.allowOtherAnswer));
      }
      if (questionData.isRequired !== undefined) {
        formData.append('isRequired', String(!!questionData.isRequired));
      }
      
      if (questionData.parentQuestionNumber != null) {
        formData.append('parentQuestionNumber', String(questionData.parentQuestionNumber));
      }
      if (questionData.parentChoice) {
        formData.append('parentChoice', questionData.parentChoice);
      }
      if (questionData.isFollowUp != null) {
        formData.append('isFollowUp', String(!!questionData.isFollowUp));
      }
      
      if (questionData.rows !== undefined) {
        questionData.rows.forEach((row, i) => {
          formData.append(`rows[${i}]`, row);
        });
      }
      
      if (questionData.choices !== undefined) {
        questionData.choices.forEach((choice, i) => {
          formData.append(`choices[${i}].choice`, choice.choice);
          if (choice.choiceImageFile instanceof File) {
            formData.append(`choices[${i}].choiceImage`, choice.choiceImageFile);
          } else if (choice.choiceImage) {
            formData.append(`choices[${i}].choiceImage`, choice.choiceImage);
          }
        });
      }
      
      if (questionData.questionImageFile instanceof File) {
        formData.append('questionImage', questionData.questionImageFile);
      } else if (questionData.questionImage !== undefined) {
        formData.append('questionImage', questionData.questionImage);
      }
      
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/survey-entry/${surveyEntryId}`,
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
      toast.success(data.message || "Question updated successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to update question");
    },
  });

  return {
    updateSurveyEntry: updateSurveyEntryMutation.mutate,
    isLoading: updateSurveyEntryMutation.isPending,
    isSuccess: updateSurveyEntryMutation.isSuccess,
    isError: updateSurveyEntryMutation.isError,
    error: updateSurveyEntryMutation.error,
  };
}

/**
 * Hook for updating a survey section
 */
export function useUpdateSurveySection() {
  const queryClient = useQueryClient();

  const updateSurveySectionMutation = useMutation({
    mutationFn: async ({ sectionId, title, description }: { sectionId: string; title: string; description?: string }) => {
      const token = getCookie("token");
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API}/survey-section/${sectionId}`,
        { title, description },
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
    isLoading: updateSurveySectionMutation.isPending,
    isSuccess: updateSurveySectionMutation.isSuccess,
    isError: updateSurveySectionMutation.isError,
    error: updateSurveySectionMutation.error,
  };
}

// =============================================================================
// ADD HOOKS
// =============================================================================

/**
 * Hook for adding a new question to a section
 */
export function useAddQuestionToSection() {
  const queryClient = useQueryClient();

  const addQuestionToSectionMutation = useMutation({
    mutationFn: async ({
      sectionId,
      questionData,
    }: {
      sectionId: string;
      questionData: AddSurveyEntryData;
    }) => {
      const token = getCookie("token");
      
      const formData = new FormData();
      
      formData.append('question', questionData.question);
      formData.append('questionType', questionData.questionType);
      formData.append('allowTextAnswer', String(!!questionData.allowTextAnswer));
      formData.append('required', String(!!questionData.required));
      
      if (questionData.questionNumber != null) {
        formData.append('questionNumber', String(questionData.questionNumber));
      }
      
      if (questionData.parentQuestionNumber != null) {
        formData.append('parentQuestionNumber', String(questionData.parentQuestionNumber));
      }
      if (questionData.parentChoice) {
        formData.append('parentChoice', questionData.parentChoice);
      }
      if (questionData.followUp != null) {
        formData.append('followUp', String(!!questionData.followUp));
      }
      
      questionData.rows.forEach((row, i) => {
        formData.append(`rows[${i}]`, row);
      });
      
      questionData.choices.forEach((choice, i) => {
        formData.append(`choices[${i}].choice`, choice.choice);
        if (choice.choiceImageFile instanceof File) {
          formData.append(`choices[${i}].choiceImage`, choice.choiceImageFile);
        } else if (choice.choiceImage) {
          formData.append(`choices[${i}].choiceImage`, choice.choiceImage);
        }
      });
      
      if (questionData.questionImageFile instanceof File) {
        formData.append('questionImage', questionData.questionImageFile);
      } else if (questionData.questionImage) {
        formData.append('questionImage', questionData.questionImage);
      }
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/survey-entry/survey-section/${sectionId}`,
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
      toast.success(data.message || "Question added successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to add question");
    },
  });

  return {
    addQuestionToSection: addQuestionToSectionMutation.mutate,
    isLoading: addQuestionToSectionMutation.isPending,
    isSuccess: addQuestionToSectionMutation.isSuccess,
    isError: addQuestionToSectionMutation.isError,
    error: addQuestionToSectionMutation.error,
  };
}

/**
 * Hook for adding a new section to an existing survey
 */
export function useAddSectionToSurvey() {
  const queryClient = useQueryClient();

  const addSectionMutation = useMutation({
    mutationFn: async ({
      surveyId,
      sectionData,
    }: {
      surveyId: string;
      sectionData: AddSectionData;
    }) => {
      const token = getCookie("token");
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/survey-section/survey/${surveyId}`,
        sectionData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Section added successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to add section");
    },
  });

  return {
    addSection: addSectionMutation.mutate,
    isLoading: addSectionMutation.isPending,
    isSuccess: addSectionMutation.isSuccess,
    isError: addSectionMutation.isError,
    error: addSectionMutation.error,
  };
}

/**
 * Hook for adding a choice to an existing survey question
 */
export function useAddChoice() {
  const queryClient = useQueryClient();

  const addChoiceMutation = useMutation({
    mutationFn: async ({
      surveyEntryId,
      choiceData,
    }: {
      surveyEntryId: string;
      choiceData: {
        choice: string;
        choiceImage?: string;
        choiceImageFile?: File;
      };
    }) => {
      const token = getCookie("token");
      
      const formData = new FormData();
      formData.append('choice', choiceData.choice);
      
      if (choiceData.choiceImageFile instanceof File) {
        formData.append('choiceImage', choiceData.choiceImageFile);
      } else if (choiceData.choiceImage) {
        formData.append('choiceImage', choiceData.choiceImage);
      }
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/survey-entry/${surveyEntryId}/add-choice`,
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
      toast.success(data.message || "Choice added successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to add choice");
    },
  });

  return {
    addChoice: addChoiceMutation.mutate,
    isLoading: addChoiceMutation.isPending,
    isSuccess: addChoiceMutation.isSuccess,
    isError: addChoiceMutation.isError,
    error: addChoiceMutation.error,
  };
}

// =============================================================================
// DELETE HOOKS
// =============================================================================

/**
 * Hook for deleting a survey
 */
export function useDeleteSurvey() {
  const queryClient = useQueryClient();

  const deleteSurveyMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const token = getCookie("token");
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/survey/${surveyId}`,
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
    isLoading: deleteSurveyMutation.isPending,
    isSuccess: deleteSurveyMutation.isSuccess,
    isError: deleteSurveyMutation.isError,
    error: deleteSurveyMutation.error,
  };
}

/**
 * Hook for deleting a specific survey entry (question)
 */
export function useDeleteSurveyEntry() {
  const queryClient = useQueryClient();

  const deleteSurveyEntryMutation = useMutation({
    mutationFn: async (surveyEntryId: string) => {
      const token = getCookie("token");
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/survey-entry/${surveyEntryId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Question deleted successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to delete question");
    },
  });

  return {
    deleteSurveyEntry: deleteSurveyEntryMutation.mutate,
    isLoading: deleteSurveyEntryMutation.isPending,
    isSuccess: deleteSurveyEntryMutation.isSuccess,
    isError: deleteSurveyEntryMutation.isError,
    error: deleteSurveyEntryMutation.error,
  };
}

/**
 * Hook for deleting a survey section
 */
export function useDeleteSurveySection() {
  const queryClient = useQueryClient();

  const deleteSurveySectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const token = getCookie("token");
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/survey-section/${sectionId}`,
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
    isLoading: deleteSurveySectionMutation.isPending,
    isSuccess: deleteSurveySectionMutation.isSuccess,
    isError: deleteSurveySectionMutation.isError,
    error: deleteSurveySectionMutation.error,
  };
}

/**
 * Hook for removing a choice from an existing survey question
 */
export function useRemoveChoice() {
  const queryClient = useQueryClient();

  const removeChoiceMutation = useMutation({
    mutationFn: async ({
      surveyEntryId,
      order,
    }: {
      surveyEntryId: string;
      order: string;
    }) => {
      const token = getCookie("token");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/survey-entry/${surveyEntryId}/remove-choice?order=${order}`,
        "",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Choice removed successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to remove choice");
    },
  });

  return {
    removeChoice: removeChoiceMutation.mutate,
    isLoading: removeChoiceMutation.isPending,
    isSuccess: removeChoiceMutation.isSuccess,
    isError: removeChoiceMutation.isError,
    error: removeChoiceMutation.error,
  };
}

// =============================================================================
// OTHER HOOKS
// =============================================================================

/**
 * Hook for submitting an answer to a survey question (trainee side)
 */
export function useSubmitSurveyAnswer() {
  const queryClient = useQueryClient();

  const submitAnswerMutation = useMutation({
    mutationFn: async ({
      surveyEntryId,
      answerData,
    }: {
      surveyEntryId: string;
      answerData: SubmitAnswerData;
    }) => {
      const token = getCookie("token");
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/survey/entry/${surveyEntryId}/answer`,
        answerData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Answer submitted successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to submit answer");
    },
  });

  return {
    submitAnswer: submitAnswerMutation.mutate,
    isLoading: submitAnswerMutation.isPending,
    isSuccess: submitAnswerMutation.isSuccess,
    isError: submitAnswerMutation.isError,
    error: submitAnswerMutation.error,
  };
}

/**
 * Hook for assigning a survey to a session
 */
export function useAssignSurveyToSession() {
  const queryClient = useQueryClient();

  const assignSurveyMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const token = getCookie("token");
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/survey/${surveyId}/assign-session`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Survey assigned to session successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to assign survey to session");
    },
  });

  return {
    assignSurveyToSession: assignSurveyMutation.mutate,
    isLoading: assignSurveyMutation.isPending,
    isSuccess: assignSurveyMutation.isSuccess,
    isError: assignSurveyMutation.isError,
    error: assignSurveyMutation.error,
  };
}

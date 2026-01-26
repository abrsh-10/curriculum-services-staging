import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { getCookie } from "@curriculum-services/auth";
import { toast } from "sonner";
import { 
  surveyQueryKeys,
  SurveyQuestionType,
  ApiErrorResponse 
} from "../survey-types";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Update survey entry data type for v2 API
 * When changing question type, include choices/gridRows to update in one call
 */
export interface UpdateSurveyEntryDataV2 {
  question: string;
  questionNumber?: number;
  questionImage?: string;
  questionImageFile?: File;
  questionType: SurveyQuestionType;
  isRequired: boolean;
  // Include choices when changing question type to RADIO/CHECKBOX
  choices?: {
    clientId: string;
    choiceOrder?: string;
    choiceText: string;
    choiceImage?: string;
    choiceImageFile?: File;
    hasTextInput?: boolean;
  }[];
  // Include gridRows when changing question type to GRID
  gridRows?: {
    rowNumber: number;
    rowText: string;
    rowImage?: string;
    rowImageFile?: File;
  }[];
}

/**
 * Update choice data type for v2 API
 */
export interface UpdateChoiceDataV2 {
  clientId?: string;
  choiceOrder: string;
  choiceText: string;
  choiceImage?: string;
  choiceImageFile?: File;
  hasTextInput: boolean;
}

/**
 * Update grid row data type for v2 API
 */
export interface UpdateGridRowDataV2 {
  rowNumber: number;
  rowText: string;
  rowImage?: string;
  rowImageFile?: File;
}

/**
 * Add entry (question) payload for v2 API
 */
export interface AddEntryPayloadV2 {
  clientId: string;
  question: string;
  questionNumber?: number;
  questionImage?: string;
  questionImageFile?: File;
  questionType: SurveyQuestionType;
  isRequired: boolean;
  isFollowUp?: boolean;
  parentQuestionClientId?: string;
  triggerChoiceClientIds?: string[];
  parentQuestionId?: string;
  triggerChoiceIds?: string[];
  choices: {
    clientId: string;
    choiceOrder?: string;
    choiceText: string;
    choiceImage?: string;
    choiceImageFile?: File;
    hasTextInput?: boolean;
  }[];
  gridRows: {
    rowNumber: number;
    rowText: string;
    rowImage?: string;
    rowImageFile?: File;
  }[];
}

/**
 * Add choice payload for v2 API
 */
export interface AddChoicePayloadV2 {
  clientId: string;
  choiceOrder?: string;
  choiceText: string;
  choiceImage?: string;
  choiceImageFile?: File;
  hasTextInput?: boolean;
}

/**
 * Add grid row payload for v2 API
 */
export interface AddGridRowPayloadV2 {
  rowNumber: number;
  rowText: string;
  rowImage?: string;
  rowImageFile?: File;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build FormData for adding entry to section
 */
function buildAddEntryFormData(entry: AddEntryPayloadV2): FormData {
  const formData = new FormData();
  
  formData.append('clientId', entry.clientId);
  formData.append('question', entry.question);
  formData.append('questionType', entry.questionType);
  formData.append('isRequired', String(entry.isRequired));
  formData.append('isFollowUp', String(entry.isFollowUp || false));
  
  if (entry.questionNumber != null) {
    formData.append('questionNumber', String(entry.questionNumber));
  }
  
  // Follow-up references
  if (entry.isFollowUp) {
    if (entry.parentQuestionClientId) {
      formData.append('parentQuestionClientId', entry.parentQuestionClientId);
    }
    if (entry.triggerChoiceClientIds && entry.triggerChoiceClientIds.length > 0) {
      entry.triggerChoiceClientIds.forEach((id, idx) => {
        formData.append(`triggerChoiceClientIds[${idx}]`, id);
      });
    }
    if (entry.parentQuestionId) {
      formData.append('parentQuestionId', entry.parentQuestionId);
    }
    if (entry.triggerChoiceIds && entry.triggerChoiceIds.length > 0) {
      entry.triggerChoiceIds.forEach((id, idx) => {
        formData.append(`triggerChoiceIds[${idx}]`, id);
      });
    }
  }
  
  // Choices
  entry.choices.forEach((choice, ci) => {
    formData.append(`choices[${ci}].clientId`, choice.clientId);
    formData.append(`choices[${ci}].choiceText`, choice.choiceText);
    if (choice.choiceOrder) {
      formData.append(`choices[${ci}].choiceOrder`, choice.choiceOrder);
    }
    formData.append(`choices[${ci}].hasTextInput`, String(choice.hasTextInput || false));
    
    // Choice image - only send if it's a File
    if (choice.choiceImageFile instanceof File) {
      formData.append(`choices[${ci}].choiceImage`, choice.choiceImageFile);
    }
  });
  
  // Grid rows
  entry.gridRows.forEach((row, ri) => {
    formData.append(`gridRows[${ri}].rowNumber`, String(row.rowNumber));
    formData.append(`gridRows[${ri}].rowText`, row.rowText);
    // Row image - only send if it's a File
    if (row.rowImageFile instanceof File) {
      formData.append(`gridRows[${ri}].rowImage`, row.rowImageFile);
    }
  });
  
  // Question image - only send if it's a File
  if (entry.questionImageFile instanceof File) {
    formData.append('questionImage', entry.questionImageFile);
  }
  
  return formData;
}

// =============================================================================
// ADD HOOKS
// =============================================================================

/**
 * Hook for adding a new entry (question) to an existing section (v2 API)
 * POST /v2/survey-entries/section/{sectionId}
 */
export function useAddEntryToSection() {
  const queryClient = useQueryClient();

  const addEntryMutation = useMutation({
    mutationFn: async ({
      sectionId,
      entryData,
    }: {
      sectionId: string;
      entryData: AddEntryPayloadV2;
    }) => {
      const token = getCookie("token");
      const formData = buildAddEntryFormData(entryData);
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/section/${sectionId}`,
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
    addEntry: addEntryMutation.mutate,
    addEntryAsync: addEntryMutation.mutateAsync,
    isLoading: addEntryMutation.isPending,
    isSuccess: addEntryMutation.isSuccess,
    isError: addEntryMutation.isError,
    error: addEntryMutation.error,
  };
}

/**
 * Hook for adding a choice to an existing entry (v2 API)
 * POST /v2/survey-entries/{entryId}/choices
 */
export function useAddChoice() {
  const queryClient = useQueryClient();

  const addChoiceMutation = useMutation({
    mutationFn: async ({
      entryId,
      choiceData,
    }: {
      entryId: string;
      choiceData: AddChoicePayloadV2;
    }) => {
      const token = getCookie("token");
      
      const formData = new FormData();
      formData.append('clientId', choiceData.clientId);
      formData.append('choiceText', choiceData.choiceText);
      if (choiceData.choiceOrder) {
        formData.append('choiceOrder', choiceData.choiceOrder);
      }
      formData.append('hasTextInput', String(choiceData.hasTextInput || false));
      
      // Only send image if it's a File
      if (choiceData.choiceImageFile instanceof File) {
        formData.append('choiceImage', choiceData.choiceImageFile);
      }
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/${entryId}/choices`,
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
    addChoiceAsync: addChoiceMutation.mutateAsync,
    isLoading: addChoiceMutation.isPending,
    isSuccess: addChoiceMutation.isSuccess,
    isError: addChoiceMutation.isError,
    error: addChoiceMutation.error,
  };
}

/**
 * Hook for adding a grid row to an existing entry (v2 API)
 * POST /v2/survey-entries/{entryId}/grid-rows
 */
export function useAddGridRow() {
  const queryClient = useQueryClient();

  const addGridRowMutation = useMutation({
    mutationFn: async ({
      entryId,
      rowData,
    }: {
      entryId: string;
      rowData: AddGridRowPayloadV2;
    }) => {
      const token = getCookie("token");
      
      const formData = new FormData();
      formData.append('rowNumber', String(rowData.rowNumber));
      formData.append('rowText', rowData.rowText);
      
      // Only send image if it's a File
      if (rowData.rowImageFile instanceof File) {
        formData.append('rowImage', rowData.rowImageFile);
      }
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/${entryId}/grid-rows`,
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
      toast.success(data.message || "Grid row added successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to add grid row");
    },
  });

  return {
    addGridRow: addGridRowMutation.mutate,
    addGridRowAsync: addGridRowMutation.mutateAsync,
    isLoading: addGridRowMutation.isPending,
    isSuccess: addGridRowMutation.isSuccess,
    isError: addGridRowMutation.isError,
    error: addGridRowMutation.error,
  };
}

// =============================================================================
// UPDATE HOOKS
// =============================================================================

/**
 * Hook for updating a survey entry (question)
 * PUT /v2/survey-entries/{entryId}
 * 
 * When changing question type, include choices/gridRows to update everything in one call
 */
export function useUpdateSurveyEntry() {
  const queryClient = useQueryClient();

  const updateSurveyEntryMutation = useMutation({
    mutationFn: async ({
      entryId,
      data,
    }: {
      entryId: string;
      data: Partial<UpdateSurveyEntryDataV2>;
    }) => {
      const token = getCookie("token");
      
      const formData = new FormData();
      
      if (data.question !== undefined) {
        formData.append('question', data.question);
      }
      if (data.questionNumber !== undefined) {
        formData.append('questionNumber', String(data.questionNumber));
      }
      if (data.questionType !== undefined) {
        formData.append('questionType', data.questionType);
      }
      if (data.isRequired !== undefined) {
        formData.append('isRequired', String(data.isRequired));
      }
      
      // Handle question image - ONLY send when uploading a new file
      if (data.questionImageFile instanceof File) {
        formData.append('questionImage', data.questionImageFile);
      }
      
      // Include choices when provided (e.g., when changing question type to RADIO/CHECKBOX)
      if (data.choices && data.choices.length > 0) {
        data.choices.forEach((choice, ci) => {
          formData.append(`choices[${ci}].clientId`, choice.clientId);
          formData.append(`choices[${ci}].choiceText`, choice.choiceText);
          if (choice.choiceOrder) {
            formData.append(`choices[${ci}].choiceOrder`, choice.choiceOrder);
          }
          formData.append(`choices[${ci}].hasTextInput`, String(choice.hasTextInput || false));
          
          // Choice image - only send if it's a File
          if (choice.choiceImageFile instanceof File) {
            formData.append(`choices[${ci}].choiceImage`, choice.choiceImageFile);
          }
        });
      }
      
      // Include gridRows when provided (e.g., when changing question type to GRID)
      if (data.gridRows && data.gridRows.length > 0) {
        data.gridRows.forEach((row, ri) => {
          formData.append(`gridRows[${ri}].rowNumber`, String(row.rowNumber));
          formData.append(`gridRows[${ri}].rowText`, row.rowText);
          // Row image - only send if it's a File
          if (row.rowImageFile instanceof File) {
            formData.append(`gridRows[${ri}].rowImage`, row.rowImageFile);
          }
        });
      }
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/${entryId}`,
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
    updateSurveyEntryAsync: updateSurveyEntryMutation.mutateAsync,
    isLoading: updateSurveyEntryMutation.isPending,
    isSuccess: updateSurveyEntryMutation.isSuccess,
    isError: updateSurveyEntryMutation.isError,
    error: updateSurveyEntryMutation.error,
  };
}

/**
 * Hook for updating follow-up trigger choices
 * PUT /v2/survey-entries/{followUpEntryId}/update-triggers
 */
export function useUpdateFollowUpTriggers() {
  const queryClient = useQueryClient();

  const updateTriggersMutation = useMutation({
    mutationFn: async ({
      followUpEntryId,
      triggerChoiceIds,
    }: {
      followUpEntryId: string;
      triggerChoiceIds: string[];
    }) => {
      const token = getCookie("token");
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/${followUpEntryId}/update-triggers`,
        triggerChoiceIds,
        {
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Follow-up triggers updated successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to update follow-up triggers");
    },
  });

  return {
    updateTriggers: updateTriggersMutation.mutate,
    updateTriggersAsync: updateTriggersMutation.mutateAsync,
    isLoading: updateTriggersMutation.isPending,
    isSuccess: updateTriggersMutation.isSuccess,
    isError: updateTriggersMutation.isError,
    error: updateTriggersMutation.error,
  };
}

/**
 * Hook for updating a choice
 * PUT /v2/survey-entries/choices/{choiceId}
 */
export function useUpdateChoice() {
  const queryClient = useQueryClient();

  const updateChoiceMutation = useMutation({
    mutationFn: async ({
      choiceId,
      data,
    }: {
      choiceId: string;
      data: UpdateChoiceDataV2;
    }) => {
      const token = getCookie("token");
      
      const formData = new FormData();
      
      if (data.clientId) {
        formData.append('clientId', data.clientId);
      }
      formData.append('choiceOrder', data.choiceOrder);
      formData.append('choiceText', data.choiceText);
      formData.append('hasTextInput', String(data.hasTextInput));
      
      // Handle choice image - ONLY send when uploading a new file
      if (data.choiceImageFile instanceof File) {
        formData.append('choiceImage', data.choiceImageFile);
      }
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/choices/${choiceId}`,
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
      toast.success(data.message || "Choice updated successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to update choice");
    },
  });

  return {
    updateChoice: updateChoiceMutation.mutate,
    updateChoiceAsync: updateChoiceMutation.mutateAsync,
    isLoading: updateChoiceMutation.isPending,
    isSuccess: updateChoiceMutation.isSuccess,
    isError: updateChoiceMutation.isError,
    error: updateChoiceMutation.error,
  };
}

/**
 * Hook for updating a grid row
 * PUT /v2/survey-entries/grid-rows/{gridRowId}
 */
export function useUpdateGridRow() {
  const queryClient = useQueryClient();

  const updateGridRowMutation = useMutation({
    mutationFn: async ({
      gridRowId,
      data,
    }: {
      gridRowId: string;
      data: UpdateGridRowDataV2;
    }) => {
      const token = getCookie("token");
      
      const formData = new FormData();
      
      formData.append('rowNumber', String(data.rowNumber));
      formData.append('rowText', data.rowText);
      
      // Handle row image - ONLY send when uploading a new file
      if (data.rowImageFile instanceof File) {
        formData.append('rowImage', data.rowImageFile);
      }
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/grid-rows/${gridRowId}`,
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
      toast.success(data.message || "Grid row updated successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to update grid row");
    },
  });

  return {
    updateGridRow: updateGridRowMutation.mutate,
    updateGridRowAsync: updateGridRowMutation.mutateAsync,
    isLoading: updateGridRowMutation.isPending,
    isSuccess: updateGridRowMutation.isSuccess,
    isError: updateGridRowMutation.isError,
    error: updateGridRowMutation.error,
  };
}

// =============================================================================
// REORDER HOOKS
// =============================================================================

/**
 * Hook for reordering a survey entry (question)
 * PATCH /v2/survey-entries/{entryId}/reorder?newPosition={newPosition}
 */
export function useReorderSurveyEntry() {
  const queryClient = useQueryClient();

  const reorderEntryMutation = useMutation({
    mutationFn: async ({
      entryId,
      newPosition,
    }: {
      entryId: string;
      newPosition: number;
    }) => {
      const token = getCookie("token");
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/${entryId}/reorder?newPosition=${newPosition}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Question reordered successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to reorder question");
    },
  });

  return {
    reorderEntry: reorderEntryMutation.mutate,
    reorderEntryAsync: reorderEntryMutation.mutateAsync,
    isLoading: reorderEntryMutation.isPending,
    isSuccess: reorderEntryMutation.isSuccess,
    isError: reorderEntryMutation.isError,
    error: reorderEntryMutation.error,
  };
}

/**
 * Hook for reordering a choice
 * PATCH /v2/survey-entries/choices/{choiceId}/reorder?newOrder={newOrder}
 */
export function useReorderChoice() {
  const queryClient = useQueryClient();

  const reorderChoiceMutation = useMutation({
    mutationFn: async ({
      choiceId,
      newOrder,
    }: {
      choiceId: string;
      newOrder: string;
    }) => {
      const token = getCookie("token");
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/choices/${choiceId}/reorder?newOrder=${encodeURIComponent(newOrder)}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Choice reordered successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to reorder choice");
    },
  });

  return {
    reorderChoice: reorderChoiceMutation.mutate,
    reorderChoiceAsync: reorderChoiceMutation.mutateAsync,
    isLoading: reorderChoiceMutation.isPending,
    isSuccess: reorderChoiceMutation.isSuccess,
    isError: reorderChoiceMutation.isError,
    error: reorderChoiceMutation.error,
  };
}

/**
 * Hook for reordering a grid row
 * PATCH /v2/survey-entries/grid-rows/{gridRowId}/reorder?newPosition={newPosition}
 */
export function useReorderGridRow() {
  const queryClient = useQueryClient();

  const reorderGridRowMutation = useMutation({
    mutationFn: async ({
      gridRowId,
      newPosition,
    }: {
      gridRowId: string;
      newPosition: number;
    }) => {
      const token = getCookie("token");
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/grid-rows/${gridRowId}/reorder?newPosition=${newPosition}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Grid row reordered successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to reorder grid row");
    },
  });

  return {
    reorderGridRow: reorderGridRowMutation.mutate,
    reorderGridRowAsync: reorderGridRowMutation.mutateAsync,
    isLoading: reorderGridRowMutation.isPending,
    isSuccess: reorderGridRowMutation.isSuccess,
    isError: reorderGridRowMutation.isError,
    error: reorderGridRowMutation.error,
  };
}

// =============================================================================
// FOLLOW-UP LINK/UNLINK HOOKS
// =============================================================================

/**
 * Hook for unlinking a follow-up question from its parent
 * DELETE /v2/survey-entries/{followUpEntryId}/unlink-followup
 * 
 * Use this when user unchecks the "follow-up" checkbox on an existing follow-up question.
 * This removes the follow-up relationship but keeps the question as a standalone.
 */
export function useUnlinkFollowUp() {
  const queryClient = useQueryClient();

  const unlinkFollowUpMutation = useMutation({
    mutationFn: async (followUpEntryId: string) => {
      const token = getCookie("token");
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/${followUpEntryId}/unlink-followup`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Follow-up question unlinked successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to unlink follow-up question");
    },
  });

  return {
    unlinkFollowUp: unlinkFollowUpMutation.mutate,
    unlinkFollowUpAsync: unlinkFollowUpMutation.mutateAsync,
    isLoading: unlinkFollowUpMutation.isPending,
    isSuccess: unlinkFollowUpMutation.isSuccess,
    isError: unlinkFollowUpMutation.isError,
    error: unlinkFollowUpMutation.error,
  };
}

/**
 * Hook for linking a question as a follow-up to a parent question
 * POST /v2/survey-entries/{followUpEntryId}/link-followup?parentQuestionId={id}&triggerChoiceIds={ids}
 * 
 * Use this when:
 * - User checks a choice to add a follow-up to it
 * - User changes the trigger choices for an existing follow-up
 */
export function useLinkFollowUp() {
  const queryClient = useQueryClient();

  const linkFollowUpMutation = useMutation({
    mutationFn: async ({
      followUpEntryId,
      parentQuestionId,
      triggerChoiceIds,
    }: {
      followUpEntryId: string;
      parentQuestionId: string;
      triggerChoiceIds: string[];
    }) => {
      const token = getCookie("token");
      
      // Build query string with trigger choice IDs
      const triggerParams = triggerChoiceIds.map(id => `triggerChoiceIds=${id}`).join('&');
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/${followUpEntryId}/link-followup?parentQuestionId=${parentQuestionId}&${triggerParams}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Follow-up question linked successfully");
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error(error.response?.data?.message || "Failed to link follow-up question");
    },
  });

  return {
    linkFollowUp: linkFollowUpMutation.mutate,
    linkFollowUpAsync: linkFollowUpMutation.mutateAsync,
    isLoading: linkFollowUpMutation.isPending,
    isSuccess: linkFollowUpMutation.isSuccess,
    isError: linkFollowUpMutation.isError,
    error: linkFollowUpMutation.error,
  };
}

// =============================================================================
// DELETE HOOKS
// =============================================================================

/**
 * Hook for deleting a specific survey entry (question) - v2 API
 * DELETE /v2/survey-entries/{entryId}
 * Deletes an entry and all dependent follow-up questions.
 * Cannot delete if survey has been answered.
 */
export function useDeleteSurveyEntry() {
  const queryClient = useQueryClient();

  const deleteSurveyEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const token = getCookie("token");
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/${entryId}`,
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
    deleteSurveyEntryAsync: deleteSurveyEntryMutation.mutateAsync,
    isLoading: deleteSurveyEntryMutation.isPending,
    isSuccess: deleteSurveyEntryMutation.isSuccess,
    isError: deleteSurveyEntryMutation.isError,
    error: deleteSurveyEntryMutation.error,
  };
}

/**
 * Hook for deleting a choice by ID (v2 API)
 * DELETE /v2/survey-entries/choices/{choiceId}
 */
export function useDeleteChoice() {
  const queryClient = useQueryClient();

  const deleteChoiceMutation = useMutation({
    mutationFn: async (choiceId: string) => {
      const token = getCookie("token");
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/choices/${choiceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      console.error("Failed to delete choice:", error);
    },
  });

  return {
    deleteChoice: deleteChoiceMutation.mutate,
    deleteChoiceAsync: deleteChoiceMutation.mutateAsync,
    isLoading: deleteChoiceMutation.isPending,
    isSuccess: deleteChoiceMutation.isSuccess,
    isError: deleteChoiceMutation.isError,
    error: deleteChoiceMutation.error,
  };
}

/**
 * Hook for deleting a grid row by ID (v2 API)
 * DELETE /v2/survey-entries/grid-rows/{gridRowId}
 */
export function useDeleteGridRow() {
  const queryClient = useQueryClient();

  const deleteGridRowMutation = useMutation({
    mutationFn: async (gridRowId: string) => {
      const token = getCookie("token");
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/v2/survey-entries/grid-rows/${gridRowId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyQueryKeys.all });
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      console.error("Failed to delete grid row:", error);
    },
  });

  return {
    deleteGridRow: deleteGridRowMutation.mutate,
    deleteGridRowAsync: deleteGridRowMutation.mutateAsync,
    isLoading: deleteGridRowMutation.isPending,
    isSuccess: deleteGridRowMutation.isSuccess,
    isError: deleteGridRowMutation.isError,
    error: deleteGridRowMutation.error,
  };
}

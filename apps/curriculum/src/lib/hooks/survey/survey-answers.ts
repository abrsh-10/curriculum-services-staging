import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { getCookie } from "@curriculum-services/auth";
import { toast } from "sonner";
import { surveyQueryKeys, ApiErrorResponse } from "../survey-types";

// =============================================================================
// TYPES
// =============================================================================

export interface SubmitAnswerData {
  answer: string;
  traineeId: string;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for submitting an answer to a survey question (trainee side)
 * POST /survey/entry/{surveyEntryId}/answer
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
 * POST /survey/{surveyId}/assign-session
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

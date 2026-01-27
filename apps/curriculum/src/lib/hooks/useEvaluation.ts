import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import axios, { AxiosError } from "axios"
import { getCookie } from "@curriculum-services/auth"
import { 
  CreateEvaluationPayload, 
  EvaluationResponse, 
  EvaluationDetailResponse,
  EvaluationSectionsResponse,
  EvaluationSectionResponse,
  ApiErrorResponse,
  EvaluationEntryForm,
  EvaluationChoiceForm,
  SectionEntriesResponseDTO,
  EntryDetailResponseDTO,
} from "./evaluation-types"
import { toast } from "sonner"

// Re-export types
export * from "./evaluation-types"

// =============================================================================
// GET HOOKS
// =============================================================================

export function useGetEvaluations(trainingId: string) {
  return useQuery({
    queryKey: ['evaluation', trainingId],
    queryFn: async () => {
      const token = getCookie('token')
      const response = await axios.get<EvaluationResponse>(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form/training/${trainingId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data
    }
  })
}

export function useGetEvaluationDetail(formId: string) {
  return useQuery({
    queryKey: ['evaluation-detail', formId],
    queryFn: async () => {
      const token = getCookie('token')
      const response = await axios.get<EvaluationDetailResponse>(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form/${formId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data.monitoringForm
    },
    enabled: !!formId
  })
}

export function useGetEvaluationSections(formId: string) {
  return useQuery({
    queryKey: ['evaluation-sections', formId],
    queryFn: async () => {
      const token = getCookie('token')
      const response = await axios.get<EvaluationSectionsResponse>(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-section/monitoring-form/${formId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data.sections
    },
    enabled: !!formId
  })
}

export function useGetEvaluationSection(sectionId: string) {
  return useQuery({
    queryKey: ['evaluation-section', sectionId],
    queryFn: async () => {
      const token = getCookie('token')
      const response = await axios.get<EvaluationSectionResponse>(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-section/${sectionId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data.section
    },
    enabled: !!sectionId
  })
}

export function useGetSectionEntries(sectionId: string) {
  return useQuery({
    queryKey: ['evaluation-section-entries', sectionId],
    queryFn: async () => {
      const token = getCookie('token')
      const response = await axios.get<SectionEntriesResponseDTO>(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-entry/monitoring-form-section/${sectionId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data.entries
    },
    enabled: !!sectionId
  })
}

export function useGetEntryDetail(entryId: string) {
  return useQuery({
    queryKey: ['evaluation-entry', entryId],
    queryFn: async () => {
      const token = getCookie('token')
      const response = await axios.get<EntryDetailResponseDTO>(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-entry/${entryId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data.entry
    },
    enabled: !!entryId
  })
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

export function useCreateEvaluation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      data, 
      trainingId 
    }: { 
      data: CreateEvaluationPayload; 
      trainingId: string 
    }) => {
      const token = getCookie('token')
      
      const formData = new FormData()
      
      // Top-level fields
      formData.append('formType', data.formType)
      
      // Sections
      data.sections.forEach((section, si) => {
        formData.append(`sections[${si}].title`, section.title)
        formData.append(`sections[${si}].description`, section.description)
        
        // Entries (Questions) - use 'entries' for POST, backend converts to monitoringFormEntries
        section.entries.forEach((entry, ei) => {
          formData.append(`sections[${si}].entries[${ei}].clientId`, entry.clientId)
          
          formData.append(`sections[${si}].entries[${ei}].question`, entry.question)
          formData.append(`sections[${si}].entries[${ei}].questionType`, entry.questionType)
          formData.append(`sections[${si}].entries[${ei}].isFollowUp`, String(entry.isFollowUp))
          
          // Question Image - access from form data which has the file properties
          const entryForm = entry as EvaluationEntryForm
          if (entryForm.questionImageFile instanceof File) {
            formData.append(`sections[${si}].entries[${ei}].questionImage`, entryForm.questionImageFile)
          } else if (entry.questionImage) {
             formData.append(`sections[${si}].entries[${ei}].questionImage`, entry.questionImage)
          }

          // Follow-up logic - include all fields for completeness
          if (entry.isFollowUp) {
            if (entry.parentQuestionClientId) {
              formData.append(`sections[${si}].entries[${ei}].parentQuestionClientId`, entry.parentQuestionClientId)
            }
            if (entry.parentQuestionId) {
              formData.append(`sections[${si}].entries[${ei}].parentQuestionId`, entry.parentQuestionId)
            }
            
            // Handle trigger choice client IDs
            if (entry.triggerChoiceClientIds && entry.triggerChoiceClientIds.length > 0) {
              entry.triggerChoiceClientIds.forEach((id, idx) => {
                formData.append(`sections[${si}].entries[${ei}].triggerChoiceClientIds[${idx}]`, id)
              })
            }
            
            // Handle trigger choice server IDs (for editing existing evaluations)
            if (entry.triggerChoiceIds && entry.triggerChoiceIds.length > 0) {
              entry.triggerChoiceIds.forEach((id, idx) => {
                formData.append(`sections[${si}].entries[${ei}].triggerChoiceIds[${idx}]`, id)
              })
            }
          }

          // Choices (only for RADIO and CHECKBOX question types)
          if (entry.choices && entry.choices.length > 0) {
            entry.choices.forEach((choice, ci) => {
              formData.append(`sections[${si}].entries[${ei}].choices[${ci}].clientId`, choice.clientId)
              formData.append(`sections[${si}].entries[${ei}].choices[${ci}].choiceText`, choice.choiceText)
              
              // Choice Image - access from form data which has the file properties
              const choiceForm = choice as EvaluationChoiceForm
              if (choiceForm.choiceImageFile instanceof File) {
                formData.append(`sections[${si}].entries[${ei}].choices[${ci}].choiceImage`, choiceForm.choiceImageFile)
              } else if (choice.choiceImage) {
                formData.append(`sections[${si}].entries[${ei}].choices[${ci}].choiceImage`, choice.choiceImage)
              }
              
              // Handle nested follow-up question if it exists
              if (choiceForm.hasFollowUp && choiceForm.followUpQuestion) {
                const followUpQ = choiceForm.followUpQuestion;
                formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.clientId`, followUpQ.clientId);
                formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.question`, followUpQ.question);
                formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.questionType`, followUpQ.questionType);
                formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.isFollowUp`, String(followUpQ.isFollowUp));
                
                if (followUpQ.questionImageFile instanceof File) {
                  formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.questionImage`, followUpQ.questionImageFile);
                } else if (followUpQ.questionImage) {
                  formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.questionImage`, followUpQ.questionImage);
                }

                // Follow-up question's choices
                (followUpQ.choices || []).forEach((fChoice, fci) => {
                  formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.choices[${fci}].clientId`, fChoice.clientId);
                  formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.choices[${fci}].choiceText`, fChoice.choiceText);
                  if (fChoice.choiceImageFile instanceof File) {
                    formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.choices[${fci}].choiceImage`, fChoice.choiceImageFile);
                  } else if (fChoice.choiceImage) {
                    formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.choices[${fci}].choiceImage`, fChoice.choiceImage);
                  }
                });

                // Follow-up question's parent/trigger details
                if (followUpQ.parentQuestionClientId) {
                  formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.parentQuestionClientId`, followUpQ.parentQuestionClientId);
                }
                if (followUpQ.triggerChoiceClientIds) {
                  followUpQ.triggerChoiceClientIds.forEach((id, idx) => {
                    formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.triggerChoiceClientIds[${idx}]`, id);
                  });
                }
                if (followUpQ.parentQuestionId) {
                  formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.parentQuestionId`, followUpQ.parentQuestionId);
                }
                if (followUpQ.triggerChoiceIds) {
                  followUpQ.triggerChoiceIds.forEach((id, idx) => {
                    formData.append(`sections[${si}].entries[${ei}].choices[${ci}].followUpQuestion.triggerChoiceIds[${idx}]`, id);
                  });
                }
              }
            })
          }
        })
      })

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form/training/${trainingId}`,
        formData,
        {
          headers: { 
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}` 
          }
        }
      )
      return response.data
    },
    onSuccess: (data, variables) => {
      toast.success("Success", { 
        description: data.message || "Evaluation form created successfully" 
      })
      
      queryClient.invalidateQueries({ 
        queryKey: ['evaluation', variables.trainingId] 
      })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      let errorMessage = "Failed to create evaluation form. Please try again."
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error("Error", {
        description: errorMessage
      })
    }
  })
}

// =============================================================================
// SECTION MANAGEMENT HOOKS
// =============================================================================

export function useUpdateEvaluationSection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      sectionId,
      data
    }: {
      sectionId: string;
      data: {
        title?: string;
        description?: string;
        sectionOrder?: number;
      };
    }) => {
      const token = getCookie('token')
      
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-section/${sectionId}`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      )
      
      return response.data
    },
    onSuccess: (data, variables) => {
      toast.success("Success", {
        description: data?.message || "Section updated successfully"
      })
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['evaluation-sections'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail'] })
      if (variables?.sectionId) {
        queryClient.invalidateQueries({ 
          queryKey: ['evaluation-section', variables.sectionId] 
        })
      }
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      const errorMessage = error.response?.data?.message || error.message || "Failed to update section"
      toast.error("Error", { description: errorMessage })
    }
  })
}

export function useAddEvaluationSections() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      formId,
      sections,
    }: {
      formId: string;
      sections: {
        title: string;
        description: string;
        entries: {
          clientId: string;
          question: string;
          questionImage?: string;
          questionImageFile?: File;
          questionType: "TEXT" | "RADIO" | "CHECKBOX";
          choices: {
            clientId: string;
            choiceText: string;
            choiceImage?: string;
            choiceImageFile?: File;
          }[];
          isFollowUp: boolean;
          parentQuestionClientId?: string;
          triggerChoiceClientIds?: string[];
          parentQuestionId?: string;
          triggerChoiceIds?: string[];
        }[];
      }[];
    }) => {
      const token = getCookie('token')

      const formData = new FormData()
      
      sections.forEach((section, si) => {
        formData.append(`sections[${si}].title`, section.title)
        formData.append(`sections[${si}].description`, section.description)
        
        section.entries.forEach((entry, ei) => {
          formData.append(`sections[${si}].entries[${ei}].clientId`, entry.clientId)
          formData.append(`sections[${si}].entries[${ei}].question`, entry.question)
          formData.append(`sections[${si}].entries[${ei}].questionType`, entry.questionType)
          formData.append(`sections[${si}].entries[${ei}].isFollowUp`, String(entry.isFollowUp))
          
          // Question Image - only send if it's a new File (not URL string)
          if (entry.questionImageFile instanceof File) {
            formData.append(`sections[${si}].entries[${ei}].questionImage`, entry.questionImageFile)
          }
          
          // Follow-up logic
          if (entry.isFollowUp) {
            if (entry.parentQuestionClientId) {
              formData.append(`sections[${si}].entries[${ei}].parentQuestionClientId`, entry.parentQuestionClientId)
            }
            if (entry.parentQuestionId) {
              formData.append(`sections[${si}].entries[${ei}].parentQuestionId`, entry.parentQuestionId)
            }
            if (entry.triggerChoiceClientIds && entry.triggerChoiceClientIds.length > 0) {
              entry.triggerChoiceClientIds.forEach((id, idx) => {
                formData.append(`sections[${si}].entries[${ei}].triggerChoiceClientIds[${idx}]`, id)
              })
            }
            if (entry.triggerChoiceIds && entry.triggerChoiceIds.length > 0) {
              entry.triggerChoiceIds.forEach((id, idx) => {
                formData.append(`sections[${si}].entries[${ei}].triggerChoiceIds[${idx}]`, id)
              })
            }
          }
          
          // Choices
          if (entry.choices && entry.choices.length > 0) {
            entry.choices.forEach((choice, ci) => {
              formData.append(`sections[${si}].entries[${ei}].choices[${ci}].clientId`, choice.clientId)
              formData.append(`sections[${si}].entries[${ei}].choices[${ci}].choiceText`, choice.choiceText)
              
              // Choice Image - only send if it's a new File (not URL string)
              if (choice.choiceImageFile instanceof File) {
                formData.append(`sections[${si}].entries[${ei}].choices[${ci}].choiceImage`, choice.choiceImageFile)
              }
            })
          }
        })
      })

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-section/monitoring-form/${formId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      return response.data
    },
    onSuccess: (data, variables) => {
      toast.success("Success", {
        description: data?.message || "Sections added successfully",
      })

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['evaluation'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-sections'] })
      if (variables?.formId) {
        queryClient.invalidateQueries({
          queryKey: ['evaluation-detail', variables.formId],
        })
      }
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      let errorMessage = "Failed to add sections. Please try again."
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      toast.error("Error", { description: errorMessage })
    },
  })
}

export function useAddQuestionEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sectionId,
      entry,
    }: {
      sectionId: string;
      entry: {
        clientId: string;
        question: string;
        questionImage?: string;
        questionImageFile?: File;
        questionType: "TEXT" | "RADIO" | "CHECKBOX";
        choices: {
          clientId: string;
          choiceText: string;
          choiceImage?: string;
          choiceImageFile?: File;
        }[];
        isFollowUp: boolean;
        parentQuestionClientId?: string;
        triggerChoiceClientIds?: string[];
        parentQuestionId?: string;
        triggerChoiceIds?: string[];
      };
    }) => {
      const token = getCookie('token')
      
      const formData = new FormData()
      formData.append('clientId', entry.clientId)
      formData.append('question', entry.question)
      formData.append('questionType', entry.questionType)
      formData.append('isFollowUp', String(entry.isFollowUp))
      
      // Question Image - only send if it's a new File (not URL string)
      if (entry.questionImageFile instanceof File) {
        formData.append('questionImage', entry.questionImageFile)
      }
      
      // Follow-up logic
      if (entry.isFollowUp) {
        if (entry.parentQuestionClientId) {
          formData.append('parentQuestionClientId', entry.parentQuestionClientId)
        }
        if (entry.parentQuestionId) {
          formData.append('parentQuestionId', entry.parentQuestionId)
        }
        if (entry.triggerChoiceClientIds && entry.triggerChoiceClientIds.length > 0) {
          entry.triggerChoiceClientIds.forEach((id, idx) => {
            formData.append(`triggerChoiceClientIds[${idx}]`, id)
          })
        }
        if (entry.triggerChoiceIds && entry.triggerChoiceIds.length > 0) {
          entry.triggerChoiceIds.forEach((id, idx) => {
            formData.append(`triggerChoiceIds[${idx}]`, id)
          })
        }
      }
      
      // Choices
      if (entry.choices && entry.choices.length > 0) {
        entry.choices.forEach((choice, ci) => {
          formData.append(`choices[${ci}].clientId`, choice.clientId)
          formData.append(`choices[${ci}].choiceText`, choice.choiceText)
          
          // Choice Image - only send if it's a new File (not URL string)
          if (choice.choiceImageFile instanceof File) {
            formData.append(`choices[${ci}].choiceImage`, choice.choiceImageFile)
          }
        })
      }
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-entry/monitoring-form-section/${sectionId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success("Success", { description: "Question added" })
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-sections'] })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error("Error", { description: error.response?.data?.message || error.message || "Failed to add question" })
    }
  })
}

export function useAddQuestionEntriesBulk() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sectionId,
      entries,
    }: {
      sectionId: string;
      entries: {
        clientId: string;
        question: string;
        questionImage?: string;
        questionImageFile?: File;
        questionType: "TEXT" | "RADIO" | "CHECKBOX";
        choices: {
          clientId: string;
          choiceText: string;
          choiceImage?: string;
          choiceImageFile?: File;
        }[];
        isFollowUp: boolean;
        parentQuestionClientId?: string;
        triggerChoiceClientIds?: string[];
        parentQuestionId?: string;
        triggerChoiceIds?: string[];
      }[];
    }) => {
      const token = getCookie('token')
      
      const formData = new FormData()
      
      entries.forEach((entry, ei) => {
        formData.append(`entries[${ei}].clientId`, entry.clientId)
        formData.append(`entries[${ei}].question`, entry.question)
        formData.append(`entries[${ei}].questionType`, entry.questionType)
        formData.append(`entries[${ei}].isFollowUp`, String(entry.isFollowUp))
        
        // Question Image - only send if it's a new File (not URL string)
        if (entry.questionImageFile instanceof File) {
          formData.append(`entries[${ei}].questionImage`, entry.questionImageFile)
        }
        
        // Follow-up logic
        if (entry.isFollowUp) {
          if (entry.parentQuestionClientId) {
            formData.append(`entries[${ei}].parentQuestionClientId`, entry.parentQuestionClientId)
          }
          if (entry.parentQuestionId) {
            formData.append(`entries[${ei}].parentQuestionId`, entry.parentQuestionId)
          }
          if (entry.triggerChoiceClientIds && entry.triggerChoiceClientIds.length > 0) {
            entry.triggerChoiceClientIds.forEach((id, idx) => {
              formData.append(`entries[${ei}].triggerChoiceClientIds[${idx}]`, id)
            })
          }
          if (entry.triggerChoiceIds && entry.triggerChoiceIds.length > 0) {
            entry.triggerChoiceIds.forEach((id, idx) => {
              formData.append(`entries[${ei}].triggerChoiceIds[${idx}]`, id)
            })
          }
        }
        
        // Choices
        if (entry.choices && entry.choices.length > 0) {
          entry.choices.forEach((choice, ci) => {
            formData.append(`entries[${ei}].choices[${ci}].clientId`, choice.clientId)
            formData.append(`entries[${ei}].choices[${ci}].choiceText`, choice.choiceText)
            
            // Choice Image - only send if it's a new File (not URL string)
            if (choice.choiceImageFile instanceof File) {
              formData.append(`entries[${ei}].choices[${ci}].choiceImage`, choice.choiceImageFile)
            }
          })
        }
      })
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-entry/monitoring-form-section/${sectionId}/bulk`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success("Success", { description: "Questions added successfully" })
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-sections'] })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error("Error", { description: error.response?.data?.message || error.message || "Failed to add questions" })
    }
  })
}

// =============================================================================
// PATCH SECTIONS (Edit existing questions/choices/follow-ups)
// =============================================================================

// No section-level PATCH (updates are per-entry)

// =============================================================================
// CHOICE & ENTRY MANAGEMENT HOOKS (edit/add/delete)
// =============================================================================

export function useUpdateQuestionEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      entryId,
      data,
    }: {
      entryId: string;
      data: {
        question: string;
        questionImage?: string;
        questionImageFile?: File;
        questionType: "TEXT" | "RADIO" | "CHECKBOX";
        choices: {
          clientId: string;
          choiceText: string;
          choiceImage?: string;
          choiceImageFile?: File;
        }[];
        isFollowUp: boolean;
        parentQuestionId?: string;
        triggerChoiceIds?: string[];
      };
    }) => {
      const token = getCookie('token')
      
      const formData = new FormData()
      formData.append('question', data.question)
      formData.append('questionType', data.questionType)
      formData.append('isFollowUp', String(data.isFollowUp))
      
      // Question Image - only send if it's a new File (not URL string)
      if (data.questionImageFile instanceof File) {
        formData.append('questionImage', data.questionImageFile)
      }
      
      // Follow-up logic
      if (data.isFollowUp) {
        if (data.parentQuestionId) {
          formData.append('parentQuestionId', data.parentQuestionId)
        }
        if (data.triggerChoiceIds && data.triggerChoiceIds.length > 0) {
          data.triggerChoiceIds.forEach((id, idx) => {
            formData.append(`triggerChoiceIds[${idx}]`, id)
          })
        }
      }
      
      // Choices
      if (data.choices && data.choices.length > 0) {
        data.choices.forEach((choice, ci) => {
          formData.append(`choices[${ci}].clientId`, choice.clientId)
          formData.append(`choices[${ci}].choiceText`, choice.choiceText)
          
          // Choice Image - only send if it's a new File (not URL string)
          if (choice.choiceImageFile instanceof File) {
            formData.append(`choices[${ci}].choiceImage`, choice.choiceImageFile)
          }
        })
      }
      
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-entry/${entryId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          }
        }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success("Success", { description: "Question updated" })
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-sections'] })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error("Error", { description: error.response?.data?.message || error.message || "Failed to update question" })
    }
  })
}

export function useEditChoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      choiceId,
      data,
    }: {
      choiceId: string;
      data: {
        clientId: string;
        choiceText: string;
        choiceImage?: string;
        choiceImageFile?: File;
      }
    }) => {
      const token = getCookie('token')
      
      const formData = new FormData()
      formData.append('clientId', data.clientId)
      formData.append('choiceText', data.choiceText)
      
      // Choice Image - only send if it's a new File (not URL string)
      if (data.choiceImageFile instanceof File) {
        formData.append('choiceImage', data.choiceImageFile)
      }
      
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-entry/edit-choice/${choiceId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          }
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-sections'] })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error("Error", { description: error.response?.data?.message || error.message || "Failed to edit choice" })
    }
  })
}

export function useAddChoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      entryId,
      data,
    }: {
      entryId: string; // monitoring form entry id (question id)
      data: {
        clientId: string;
        choiceText: string;
        choiceImage?: string;
        choiceImageFile?: File;
      }
    }) => {
      const token = getCookie('token')
      
      const formData = new FormData()
      formData.append('clientId', data.clientId)
      formData.append('choiceText', data.choiceText)
      
      // Choice Image - only send if it's a new File (not URL string)
      if (data.choiceImageFile instanceof File) {
        formData.append('choiceImage', data.choiceImageFile)
      }
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-entry/${entryId}/add-choice`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          }
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-sections'] })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error("Error", { description: error.response?.data?.message || error.message || "Failed to add choice" })
    }
  })
}

export function useDeleteChoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (choiceId: string) => {
      const token = getCookie('token')
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-entry/delete-choice/${choiceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success("Success", { description: "Choice deleted" })
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-sections'] })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error("Error", { description: error.response?.data?.message || error.message || "Failed to delete choice" })
    }
  })
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entryId: string) => {
      const token = getCookie('token')
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-entry/${entryId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success("Success", { description: "Question deleted" })
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-sections'] })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error("Error", { description: error.response?.data?.message || error.message || "Failed to delete question" })
    }
  })
}

export function useDeleteSection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sectionId: string) => {
      const token = getCookie('token')
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-section/${sectionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success("Success", { description: "Section deleted" })
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-sections'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation'] })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error("Error", { description: error.response?.data?.message || error.message || "Failed to delete section" })
    }
  })
}

// =============================================================================
// ANSWER & FORM DELETE HOOKS
// =============================================================================

export function useAnswerEvaluationEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      entryId,
      data,
    }: {
      entryId: string;
      data: {
        selectedChoiceIds?: string[];
        textAnswer?: string;
      }
    }) => {
      const token = getCookie('token')
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form-entry/${entryId}/answer`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success("Success", { description: "Answer submitted" })
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-section-entries'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-entry'] })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error("Error", { description: error.response?.data?.message || error.message || "Failed to submit answer" })
    }
  })
}

export function useDeleteEvaluationForm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (formId: string) => {
      const token = getCookie('token')
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API}/monitoring-form/${formId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      return response.data
    },
    onSuccess: (_data, formId) => {
      toast.success("Deleted", { description: "Evaluation form deleted" })
      queryClient.invalidateQueries({ queryKey: ['evaluation'] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-detail', formId] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-sections', formId] })
    },
    onError: (error: AxiosError<ApiErrorResponse>) => {
      toast.error("Error", { description: error.response?.data?.message || error.message || "Failed to delete evaluation form" })
    }
  })
}

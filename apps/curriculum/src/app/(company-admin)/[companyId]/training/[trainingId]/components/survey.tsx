"use client"

import { useState } from "react"
import { Loading } from "@/components/ui/loading"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { 
  useCreateSurvey, 
  useSurveys,
  useSurveyDetail,
  useUpdateSurvey,
  useDeleteSurvey,
  useAddQuestionToSection,
  useAddSectionToSurvey,
  useDeleteSurveyEntry,
  useDeleteSurveySection,
  useUpdateSurveyEntry,
  useUpdateSurveySection,
  useAddChoice,
  useRemoveChoice,
  CreateSurveyData,
  CreateSurveySection,
  CreateSurveyEntry,
  UpdateSurveyEntryData,
  SurveyType
} from "@/lib/hooks/useSurvey"
import { 
  SurveyList,
  CreateSurveyForm,
  ViewSurveyDetails,
  EditSurveyForm
} from "./survey/index"

interface SurveyComponentProps {
  trainingId: string
}

export function SurveyComponent({ trainingId }: SurveyComponentProps) {
  
  // UI state
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'view' | 'edit'>('list')
  const [currentSurveyId, setCurrentSurveyId] = useState<string | null>(null)
  
  // Fetch existing surveys for this training
  const { 
    data: surveyData, 
    isLoading: isLoadingSurveys,
    error: surveysError,
    refetch: refetchSurveys
  } = useSurveys(trainingId)
  
  // Fetch survey details when viewing or editing
  const { 
    data: surveyDetailData, 
    isLoading: isLoadingSurveyDetails,
    refetch: refetchSurveyDetails
  } = useSurveyDetail(currentSurveyId || "", undefined)
  
  // Mutation hooks
  const { createSurvey, isLoading: isCreatingSurvey } = useCreateSurvey(trainingId)
  const { deleteSurvey, isLoading: isDeletingSurvey } = useDeleteSurvey()
  const { updateSurvey, isLoading: isUpdatingSurvey } = useUpdateSurvey()
  const { addQuestionToSection, isLoading: isAddingQuestion } = useAddQuestionToSection()
  const { addSection, isLoading: isAddingSection } = useAddSectionToSurvey()
  const { deleteSurveyEntry, isLoading: isDeletingQuestion } = useDeleteSurveyEntry()
  const { deleteSurveySection, isLoading: isDeletingSection } = useDeleteSurveySection()
  const { updateSurveyEntry } = useUpdateSurveyEntry()
  const { updateSurveySection } = useUpdateSurveySection()


  // Extract survey data
  const surveys = surveyData?.surveys || []
  const surveyDetail = surveyDetailData?.survey

  // Handle state transitions
  const handleCreateNew = () => {
    setViewMode('create')
    setCurrentSurveyId(null)
  }

  const handleViewSurvey = (surveyId: string) => {
    setViewMode('view')
    setCurrentSurveyId(surveyId)
  }

  const handleEditSurvey = (surveyId: string) => {
    setViewMode('edit')
    setCurrentSurveyId(surveyId)
  }

  const handleEditSurveyStructure = (surveyId: string, options?: {
    focusSection?: {
      sectionId?: string
      action: 'add-question' | 'add-section' | 'edit-questions'
    }
  }) => {
    setViewMode('create')
    setCurrentSurveyId(surveyId)
    setFocusSection(options?.focusSection)
  }

  const [focusSection, setFocusSection] = useState<{
    sectionId?: string
    action: 'add-question' | 'add-section' | 'edit-questions'
  } | undefined>(undefined)



  const handleBackToList = () => {
    setViewMode('list')
    setCurrentSurveyId(null)
  }

  const handleBackToView = () => {
    if (currentSurveyId) {
      setViewMode('view')
    } else {
      handleBackToList()
    }
  }

  // Form submission handlers
  const handleCreateSubmit = (data: CreateSurveyData) => {
    createSurvey(data, {
      onSuccess: () => {
        refetchSurveys()
        handleBackToList()
      }
    })
  }

  const handleEditSubmit = (data: CreateSurveyData & { 
    editMetadata?: {
      newSections: CreateSurveySection[]
      newQuestionsPerSection: { sectionIndex: number; sectionId?: string; newQuestions: CreateSurveyEntry[] }[]
      updatedQuestions?: { 
        sectionIndex: number; 
        questionIndex: number; 
        questionId: string; 
        updates: Partial<UpdateSurveyEntryData>;
        changeType: string;
      }[]
      updatedSectionTitles?: { sectionIndex: number; sectionId: string; title: string }[]
    }
  }) => {
    if (!currentSurveyId) return;

    const { editMetadata } = data;
    
    if (!editMetadata) {
      // No changes detected, stay in builder
      toast.message('No changes to save');
      return;
    }

    let pendingOperations = 0;
    let completedOperations = 0;
    let successCount = 0;
    let failureCount = 0;

    const checkCompletion = () => {
      completedOperations++;
      if (completedOperations === pendingOperations) {
        // All operations completed - stay in builder
        if (failureCount === 0) {
          toast.success(`All changes saved (${successCount})`)
        } else if (successCount > 0) {
          toast.error(`${failureCount} change(s) failed, ${successCount} succeeded`)
        } else {
          toast.error(`All ${failureCount} change(s) failed`)
        }
        // React Query invalidation will handle the refetch automatically
        // Stay in builder - no redirect
        setFocusSection(undefined);
      }
    };

    // Handle new questions in existing sections
    if (editMetadata.newQuestionsPerSection.length > 0) {
      editMetadata.newQuestionsPerSection.forEach(({ sectionId, newQuestions }) => {
        if (sectionId) {
          newQuestions.forEach(question => {
            pendingOperations++;
            addQuestionToSection({
              sectionId,
              
              questionData: {
                question: question.question,
                questionImage: question.questionImage,
                questionImageFile: question.questionImageFile,
                questionType: question.questionType,
                choices: (Array.isArray(question.choices)
                  ? (question.choices as (string | { choice: string; choiceImage?: string; choiceImageFile?: File })[]).map((c) => ({
                      choice: typeof c === 'string' ? c : c.choice,
                      choiceImage: typeof c === 'string' ? undefined : c.choiceImage,
                      choiceImageFile: typeof c === 'string' ? undefined : c.choiceImageFile
                    }))
                  : []),
                allowTextAnswer: !!question.allowTextAnswer,
                rows: question.rows || [],
                questionNumber: question.questionNumber,
                parentQuestionNumber: question.parentQuestionNumber,
                parentChoice: question.parentChoice,
                followUp: question.followUp,
                required: !!question.required,
              }
            }, {
              onSuccess: () => { successCount++; checkCompletion() },
              onError: () => {
                // Still count as completed to avoid hanging
                failureCount++; checkCompletion();
              }
            });
          });
        }
      });
    }

    // Handle new sections
    if (editMetadata.newSections.length > 0) {
      editMetadata.newSections.forEach(newSection => {
        pendingOperations++;
        addSection({
          surveyId: currentSurveyId,
          sectionData: {
            title: newSection.title,
            surveyEntries: newSection.surveyEntries
          }
        }, {
          onSuccess: () => { successCount++; checkCompletion() },
          onError: () => {
            // Still count as completed to avoid hanging
            failureCount++; checkCompletion();
          }
        });
      });
    }

    // Handle updated section titles
    if (editMetadata.updatedSectionTitles && editMetadata.updatedSectionTitles.length > 0) {
      editMetadata.updatedSectionTitles.forEach(({ sectionId, title }) => {
        pendingOperations++;
        updateSurveySection({ sectionId, title }, {
          onSuccess: () => { successCount++; checkCompletion() },
          onError: () => { failureCount++; checkCompletion() }
        })
      })
    }

    // Handle updated questions
    if (editMetadata.updatedQuestions && editMetadata.updatedQuestions.length > 0) {
      editMetadata.updatedQuestions.forEach(({ questionId, updates, changeType }) => {
        pendingOperations++;
        console.log(`PATCH question ${questionId} - ${changeType}:`, updates);
        updateSurveyEntry({ surveyEntryId: questionId, questionData: updates }, {
          onSuccess: () => { 
            console.log(`✓ Successfully updated question ${questionId} (${changeType})`);
            successCount++; 
            checkCompletion() 
          },
          onError: () => { 
            console.log(`✗ Failed to update question ${questionId} (${changeType})`);
            failureCount++; 
            checkCompletion() 
          }
        })
      })
    }

    // If no operations were queued, stay in builder
    if (pendingOperations === 0) {
      toast.message('No changes to save')
      // Stay in builder - no redirect
    }
  }

  const handleUpdateSubmit = (data: { surveyId: string; data: { name: string; type: SurveyType; description: string } }) => {
    updateSurvey(data, {
      onSuccess: () => {
        refetchSurveys()
        refetchSurveyDetails()
        handleBackToView()
      }
    })
  }



  const handleDeleteSurvey = (surveyId: string) => {
    deleteSurvey(surveyId, {
      onSuccess: () => {
        refetchSurveys()
      }
    })
  }

  const handleDeleteQuestion = (questionId: string, onSuccess?: () => void) => {
    deleteSurveyEntry(questionId, {
      onSuccess: () => {
        refetchSurveyDetails()
        onSuccess?.()
      }
    })
  }

  const handleDeleteSection = (sectionId: string) => {
    deleteSurveySection(sectionId, {
      onSuccess: () => {
        refetchSurveyDetails()
      }
    })
  }

  // Loading state
  if (isLoadingSurveys) {
    return <Loading />
  }

  // Error state
  if (surveysError) {
    return (
      <div className="px-[7%] py-8">
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-100">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading Surveys</h3>
          <p className="text-gray-600">
            There was a problem loading the surveys. Please try again later.
          </p>
          <Button 
            className="mt-4" 
            variant="outline"
            onClick={() => refetchSurveys()}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Show loading when fetching survey details
  if ((viewMode === 'view' || viewMode === 'edit') && isLoadingSurveyDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading survey details...</p>
      </div>
    )
  }

  // Show loading when fetching survey details for create mode (edit existing survey)
  if (viewMode === 'create' && currentSurveyId && isLoadingSurveyDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 font-medium">Loading survey builder...</p>
      </div>
    )
  }

  // Render different views based on state
  switch (viewMode) {
    case 'create':
      return (
        <CreateSurveyForm
          trainingId={trainingId}
          onCancel={() => {
            handleBackToList()
            setFocusSection(undefined) // Clear focus when canceling
          }}
          onSubmit={currentSurveyId ? handleEditSubmit : handleCreateSubmit}
          isSubmitting={currentSurveyId ? (isAddingQuestion || isAddingSection || isDeletingQuestion || isDeletingSection) : isCreatingSurvey}
          editingSurveyId={currentSurveyId || undefined}
          initialSurveyName={surveyDetail?.name}
          initialSurveyType={surveyDetail?.type || undefined}
          initialSurveyDescription={surveyDetail?.description}
          focusSection={focusSection}
          onDeleteQuestion={handleDeleteQuestion}
          onDeleteSection={handleDeleteSection}
          onRefreshSurveyData={refetchSurveyDetails}
        />
      )
    
    case 'view':
      if (!surveyDetail) return <Loading />
      return (
        <ViewSurveyDetails
          surveyDetail={surveyDetail}
          onBackToList={handleBackToList}
          onEditSurvey={handleEditSurvey}
          onEditSurveyStructure={handleEditSurveyStructure}
          onRefreshDetails={refetchSurveyDetails}
        />
      )
    
    case 'edit':
      if (!surveyDetail) return <Loading />
      return (
        <EditSurveyForm
          surveyId={surveyDetail.id}
          initialName={surveyDetail.name}
          initialType={surveyDetail.type || 'OTHER'}
          initialDescription={surveyDetail.description}
          onCancel={handleBackToView}
          onSubmit={handleUpdateSubmit}
          isSubmitting={isUpdatingSurvey}
        />
      )
    

    
    case 'list':
    default:
      return (
        <SurveyList
          surveys={surveys}
          onCreateNew={handleCreateNew}
          onViewSurvey={handleViewSurvey}
          onEditSurvey={handleEditSurvey}
          onDeleteSurvey={handleDeleteSurvey}
          isDeletingSurvey={isDeletingSurvey}
        />
      )
  }
}

"use client"

import { useState } from "react"
import { Loading } from "@/components/ui/loading"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SurveyType } from "@/lib/hooks/survey-types"
import { 
  useSurveys,
  useSurveyDetailNew,
  useUpdateSurvey,
  useDeleteSurvey,
  useDeleteSurveyEntry,
  useDeleteSurveySection,
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
  
  // Fetch survey details when viewing or editing (using v2 API format)
  const { 
    data: surveyDetailData, 
    isLoading: isLoadingSurveyDetails,
    refetch: refetchSurveyDetails
  } = useSurveyDetailNew(currentSurveyId || "")
  
  // Mutation hooks
  const { deleteSurvey, isLoading: isDeletingSurvey } = useDeleteSurvey()
  const { updateSurvey, isLoading: isUpdatingSurvey } = useUpdateSurvey()
  const { deleteSurveyEntry, isLoading: isDeletingQuestion } = useDeleteSurveyEntry()
  const { deleteSurveySection, isLoading: isDeletingSection } = useDeleteSurveySection()


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
  const handleSubmitComplete = () => {
    // CreateSurveyForm handles submission internally via v2 API hooks
    // This callback is triggered after operations complete
    refetchSurveys()
    setFocusSection(undefined)
    if (!currentSurveyId) {
      handleBackToList()
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
          onSubmit={handleSubmitComplete}
          isSubmitting={isDeletingQuestion || isDeletingSection}
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

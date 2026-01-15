"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

// New types
import { 
  SurveyType,
  SurveySectionForm,
  SurveyEntryForm,
  SurveyEntryPayload,
  CreateSurveyPayload,
  emptySection,
  emptyEntry,
  emptyChoice,
  validateSurveyEntry,
  flattenEntriesForPayload,
  transformResponseToForm,
  useCreateSurveyNew,
  useSurveyDetailNew,
  useAddSectionToSurvey
} from "@/lib/hooks/useSurvey"

// Legacy types for backward compatibility with parent component
import type { 
  CreateSurveyData, 
  CreateSurveySection, 
  CreateSurveyEntry,
  UpdateSurveyEntryData
} from "@/lib/hooks/useSurvey"

// Import the new components
import { SurveySettings } from "./components/SurveySettings"
import { SurveyNavigation } from "./components/SurveyNavigation"
import { QuestionPreview } from "./components/QuestionPreviews"
import { SingleQuestionEditor } from "./components/SingleQuestionEditor"

interface CreateSurveyFormProps {
  trainingId: string
  onCancel: () => void
  onSubmit: (data: CreateSurveyData & { 
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
  }) => void
  isSubmitting: boolean
  editingSurveyId?: string
  initialSurveyName?: string
  initialSurveyType?: SurveyType
  initialSurveyDescription?: string
  focusSection?: {
    sectionId?: string
    action: 'add-question' | 'add-section' | 'edit-questions'
  }
  onDeleteQuestion?: (questionId: string, onSuccess?: () => void) => void
  onDeleteSection?: (sectionId: string) => void
  onRefreshSurveyData?: () => void
}

export function CreateSurveyForm({
  trainingId,
  onCancel,
  onSubmit,
  isSubmitting,
  editingSurveyId,
  initialSurveyName = "",
  initialSurveyType = "BASELINE",
  initialSurveyDescription = "",
  focusSection,
  onDeleteQuestion,
  onDeleteSection,
  onRefreshSurveyData
}: CreateSurveyFormProps) {
  const isEditMode = !!editingSurveyId
  
  // Survey basic info state
  const [surveyName, setSurveyName] = useState(initialSurveyName)
  const [surveyType, setSurveyType] = useState<SurveyType>(initialSurveyType)
  const [surveyDescription, setSurveyDescription] = useState(initialSurveyDescription)
  
  // NEW: Sections with new types (SurveySectionForm with clientIds)
  const [sections, setSections] = useState<SurveySectionForm[]>([emptySection(1)])
  
  // Change tracking for edit mode
  const [sectionsLoaded, setSectionsLoaded] = useState(false)
  const [originalSectionsCount, setOriginalSectionsCount] = useState(0)
  const [originalQuestionCounts, setOriginalQuestionCounts] = useState<number[]>([])
  const [originalSectionsSnapshot, setOriginalSectionsSnapshot] = useState<SurveySectionForm[]>([])
  
  // Navigation state
  const [selectedSection, setSelectedSection] = useState(0)
  const [selectedQuestion, setSelectedQuestion] = useState(0)
  const [editMode, setEditMode] = useState<'survey' | 'question'>('survey')

  // NEW: Fetch existing survey with new API format
  const { 
    data: surveyDetailData,
    isLoading: isLoadingDetail
  } = useSurveyDetailNew(editingSurveyId || "")

  // Hook for adding sections
  const { isLoading: isAddingSection } = useAddSectionToSurvey()

  // Create survey mutation (new format)
  const createSurveyMutation = useCreateSurveyNew(trainingId)

  // Helper function to calculate the next question number
  const getNextQuestionNumber = useCallback(() => {
    let total = 0
    sections.forEach(section => {
      // Count main questions
      total += section.entries.length
      // Count follow-up questions embedded in choices
      section.entries.forEach(entry => {
        entry.choices.forEach(choice => {
          if (choice.hasFollowUp && choice.followUpQuestion) {
            total += 1
          }
        })
      })
    })
    return total + 1
  }, [sections])

  // Load existing survey data (NEW FORMAT)
  useEffect(() => {
    if (isEditMode && surveyDetailData?.formSections && !sectionsLoaded) {
      const loadedSections = surveyDetailData.formSections
      
      // Track original counts for change detection
      setOriginalSectionsCount(loadedSections.length)
      setOriginalQuestionCounts(loadedSections.map(section => section.entries.length))
      setOriginalSectionsSnapshot(JSON.parse(JSON.stringify(loadedSections)))
      
      // Handle focus section logic
      let finalSections = [...loadedSections]
      
      if (focusSection?.action === 'add-question' && focusSection.sectionId) {
        const sectionIndex = loadedSections.findIndex(s => s.id === focusSection.sectionId)
        if (sectionIndex !== -1) {
          finalSections[sectionIndex] = {
            ...finalSections[sectionIndex],
            entries: [...finalSections[sectionIndex].entries, emptyEntry(getNextQuestionNumber())]
          }
          setSelectedSection(sectionIndex)
          setSelectedQuestion(finalSections[sectionIndex].entries.length - 1)
          setEditMode('question')
        }
      } else if (focusSection?.action === 'edit-questions' && focusSection.sectionId) {
        const sectionIndex = loadedSections.findIndex(s => s.id === focusSection.sectionId)
        if (sectionIndex !== -1 && loadedSections[sectionIndex].entries.length > 0) {
          setSelectedSection(sectionIndex)
          setSelectedQuestion(0)
          setEditMode('question')
        }
      } else if (focusSection?.action === 'add-section') {
        const newSection = emptySection(loadedSections.length + 1)
        newSection.entries = [emptyEntry(getNextQuestionNumber())]
        finalSections.push(newSection)
        setSelectedSection(finalSections.length - 1)
        setSelectedQuestion(0)
        setEditMode('question')
      }

      setSections(finalSections)
      setSectionsLoaded(true)
    }
  }, [surveyDetailData, isEditMode, sectionsLoaded, focusSection, getNextQuestionNumber])

  // Section management functions
  const addSection = () => {
    const newSection = emptySection(sections.length + 1)
    newSection.entries = [emptyEntry(getNextQuestionNumber())]
    setSections(prev => [...prev, newSection])
    setSelectedSection(sections.length)
    setSelectedQuestion(0)
    setEditMode('question')
  }

  const removeSection = (sectionIndex: number) => {
    setSections(prev => prev.filter((_, i) => i !== sectionIndex))
    if (selectedSection >= sectionIndex && selectedSection > 0) {
      setSelectedSection(selectedSection - 1)
    }
  }

  const handleDeleteSection = (sectionIndex: number) => {
    if (isEditMode && sectionIndex < originalSectionsCount) {
      const sectionId = sections[sectionIndex]?.id
      if (sectionId && onDeleteSection) {
        onDeleteSection(sectionId)
      }
    } else {
      removeSection(sectionIndex)
    }
  }

  const updateSectionTitle = (sectionIndex: number, title: string) => {
    setSections(prev => prev.map((section, i) => 
      i === sectionIndex ? { ...section, title } : section
    ))
  }

  const updateSectionDescription = (sectionIndex: number, description: string) => {
    setSections(prev => prev.map((section, i) => 
      i === sectionIndex ? { ...section, description } : section
    ))
  }

  // Question management functions
  const addQuestion = (sectionIndex: number) => {
    const newEntry = emptyEntry(getNextQuestionNumber())
    setSections(prev => prev.map((section, i) => 
      i === sectionIndex 
        ? { ...section, entries: [...section.entries, newEntry] }
        : section
    ))
    setSelectedSection(sectionIndex)
    setSelectedQuestion(sections[sectionIndex].entries.length)
    setEditMode('question')
  }

  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    setSections(prev => prev.map((section, i) => 
      i === sectionIndex 
        ? { ...section, entries: section.entries.filter((_, qI) => qI !== questionIndex) }
        : section
    ))
  }

  const handleDeleteQuestion = (sectionIndex: number, questionIndex: number) => {
    if (isEditMode && 
        sectionIndex < originalSectionsCount && 
        questionIndex < (originalQuestionCounts[sectionIndex] || 0)) {
      const questionId = sections[sectionIndex]?.entries[questionIndex]?.id
      if (questionId && onDeleteQuestion) {
        onDeleteQuestion(questionId, () => {
          removeQuestion(sectionIndex, questionIndex)
          const section = sections[sectionIndex]
          if (section && section.entries.length > 1) {
            const newQuestionIndex = questionIndex > 0 ? questionIndex - 1 : 0
            setSelectedQuestion(newQuestionIndex)
          } else if (sections.length > 0) {
            setEditMode('survey')
          }
        })
      }
    } else {
      removeQuestion(sectionIndex, questionIndex)
      const section = sections[sectionIndex]
      if (section && section.entries.length > 1) {
        const newQuestionIndex = questionIndex > 0 ? questionIndex - 1 : 0
        setSelectedQuestion(newQuestionIndex)
      } else if (sections.length > 0) {
        setEditMode('survey')
      }
    }
  }

  const updateQuestion = (sectionIndex: number, questionIndex: number, updates: Partial<SurveyEntryForm>) => {
    setSections(prev => prev.map((section, i) => 
      i === sectionIndex 
        ? { 
            ...section, 
            entries: section.entries.map((entry, qI) => 
              qI === questionIndex ? { ...entry, ...updates } : entry
            )
          }
        : section
    ))
  }

  // Navigation functions
  const selectSurveySettings = () => {
    setEditMode('survey')
  }

  const selectQuestion = (sectionIndex: number, questionIndex: number) => {
    setSelectedSection(sectionIndex)
    setSelectedQuestion(questionIndex)
    setEditMode('question')
  }

  // Form validation
  const validateForm = (): boolean => {
    if (!surveyName.trim()) {
      toast.error("Survey name is required")
      return false
    }

    if (sections.length === 0) {
      toast.error("At least one section is required")
      return false
    }

    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const section = sections[sectionIndex]
      
      if (!section.title.trim()) {
        toast.error(`Section ${sectionIndex + 1} title is required`)
        return false
      }

      if (section.entries.length === 0) {
        toast.error(`Section "${section.title}" must have at least one question`)
        return false
      }

      for (let questionIndex = 0; questionIndex < section.entries.length; questionIndex++) {
        const question = section.entries[questionIndex]
        const validation = validateSurveyEntry(question)
        
        if (!validation.isValid) {
          toast.error(`Section "${section.title}", Question ${questionIndex + 1}: ${validation.errors[0]}`)
          return false
        }

        // Validate follow-up questions in choices
        for (const choice of question.choices) {
          if (choice.hasFollowUp && choice.followUpQuestion) {
            const followUpValidation = validateSurveyEntry(choice.followUpQuestion)
            if (!followUpValidation.isValid) {
              toast.error(`Follow-up question for "${choice.choiceText}": ${followUpValidation.errors[0]}`)
              return false
            }
          }
        }
      }
    }

    return true
  }

  // Form submission - NEW FORMAT
  const handleSubmit = () => {
    if (!validateForm()) {
      return
    }

    // Build the new payload format
    const payload: CreateSurveyPayload = {
      name: surveyName,
      type: surveyType,
      description: surveyDescription,
      sections: sections.map((section, sIndex) => ({
        title: section.title,
        description: section.description,
        sectionNumber: sIndex + 1,
        entries: flattenEntriesForPayload(section.entries)
      }))
    }

    if (!isEditMode) {
      // Create new survey - use the new mutation
      createSurveyMutation.mutate(payload, {
        onSuccess: () => {
          onCancel() // Go back to list
        }
      })
    } else {
      // Edit mode - convert to legacy format for backward compatibility with parent
      // The parent component (survey.tsx) handles the edit logic
      const legacySections: CreateSurveySection[] = sections.map(section => ({
        title: section.title,
        description: section.description,
        surveyEntries: section.entries.map(entry => ({
          question: entry.question,
          questionImage: entry.questionImage,
          questionImageFile: entry.questionImageFile,
          questionType: entry.questionType,
          choices: entry.choices.map(c => ({
            choice: c.choiceText,
            choiceImage: c.choiceImage,
            choiceImageFile: c.choiceImageFile
          })),
          allowTextAnswer: entry.hasTextInput || false,
          rows: entry.gridRows.map(r => r.rowText),
          required: entry.isRequired,
          questionNumber: entry.questionNumber,
          followUp: entry.isFollowUp,
          parentQuestionNumber: undefined, // Legacy field
          parentChoice: undefined // Legacy field
        }))
      }))

      // Calculate edit metadata for the parent component
      const newSections = sections.length > originalSectionsCount 
        ? legacySections.slice(originalSectionsCount) 
        : []

      const newQuestionsPerSection: { sectionIndex: number; sectionId?: string; newQuestions: CreateSurveyEntry[] }[] = []
      for (let i = 0; i < Math.min(originalSectionsCount, sections.length); i++) {
        const current = sections[i]
        const originalQCount = originalQuestionCounts[i] || 0
        if (current.entries.length > originalQCount) {
          const extras = current.entries.slice(originalQCount).map(entry => ({
            question: entry.question,
            questionImage: entry.questionImage,
            questionImageFile: entry.questionImageFile,
            questionType: entry.questionType,
            choices: entry.choices.map(c => ({
              choice: c.choiceText,
              choiceImage: c.choiceImage,
              choiceImageFile: c.choiceImageFile
            })),
            allowTextAnswer: entry.hasTextInput || false,
            rows: entry.gridRows.map(r => r.rowText),
            required: entry.isRequired,
            questionNumber: entry.questionNumber,
            followUp: entry.isFollowUp,
          }))
          newQuestionsPerSection.push({ 
            sectionIndex: i, 
            sectionId: current.id, 
            newQuestions: extras 
          })
        }
      }

      onSubmit({
        name: surveyName,
        type: surveyType,
        description: surveyDescription,
        sections: legacySections,
        editMetadata: {
          newSections,
          newQuestionsPerSection,
          updatedQuestions: [], // TODO: Track question updates
          updatedSectionTitles: [], // TODO: Track section title updates
        }
      })
    }
  }

  const currentQuestion = sections[selectedSection]?.entries[selectedQuestion]

  // Show loading state when loading survey details
  if (isEditMode && isLoadingDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-[7%] py-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Survey Structure' : 'Create New Survey'}
            </h2>
            <p className="text-gray-600 mt-1">
              {editMode === 'survey' 
                ? (isEditMode ? 'Configure survey settings and manage sections' : 'Configure survey settings and basic information')
                : `Editing ${sections[selectedSection]?.title || `Section ${selectedSection + 1}`} - Question ${selectedQuestion + 1}`
              }
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} className="px-6">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 text-white hover:bg-blue-700 px-6"
              disabled={isSubmitting || isAddingSection || createSurveyMutation.isPending}
            >
              {isEditMode 
                ? (isAddingSection ? "Adding..." : "Save Changes")
                : (isSubmitting || createSurveyMutation.isPending ? "Creating..." : "Create Survey")
              }
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-[7%] py-8">
        <div className="grid grid-cols-12 gap-8 max-w-full">
          {/* Left Sidebar - Navigation */}
          <div className="col-span-3">
            <SurveyNavigationNew
              sections={sections}
              selectedSection={selectedSection}
              selectedQuestion={selectedQuestion}
              editMode={editMode}
              surveyName={surveyName}
              surveyType={surveyType}
              isEditMode={isEditMode}
              originalSectionsCount={originalSectionsCount}
              onSelectSurveySettings={selectSurveySettings}
              onSelectQuestion={selectQuestion}
              onUpdateSectionTitle={updateSectionTitle}
              onUpdateSectionDescription={updateSectionDescription}
              onDeleteSection={handleDeleteSection}
              onDeleteQuestion={handleDeleteQuestion}
              onAddQuestion={addQuestion}
              onAddSection={addSection}
            />
          </div>

          {/* Main Content Area */}
          <div className="col-span-6">
            <Card>
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold">
                  {editMode === 'survey' ? 'Survey Settings' : 'Question Editor'}
                </h3>
              </div>
              
              <div className="p-6">
                {editMode === 'survey' ? (
                  <SurveySettings
                    surveyName={surveyName}
                    setSurveyName={setSurveyName}
                    surveyType={surveyType}
                    setSurveyType={setSurveyType}
                    surveyDescription={surveyDescription}
                    setSurveyDescription={setSurveyDescription}
                    isEditMode={isEditMode}
                  />
                ) : (
                  currentQuestion && (
                    <SingleQuestionEditor
                      question={currentQuestion}
                      onUpdateQuestion={(updates) => updateQuestion(selectedSection, selectedQuestion, updates)}
                      isFirstInSection={selectedQuestion === 0}
                      isEditMode={isEditMode}
                      surveyEntryId={currentQuestion.id}
                      onRefreshSurveyData={onRefreshSurveyData}
                    />
                  )
                )}
              </div>
            </Card>
          </div>

          {/* Right Sidebar - Preview */}
          <div className="col-span-3">
            {editMode === 'question' && currentQuestion && (
              <QuestionPreviewNew question={currentQuestion} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// New Navigation Component (adapts new types to existing SurveyNavigation)
// =============================================================================

function SurveyNavigationNew({
  sections,
  selectedSection,
  selectedQuestion,
  editMode,
  surveyName,
  surveyType,
  isEditMode,
  originalSectionsCount,
  onSelectSurveySettings,
  onSelectQuestion,
  onUpdateSectionTitle,
  onUpdateSectionDescription,
  onDeleteSection,
  onDeleteQuestion,
  onAddQuestion,
  onAddSection
}: {
  sections: SurveySectionForm[]
  selectedSection: number
  selectedQuestion: number
  editMode: 'survey' | 'question'
  surveyName: string
  surveyType: SurveyType
  isEditMode: boolean
  originalSectionsCount: number
  onSelectSurveySettings: () => void
  onSelectQuestion: (sectionIndex: number, questionIndex: number) => void
  onUpdateSectionTitle: (sectionIndex: number, title: string) => void
  onUpdateSectionDescription: (sectionIndex: number, description: string) => void
  onDeleteSection: (sectionIndex: number) => void
  onDeleteQuestion: (sectionIndex: number, questionIndex: number) => void
  onAddQuestion: (sectionIndex: number) => void
  onAddSection: () => void
}) {
  // Convert new sections format to legacy format for existing SurveyNavigation
  const legacySections: CreateSurveySection[] = sections.map(section => ({
    title: section.title,
    description: section.description,
    surveyEntries: section.entries.map(entry => ({
      question: entry.question,
      questionImage: entry.questionImage,
      questionType: entry.questionType,
      choices: entry.choices.map(c => ({ choice: c.choiceText, choiceImage: c.choiceImage })),
      allowTextAnswer: entry.hasTextInput || false,
      rows: entry.gridRows.map(r => r.rowText),
      required: entry.isRequired,
      questionNumber: entry.questionNumber,
      followUp: entry.isFollowUp,
    }))
  }))

  return (
    <SurveyNavigation
      sections={legacySections}
      selectedSection={selectedSection}
      selectedQuestion={selectedQuestion}
      editMode={editMode}
      surveyName={surveyName}
      surveyType={surveyType}
      isEditMode={isEditMode}
      originalSectionsCount={originalSectionsCount}
      onSelectSurveySettings={onSelectSurveySettings}
      onSelectQuestion={onSelectQuestion}
      onUpdateSectionTitle={onUpdateSectionTitle}
      onUpdateSectionDescription={onUpdateSectionDescription}
      onDeleteSection={onDeleteSection}
      onDeleteQuestion={onDeleteQuestion}
      onAddQuestion={onAddQuestion}
      onAddSection={onAddSection}
    />
  )
}

// =============================================================================
// New Preview Component (adapts new types to existing QuestionPreview)
// =============================================================================

function QuestionPreviewNew({ question }: { question: SurveyEntryForm }) {
  // Convert new question format to legacy format for existing QuestionPreview
  const legacyQuestion: CreateSurveyEntry = {
    question: question.question,
    questionImage: question.questionImage,
    questionImageFile: question.questionImageFile,
    questionType: question.questionType,
    choices: question.choices.map(c => ({
      choice: c.choiceText,
      choiceImage: c.choiceImage,
      choiceImageFile: c.choiceImageFile
    })),
    allowTextAnswer: question.hasTextInput || false,
    rows: question.gridRows.map(r => r.rowText),
    required: question.isRequired,
    questionNumber: question.questionNumber,
    followUp: question.isFollowUp,
  }

  return <QuestionPreview question={legacyQuestion} />
}

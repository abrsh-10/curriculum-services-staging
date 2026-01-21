"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { EvaluationEditorProvider, useEvaluationEditor } from "./EvaluationEditorContext"
import { EvaluationSettings } from "./EvaluationSettings"
import { EvaluationNavigation } from "./EvaluationNavigation"
import { SingleEvaluationQuestionEditor } from "./SingleEvaluationQuestionEditor"
import { EvaluationQuestionPreview } from "./EvaluationQuestionPreview"
import { ReadOnlyEvaluationQuestionView } from "./ReadOnlyEvaluationQuestionView"
import { 
  EvaluationFormType, 
  EvaluationSectionForm, 
  EvaluationEntryForm,
  EvaluationChoiceForm,
  EvaluationEntryPayload,
  CreateEvaluationPayload,
  EvaluationSummary
} from "@/lib/hooks/evaluation-types"
import { useCreateEvaluation, useGetEvaluationDetail, useUpdateEvaluationSection, useAddEvaluationSections, useAddQuestionEntry } from "@/lib/hooks/useEvaluation"
import { SectionMetaModal } from "./SectionMetaModal"

// Initial State Helpers
const emptyEntry = (): EvaluationEntryForm => ({
  clientId: crypto.randomUUID(),
  question: "",
  questionType: "TEXT",
  choices: [],
  isFollowUp: false
})

const emptySection = (): EvaluationSectionForm => ({
  title: "Section 1",
  description: "",
  entries: [emptyEntry()]
})

interface CreateEvaluationFormProps {
  trainingId: string
  onCancel: () => void
  editingEvaluation?: EvaluationSummary | null
}

function CreateEvaluationFormInner({ trainingId, onCancel, editingEvaluation }: CreateEvaluationFormProps) {
  // Form State
  const [formType, setFormType] = useState<EvaluationFormType>("PRE")
  const [sections, setSections] = useState<EvaluationSectionForm[]>([emptySection()])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sectionMetaModalOpen, setSectionMetaModalOpen] = useState(false)
  const [sectionMetaIndex, setSectionMetaIndex] = useState<number | null>(null)

  // Fetch evaluation details when editing
  const { data: evaluationDetail, isLoading: isLoadingEvaluation } = useGetEvaluationDetail(
    editingEvaluation?.id || ""
  )

  const isEditMode = !!editingEvaluation

  // Edit hooks for section management
  const updateEvaluationSection = useUpdateEvaluationSection()
  const sectionSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Populate form data when editing - only on initial load/data change
  useEffect(() => {
    if (!editingEvaluation || !evaluationDetail) return

    console.log("Loading evaluation data:", evaluationDetail)

    // Set form type
    setFormType(evaluationDetail.formType)

    // Convert evaluation sections to form format with nested follow-up questions
    const formSections: EvaluationSectionForm[] = evaluationDetail.sections?.map(section => {
      const allQuestions = section.questions || []
      
      // Separate main questions from follow-ups
      const mainQuestions = allQuestions.filter(q => !q.isFollowUp)
      const followUpQuestions = allQuestions.filter(q => q.isFollowUp)
      
      // For each main question, nest its follow-up questions under the relevant choices
      const processedEntries: EvaluationEntryForm[] = mainQuestions.map(question => {
        const baseEntry: EvaluationEntryForm = {
          clientId: question.id || crypto.randomUUID(),
          question: question.question,
          questionImage: question.questionImageUrl || "",
          questionImageFile: undefined,
          questionType: question.questionType,
          isFollowUp: false, // Main questions are never follow-ups
          id: question.id,
          choices: question.choices?.map(choice => {
            // Find follow-up questions triggered by this choice
            const relevantFollowUps = followUpQuestions.filter(followUp => 
              followUp.parentQuestionId === question.id && 
              followUp.triggerChoiceIds?.includes(choice.id)
            )
            
            const choiceWithFollowUp: EvaluationChoiceForm = {
              clientId: choice.id || crypto.randomUUID(),
              choiceText: choice.choiceText,
              choiceImage: choice.choiceImageUrl || "",
              choiceImageFile: undefined,
              id: choice.id,
              hasFollowUp: relevantFollowUps.length > 0
            }
            
            // If there's a follow-up, add it to the choice (for now, just take the first one)
            if (relevantFollowUps.length > 0) {
              const followUp = relevantFollowUps[0] // In current implementation, we support one follow-up per choice
              choiceWithFollowUp.followUpQuestion = {
                clientId: followUp.id || crypto.randomUUID(),
                question: followUp.question,
                questionImage: followUp.questionImageUrl || "",
                questionImageFile: undefined,
                questionType: followUp.questionType,
                choices: followUp.choices?.map(fChoice => ({
                  clientId: fChoice.id || crypto.randomUUID(),
                  choiceText: fChoice.choiceText,
                  choiceImage: fChoice.choiceImageUrl || "",
                  choiceImageFile: undefined,
                  id: fChoice.id
                })) || [],
                isFollowUp: true,
                parentQuestionId: followUp.parentQuestionId || undefined,
                triggerChoiceIds: followUp.triggerChoiceIds || [],
                parentQuestionClientId: question.id, // Set for client-side reference
                triggerChoiceClientIds: [choice.id], // Set for client-side reference
                id: followUp.id
              }
            }
            
            return choiceWithFollowUp
          }) || []
        }
        
        return baseEntry
      })
      
      return {
        id: section.id,
        title: section.title,
        description: section.description,
        entries: processedEntries
      }
    }) || []

    setSections(formSections.length > 0 ? formSections : [emptySection()])

    // Reset selection to first section/question
    setSelectedSection(0)
    setSelectedQuestion(0)
    
    // Start in evaluation mode to show form settings
    setEditorMode('evaluation')
    
  }, [editingEvaluation, evaluationDetail])

  // Use the context for navigation and editor state
  const {
    selectedSection,
    selectedQuestion,
    editorMode,
    questionState,
    setSelectedSection,
    setSelectedQuestion,
    setEditorMode,
    startEditingQuestion,
    startCreatingQuestion,
    stopEditingQuestion,
    navigateToNewQuestion,
    navigateToNewSection,
  } = useEvaluationEditor()

  const createEvaluation = useCreateEvaluation()
  const addSectionsMutation = useAddEvaluationSections()
  const addQuestionEntryMutation = useAddQuestionEntry()

  // Section update functions for edit mode
  const updateSectionTitle = (sectionIndex: number, title: string) => {
    // capture current for PATCH before state change
    const current = sections[sectionIndex]
    const sectionId = current?.id
    const description = current?.description || ""
    
    setSections(prev => prev.map((section, i) => 
      i === sectionIndex ? { ...section, title } : section
    ))
    
    // Debounced PATCH only if this is an existing section
    if (editingEvaluation && sectionId) {
      const key = sectionId
      if (sectionSaveTimers.current[key]) {
        clearTimeout(sectionSaveTimers.current[key])
      }
      sectionSaveTimers.current[key] = setTimeout(() => {
        updateEvaluationSection.mutate({
          sectionId,
          data: { title, description, sectionOrder: sectionIndex + 1 }
        })
      }, 600)
    }
  }

  const updateSectionDescription = (sectionIndex: number, description: string) => {
    // capture current for PATCH before state change
    const current = sections[sectionIndex]
    const sectionId = current?.id
    const title = current?.title || `Section ${sectionIndex + 1}`
    
    setSections(prev => prev.map((section, i) => 
      i === sectionIndex ? { ...section, description } : section
    ))
    
    // Debounced PATCH only if this is an existing section
    if (editingEvaluation && sectionId) {
      const key = sectionId
      if (sectionSaveTimers.current[key]) {
        clearTimeout(sectionSaveTimers.current[key])
      }
      sectionSaveTimers.current[key] = setTimeout(() => {
        updateEvaluationSection.mutate({
          sectionId,
          data: { title, description, sectionOrder: sectionIndex + 1 }
        })
      }, 600)
    }
  }

  // Section management functions
  const addSection = () => {
    const newSectionIndex = sections.length
    const defaultTitle = `Section ${newSectionIndex + 1}`
    const newSection = { ...emptySection(), title: defaultTitle }
    setSections(prev => [...prev, newSection])
    navigateToNewSection(newSectionIndex)
    startCreatingQuestion()
  }

  const removeSection = (sectionIndex: number) => {
    setSections(prev => prev.filter((_, i) => i !== sectionIndex))
    if (selectedSection >= sectionIndex && selectedSection > 0) {
      setSelectedSection(selectedSection - 1)
    }
    if (sections.length <= 1) {
      setEditorMode('evaluation')
    }
  }

  // Question management functions
  const addQuestion = (sectionIndex: number) => {
    const currentSection = sections[sectionIndex]
    const newQuestionIndex = currentSection.entries.length
    
    setSections(prev => prev.map((section, i) => 
      i === sectionIndex 
        ? { 
            ...section, 
            entries: [...section.entries, emptyEntry()]
          }
        : section
    ))
    
    navigateToNewQuestion(sectionIndex, newQuestionIndex)
    startCreatingQuestion()
  }

  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    const currentSection = sections[sectionIndex]
    const willHaveQuestions = currentSection.entries.length > 1
    
    setSections(prev => prev.map((section, i) => 
      i === sectionIndex 
        ? { 
            ...section, 
            entries: section.entries.filter((_, qI) => qI !== questionIndex)
          }
        : section
    ))
    
    // Navigate to a valid question or back to evaluation mode
    if (willHaveQuestions) {
      const newQuestionIndex = questionIndex > 0 ? questionIndex - 1 : 0
      setSelectedQuestion(newQuestionIndex)
    } else if (sections.length > 0) {
      setEditorMode('evaluation')
    }
  }

  const updateQuestion = (sectionIndex: number, questionIndex: number, updates: Partial<EvaluationEntryForm>) => {
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
  const selectEvaluationSettings = () => {
    setEditorMode('evaluation')
  }

  const selectQuestion = (sectionIndex: number, questionIndex: number) => {
    setSelectedSection(sectionIndex)
    setSelectedQuestion(questionIndex)
    setEditorMode('question')
    stopEditingQuestion() // Reset to viewing mode when navigating
  }

  // No longer need parent questions logic since follow-ups are choice-based

  // Form validation
  const validateForm = () => {
    if (sections.length === 0) {
      toast.error("At least one section is required")
      return false
    }

    // Build sanitized sections: drop sections with no title and no valid questions
    const sanitizedSections = sections
      .map((section) => ({
        ...section,
        entries: section.entries.filter((q) => q.question.trim())
      }))
      .filter((section) => section.title.trim() || section.entries.length > 0)

    if (sanitizedSections.length === 0) {
      toast.error("At least one section with questions is required")
      return false
    }

    for (let sectionIndex = 0; sectionIndex < sanitizedSections.length; sectionIndex++) {
      const section = sanitizedSections[sectionIndex]
      
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
        
        if (!question.question.trim()) {
          toast.error(`Section "${section.title}", Question ${questionIndex + 1}: Question text is required`)
          return false
        }

        // Validate follow-up questions
        if (question.isFollowUp) {
          if (!question.parentQuestionClientId) {
            toast.error(`Section "${section.title}", Question ${questionIndex + 1}: Parent question is required for follow-up questions`)
            return false
          }
          if (!question.triggerChoiceClientIds || question.triggerChoiceClientIds.length === 0) {
            toast.error(`Section "${section.title}", Question ${questionIndex + 1}: At least one trigger choice is required for follow-up questions`)
            return false
          }
        }

        // Validate choice-based questions
        if ((question.questionType === "RADIO" || question.questionType === "CHECKBOX") && question.choices.length === 0) {
          toast.error(`Section "${section.title}", Question ${questionIndex + 1}: At least one choice is required for choice-based questions`)
          return false
        }
      }
    }

    return true
  }

  // Form submission (Create only; Edit is handled per-question)
  const handleSubmit = () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    // Sanitize sections: remove empty questions and drop sections without title and questions
    const sanitizedSections = sections
      .map((section) => ({
        ...section,
        entries: section.entries.filter((q) => q.question.trim())
      }))
      .filter((section) => section.title.trim() || section.entries.length > 0)

    // Build payload differently for create vs edit
    if (!isEditMode) {
      // CREATE (multipart)
      // Preserve sections: flatten follow-ups within each section separately
      const sectionsPayload = sanitizedSections.map((section) => {
        const sectionEntries: EvaluationEntryPayload[] = []
        section.entries.forEach(entry => {
          // Main question (include file fields at runtime; cast to payload type)
          const mainEntry = {
            clientId: entry.clientId,
            question: entry.question,
            questionImage: entry.questionImage,
            questionImageFile: entry.questionImageFile,
            questionType: entry.questionType,
            choices: entry.choices.map(choice => ({
              clientId: choice.clientId,
              choiceText: choice.choiceText,
              choiceImage: choice.choiceImage,
              choiceImageFile: (choice as any).choiceImageFile
            })),
            isFollowUp: entry.isFollowUp,
            parentQuestionClientId: entry.parentQuestionClientId,
            triggerChoiceClientIds: entry.triggerChoiceClientIds,
            parentQuestionId: entry.parentQuestionId,
            triggerChoiceIds: entry.triggerChoiceIds
          } as unknown as EvaluationEntryPayload
          sectionEntries.push(mainEntry)
          // Follow-up questions inside choices
          entry.choices.forEach(choice => {
            if (choice.hasFollowUp && choice.followUpQuestion) {
              const followEntry = {
                clientId: choice.followUpQuestion.clientId,
                question: choice.followUpQuestion.question,
                questionImage: choice.followUpQuestion.questionImage,
                questionImageFile: choice.followUpQuestion.questionImageFile,
                questionType: choice.followUpQuestion.questionType,
                choices: (choice.followUpQuestion.choices || []).map(fChoice => ({
                  clientId: fChoice.clientId,
                  choiceText: fChoice.choiceText,
                  choiceImage: fChoice.choiceImage,
                  choiceImageFile: (fChoice as any).choiceImageFile
                })),
                isFollowUp: true,
                parentQuestionClientId: entry.clientId,
                triggerChoiceClientIds: [choice.clientId],
                parentQuestionId: undefined,
                triggerChoiceIds: undefined
              } as unknown as EvaluationEntryPayload
              sectionEntries.push(followEntry)
            }
          })
        })
        return {
          title: section.title,
          description: section.description,
          entries: sectionEntries
        }
      })

      const payload: CreateEvaluationPayload = {
        formType,
        sections: sectionsPayload
      }

      createEvaluation.mutate({ trainingId, data: payload }, {
        onSuccess: () => {
          setIsSubmitting(false)
          toast.success("Evaluation form created successfully")
          onCancel()
        },
        onError: () => {
          setIsSubmitting(false)
        }
      })
    } else {
      // EDIT: No global submit; updates are per-question via Update buttons.
      setIsSubmitting(false)
      toast.info("Use the Update button under each question to save changes.")
    }
  }

  const currentQuestion = sections[selectedSection]?.entries[selectedQuestion]
  const evaluationName = isEditMode 
    ? `${formType} Training Evaluation (${editingEvaluation?.formType === formType ? 'Editing' : 'Changed to ' + formType})`
    : `${formType} Training Evaluation`

  // Show loading state when in edit mode and data is still loading
  if (isEditMode && isLoadingEvaluation) {
    return (
      <div className="min-h-screen bg-gray-50 w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading evaluation data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Header */}
      <div className="bg-white border-b w-full">
        <div className="px-[7%] py-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditMode ? "Edit Evaluation Form" : "Create Evaluation Form"}
              </h2>
              <p className="text-gray-600 mt-1">
                {editorMode === 'evaluation' 
                  ? "Configure evaluation settings" 
                  : `Editing ${sections[selectedSection]?.title || `Section ${selectedSection + 1}`} - Question ${selectedQuestion + 1}`}
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="px-6">
                Cancel
              </Button>
              
              {!isEditMode && (
                <Button
                  onClick={handleSubmit}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-6"
                  disabled={isSubmitting || createEvaluation.isPending}
                >
                  {isSubmitting || createEvaluation.isPending ? "Creating..." : "Create Evaluation"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full">
        <div className="px-[7%] py-8">
          <div className="grid grid-cols-12 gap-8 max-w-full w-full">
            {/* Left Sidebar - Navigation */}
            <div className="col-span-3">
              <EvaluationNavigation
                sections={sections}
                selectedSection={selectedSection}
                selectedQuestion={selectedQuestion}
                editMode={editorMode}
                evaluationName={evaluationName}
                isEditMode={isEditMode}
                canAddSection={true}
                disableEvaluationSettings={false}
                onSelectEvaluationSettings={selectEvaluationSettings}
                onSelectQuestion={selectQuestion}
                onUpdateSectionTitle={updateSectionTitle}
                onUpdateSectionDescription={updateSectionDescription}
                onDeleteSection={removeSection}
                onDeleteQuestion={removeQuestion}
                onAddQuestion={addQuestion}
                onAddSection={addSection}
                onSaveSectionMeta={(idx, title, description) => {
                  setSections(prev => prev.map((s, i) => i === idx ? { ...s, title, description } : s))
                }}
                onReorderSections={(fromIdx, toIdx) => {
                  if (fromIdx === toIdx) return
                  setSections(prev => {
                    const next = [...prev]
                    const [moved] = next.splice(fromIdx, 1)
                    next.splice(toIdx, 0, moved)
                    // Adjust selection index to follow moved section naturally
                    let nextSelected = selectedSection
                    if (selectedSection === fromIdx) nextSelected = toIdx
                    else if (fromIdx < selectedSection && toIdx >= selectedSection) nextSelected = selectedSection - 1
                    else if (fromIdx > selectedSection && toIdx <= selectedSection) nextSelected = selectedSection + 1
                    setSelectedSection(Math.max(0, Math.min(next.length - 1, nextSelected)))
                    return next
                  })
                }}
                onOpenSectionEditModal={(idx) => {
                  setSectionMetaIndex(idx)
                  setSectionMetaModalOpen(true)
                }}
                onPersistNewSection={(idx) => {
                  const section = sections[idx]
                  if (!section) return
                  
                  // Build entries for the entire section (new section)
                  const entries: EvaluationEntryPayload[] = []
                  section.entries.forEach((entry) => {
                    // Main question
                    entries.push({
                      clientId: entry.clientId,
                      question: entry.question,
                      questionImage: entry.questionImage,
                      questionImageFile: entry.questionImageFile,
                      questionType: entry.questionType,
                      choices: entry.choices.map((choice) => ({
                        clientId: choice.clientId,
                        choiceText: choice.choiceText,
                        choiceImage: choice.choiceImage,
                        choiceImageFile: choice.choiceImageFile
                      })),
                      isFollowUp: false,
                      parentQuestionClientId: undefined,
                      triggerChoiceClientIds: undefined,
                      parentQuestionId: undefined,
                      triggerChoiceIds: undefined
                    })
                    
                    // Follow-ups
                    entry.choices.forEach((choice) => {
                      if (choice.hasFollowUp && choice.followUpQuestion) {
                        const follow = choice.followUpQuestion
                        entries.push({
                          clientId: follow.clientId,
                          question: follow.question,
                          questionImage: follow.questionImage,
                          questionImageFile: follow.questionImageFile,
                          questionType: follow.questionType,
                          choices: (follow.choices || []).map((fChoice) => ({
                            clientId: fChoice.clientId,
                            choiceText: fChoice.choiceText,
                            choiceImage: fChoice.choiceImage,
                            choiceImageFile: fChoice.choiceImageFile
                          })),
                          isFollowUp: true,
                          parentQuestionClientId: entry.clientId,
                          triggerChoiceClientIds: [choice.clientId],
                          parentQuestionId: undefined,
                          triggerChoiceIds: undefined
                        })
                      }
                    })
                  })
                  
                  addSectionsMutation.mutate({
                    formId: editingEvaluation?.id || "",
                    sections: [{
                      title: section.title,
                      description: section.description,
                      entries
                    }]
                  })
                }}
              />
            </div>

            {/* Main Content Area */}
            <div className="col-span-6">
              <Card className="w-full">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">
                    {editorMode === 'evaluation' ? 'Evaluation Settings' : 'Question Editor'}
                  </h3>
                </div>
                
                <div className="p-6">
                  {editorMode === 'evaluation' ? (
                    <EvaluationSettings 
                      formType={formType} 
                      setFormType={setFormType}
                      onNext={() => {
                        setEditorMode('question')
                        if (sections.length > 0 && sections[0].entries.length > 0) {
                          setSelectedSection(0)
                          setSelectedQuestion(0)
                          startCreatingQuestion()
                        }
                      }}
                    />
                  ) : (
                    currentQuestion && (
                      <>
                        {questionState !== 'viewing' ? (
                          <SingleEvaluationQuestionEditor
                            key={`${selectedSection}-${selectedQuestion}-${currentQuestion.clientId}`}
                            question={currentQuestion}
                            onUpdateQuestion={(updates) => updateQuestion(selectedSection, selectedQuestion, updates)}
                            isCreatingNew={!isEditMode}
                            isEditMode={isEditMode}
                            sectionId={sections[selectedSection]?.id}
                            onAddQuestion={isEditMode && !currentQuestion.id ? async () => {
                              // Persist only this new question (and its follow-ups)
                              const section = sections[selectedSection]
                              if (!section) return
                              const entry = section.entries[selectedQuestion]
                              if (!entry) return

                              // If editing within an existing section: POST entry to section
                              if (section.id) {
                                // Main question
                                await addQuestionEntryMutation.mutateAsync({
                                  sectionId: section.id,
                                  entry: {
                                    clientId: entry.clientId,
                                    question: entry.question,
                                    questionImage: entry.questionImage,
                                    questionImageFile: entry.questionImageFile,
                                    questionType: entry.questionType,
                                    choices: entry.choices.map((choice) => ({
                                      clientId: choice.clientId,
                                      choiceText: choice.choiceText,
                                      choiceImage: choice.choiceImage,
                                      choiceImageFile: choice.choiceImageFile
                                    })),
                                    isFollowUp: false
                                  }
                                })

                                // Follow-ups (if any)
                                for (const choice of entry.choices) {
                                  if (choice.hasFollowUp && choice.followUpQuestion) {
                                    const follow = choice.followUpQuestion
                                    await addQuestionEntryMutation.mutateAsync({
                                      sectionId: section.id,
                                      entry: {
                                        clientId: follow.clientId,
                                        question: follow.question,
                                        questionImage: follow.questionImage,
                                        questionImageFile: follow.questionImageFile,
                                        questionType: follow.questionType,
                                        choices: (follow.choices || []).map((fChoice) => ({
                                          clientId: fChoice.clientId,
                                          choiceText: fChoice.choiceText,
                                          choiceImage: fChoice.choiceImage,
                                          choiceImageFile: fChoice.choiceImageFile
                                        })),
                                        isFollowUp: true,
                                        parentQuestionClientId: entry.clientId,
                                        triggerChoiceClientIds: [choice.clientId]
                                      }
                                    })
                                  }
                                }
                              } else {
                                // If section not yet persisted, fallback to add whole section approach
                                const entries: EvaluationEntryPayload[] = []
                                entries.push({
                                  clientId: entry.clientId,
                                  question: entry.question,
                                  questionImage: entry.questionImage,
                                  questionImageFile: entry.questionImageFile,
                                  questionType: entry.questionType,
                                  choices: entry.choices.map((choice) => ({
                                    clientId: choice.clientId,
                                    choiceText: choice.choiceText,
                                    choiceImage: choice.choiceImage,
                                    choiceImageFile: choice.choiceImageFile
                                  })),
                                  isFollowUp: false
                                })
                                entry.choices.forEach((choice) => {
                                  if (choice.hasFollowUp && choice.followUpQuestion) {
                                    const follow = choice.followUpQuestion
                                    entries.push({
                                      clientId: follow.clientId,
                                      question: follow.question,
                                      questionImage: follow.questionImage,
                                      questionImageFile: follow.questionImageFile,
                                      questionType: follow.questionType,
                                      choices: (follow.choices || []).map((fChoice) => ({
                                        clientId: fChoice.clientId,
                                        choiceText: fChoice.choiceText,
                                        choiceImage: fChoice.choiceImage,
                                        choiceImageFile: fChoice.choiceImageFile
                                      })),
                                      isFollowUp: true,
                                      parentQuestionClientId: entry.clientId,
                                      triggerChoiceClientIds: [choice.clientId]
                                    })
                                  }
                                })
                                addSectionsMutation.mutate({
                                  formId: editingEvaluation?.id || "",
                                  sections: [{
                                    title: section.title,
                                    description: section.description,
                                    entries
                                  }]
                                })
                              }
                            } : undefined}
                          />
                        ) : (
                          <>
                            <div className="mb-4 flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  Question {selectedQuestion + 1}
                                </Badge>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Ready
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                onClick={startEditingQuestion}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Edit Question
                              </Button>
                            </div>
                            <ReadOnlyEvaluationQuestionView question={currentQuestion} />
                          </>
                        )}
                      </>
                    )
                  )}
                </div>
              </Card>
            </div>

            {/* Right Sidebar - Preview */}
            <div className="col-span-3">
              {editorMode === 'question' && currentQuestion && (
                <EvaluationQuestionPreview question={currentQuestion} />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Section Meta Modal (title, description, order) */}
      {sectionMetaIndex !== null && (
        <SectionMetaModal
          isOpen={sectionMetaModalOpen}
          onClose={() => setSectionMetaModalOpen(false)}
          sectionIndex={sectionMetaIndex}
          totalSections={sections.length}
          initialTitle={sections[sectionMetaIndex]?.title || `Section ${sectionMetaIndex + 1}`}
          initialDescription={sections[sectionMetaIndex]?.description || ""}
          initialOrder={sectionMetaIndex + 1}
          isSaving={updateEvaluationSection.isPending}
          onSave={async (next) => {
            const { title, description, order } = next
            const currentIndex = sectionMetaIndex
            if (currentIndex == null) return

            // Update local meta
            setSections(prev => prev.map((s, i) => i === currentIndex ? { ...s, title, description } : s))

            // Update order locally if changed
            if (order !== currentIndex + 1) {
              setSections(prev => {
                const nextArr = [...prev]
                const [moved] = nextArr.splice(currentIndex, 1)
                nextArr.splice(Math.max(0, Math.min(order - 1, nextArr.length)), 0, moved)
                return nextArr
              })
              setSelectedSection(Math.max(0, Math.min(order - 1, sections.length - 1)))
            }

            // Persist meta/order to server if this section exists
            const sectionId = sections[currentIndex]?.id
            if (isEditMode && sectionId) {
              await updateEvaluationSection.mutateAsync({
                sectionId,
                data: {
                  title,
                  description,
                  sectionOrder: order
                }
              })
            }

            setSectionMetaModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

export function CreateEvaluationForm(props: CreateEvaluationFormProps) {
  return (
    <EvaluationEditorProvider>
      <CreateEvaluationFormInner {...props} />
    </EvaluationEditorProvider>
  )
}


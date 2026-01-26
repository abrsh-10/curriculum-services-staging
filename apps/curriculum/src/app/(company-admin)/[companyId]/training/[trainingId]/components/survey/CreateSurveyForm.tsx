"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

// Types and hooks
import { 
  SurveyType,
  SurveySectionForm,
  SurveyEntryForm,
  SurveyChoiceForm,
  SurveyGridRowForm,
  CreateSurveyPayload,
  emptySection,
  emptyEntry,
  validateSurveyEntry,
  flattenEntriesForPayload,
} from "@/lib/hooks/survey-types"

import {
  useCreateSurveyNew,
  useSurveyDetailNew,
  useAddSectionsBulk,
  useAddEntryToSection,
  useUpdateSurveyEntry,
  useUpdateChoice,
  useUpdateGridRow,
  useUpdateSurveySection,
  useAddChoice,
  useAddGridRow,
  useDeleteChoice,
  useDeleteGridRow
} from "@/lib/hooks/useSurvey"

// Import the components
import { SurveySettings } from "./components/SurveySettings"
import { SurveyNavigation } from "./components/SurveyNavigation"
import { QuestionPreview } from "./components/QuestionPreviews"
import { SingleQuestionEditor } from "./components/SingleQuestionEditor"

interface CreateSurveyFormProps {
  trainingId: string
  onCancel: () => void
  onSubmit: () => void
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

  // Create survey mutation (new format)
  const createSurveyMutation = useCreateSurveyNew(trainingId)
  
  // Hooks for adding sections and entries in edit mode
  const addSectionsBulkMutation = useAddSectionsBulk(editingSurveyId || "")
  const { addEntryAsync, isLoading: isAddingEntry } = useAddEntryToSection()
  const isAddingSection = addSectionsBulkMutation.isPending

  // Update hooks for edit mode
  const { updateSurveyEntry, updateSurveyEntryAsync, isLoading: isUpdatingEntry } = useUpdateSurveyEntry()
  const { updateChoice, updateChoiceAsync, isLoading: isUpdatingChoice } = useUpdateChoice()
  const { updateGridRow, updateGridRowAsync, isLoading: isUpdatingGridRow } = useUpdateGridRow()
  const { updateSurveySection: updateSection, isLoading: isUpdatingSection } = useUpdateSurveySection()
  
  // Add hooks for new choices and grid rows
  const { addChoiceAsync, isLoading: isAddingChoiceItem } = useAddChoice()
  const { addGridRowAsync, isLoading: isAddingGridRowItem } = useAddGridRow()
  
  // Delete hooks for removing old choices and grid rows when type changes
  const { deleteChoiceAsync } = useDeleteChoice()
  const { deleteGridRowAsync } = useDeleteGridRow()
  
  // State for tracking which question is being saved
  const [isSavingCurrentQuestion, setIsSavingCurrentQuestion] = useState(false)

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

  // =============================================================================
  // CHANGE DETECTION HELPERS
  // =============================================================================
  
  // Check if an entry (question) has changed
  const hasEntryChanged = (current: SurveyEntryForm, original: SurveyEntryForm): boolean => {
    // Text/basic field changes
    if (current.question !== original.question) return true
    if (current.questionType !== original.questionType) return true
    if (current.isRequired !== original.isRequired) return true
    if (current.hasTextInput !== original.hasTextInput) return true
    
    // Image changes: new file uploaded, or image removed
    if (current.questionImageFile instanceof File) return true
    if (current.questionImage !== original.questionImage) return true
    
    return false
  }
  
  // Check if a choice has changed
  const hasChoiceChanged = (current: SurveyChoiceForm, original: SurveyChoiceForm): boolean => {
    if (current.choiceText !== original.choiceText) return true
    if (current.choiceOrder !== original.choiceOrder) return true
    if (current.hasTextInput !== original.hasTextInput) return true
    
    // Image changes: new file uploaded, or image removed
    if (current.choiceImageFile instanceof File) return true
    if (current.choiceImage !== original.choiceImage) return true
    
    return false
  }
  
  // Check if a grid row has changed
  const hasGridRowChanged = (current: SurveyGridRowForm, original: SurveyGridRowForm): boolean => {
    if (current.rowText !== original.rowText) return true
    if (current.rowNumber !== original.rowNumber) return true
    
    // Image changes
    if (current.rowImageFile instanceof File) return true
    if (current.rowImage !== original.rowImage) return true
    
    return false
  }
  
  // Check if section has changed
  const hasSectionChanged = (current: SurveySectionForm, original: SurveySectionForm): boolean => {
    return current.title !== original.title || current.description !== original.description
  }

  // =============================================================================
  // SAVE CURRENT QUESTION (for existing entries - save immediately)
  // =============================================================================
  
  const handleSaveCurrentQuestion = async (): Promise<void> => {
    const currentEntry = sections[selectedSection]?.entries[selectedQuestion]
    const originalEntry = originalSectionsSnapshot[selectedSection]?.entries[selectedQuestion]
    
    if (!currentEntry || !currentEntry.id) {
      toast.error("Cannot save: Question doesn't exist or is a new question")
      return
    }
    
    // Validate the entry first
    const validation = validateSurveyEntry(currentEntry)
    if (!validation.isValid) {
      toast.error(validation.errors[0])
      return
    }
    
    setIsSavingCurrentQuestion(true)
    
    try {
      const promises: Promise<unknown>[] = []
      
      // 1. Update entry itself ONLY if it has changed (question text, type, required, image)
      // Note: We don't include choices/gridRows here - they're handled separately
      if (originalEntry && hasEntryChanged(currentEntry, originalEntry)) {
        promises.push(
          updateSurveyEntryAsync({
            entryId: currentEntry.id,
            data: {
              question: currentEntry.question,
              questionNumber: currentEntry.questionNumber,
              questionType: currentEntry.questionType,
              isRequired: currentEntry.isRequired,
              questionImageFile: currentEntry.questionImageFile
            }
          })
        )
      }
      
      // 2. Delete old choices that are no longer present (e.g., when type changed)
      const currentChoiceIds = new Set(currentEntry.choices.map(c => c.id).filter(Boolean))
      const originalChoicesWithIds = originalEntry?.choices?.filter(c => c.id) || []
      
      for (const originalChoice of originalChoicesWithIds) {
        if (originalChoice.id && !currentChoiceIds.has(originalChoice.id)) {
          // This choice was in original but not in current - DELETE it
          promises.push(
            deleteChoiceAsync(originalChoice.id).catch(err => {
              console.error(`Failed to delete choice ${originalChoice.id}:`, err)
            })
          )
        }
      }
      
      // 3. Handle choices - separate new vs existing
      for (let ci = 0; ci < currentEntry.choices.length; ci++) {
        const choice = currentEntry.choices[ci]
        const originalChoice = originalEntry?.choices?.find(oc => oc.id === choice.id)
        
        if (!choice.id) {
          // NEW choice - use POST to add
          promises.push(
            addChoiceAsync({
              entryId: currentEntry.id,
              choiceData: {
                clientId: choice.clientId,
                choiceOrder: choice.choiceOrder || String.fromCharCode(65 + ci),
                choiceText: choice.choiceText,
                choiceImageFile: choice.choiceImageFile,
                hasTextInput: choice.hasTextInput || false
              }
            })
          )
        } else if (originalChoice && hasChoiceChanged(choice, originalChoice)) {
          // EXISTING choice with changes - use PUT to update
          promises.push(
            updateChoiceAsync({
              choiceId: choice.id,
              data: {
                clientId: choice.clientId,
                choiceOrder: choice.choiceOrder || String.fromCharCode(65 + ci),
                choiceText: choice.choiceText,
                choiceImageFile: choice.choiceImageFile,
                hasTextInput: choice.hasTextInput || false
              }
            })
          )
        }
      }
      
      // 4. Delete old grid rows that are no longer present (e.g., when type changed)
      const currentGridRowIds = new Set(currentEntry.gridRows.map(r => r.id).filter(Boolean))
      const originalGridRowsWithIds = originalEntry?.gridRows?.filter(r => r.id) || []
      
      for (const originalRow of originalGridRowsWithIds) {
        if (originalRow.id && !currentGridRowIds.has(originalRow.id)) {
          // This grid row was in original but not in current - DELETE it
          promises.push(
            deleteGridRowAsync(originalRow.id).catch(err => {
              console.error(`Failed to delete grid row ${originalRow.id}:`, err)
            })
          )
        }
      }
      
      // 5. Handle grid rows - separate new vs existing
      for (let ri = 0; ri < currentEntry.gridRows.length; ri++) {
        const row = currentEntry.gridRows[ri]
        const originalRow = originalEntry?.gridRows?.find(or => or.id === row.id)
        
        if (!row.id) {
          // NEW grid row - use POST to add
          promises.push(
            addGridRowAsync({
              entryId: currentEntry.id,
              rowData: {
                rowNumber: row.rowNumber || ri + 1,
                rowText: row.rowText,
                rowImageFile: row.rowImageFile
              }
            })
          )
        } else if (originalRow && hasGridRowChanged(row, originalRow)) {
          // EXISTING grid row with changes - use PUT to update
          promises.push(
            updateGridRowAsync({
              gridRowId: row.id,
              data: {
                rowNumber: row.rowNumber || ri + 1,
                rowText: row.rowText,
                rowImageFile: row.rowImageFile
              }
            })
          )
        }
      }
      
      // Wait for all basic operations first
      await Promise.all(promises)
      
      // 6. Handle follow-up questions - create new ones with isFollowUp: true
      // After choices are saved, we may need to refresh to get new choice IDs
      const followUpPromises: Promise<unknown>[] = []
      
      // Calculate the next question number for follow-ups
      const nextQuestionNumber = getNextQuestionNumber()
      let followUpQuestionCounter = 0
      
      for (const choice of currentEntry.choices) {
        if (choice.hasFollowUp && choice.followUpQuestion) {
          const followUp = choice.followUpQuestion
          
          // Only create NEW follow-ups (no ID yet)
          // Existing follow-ups are updated via normal entry update flow
          if (!followUp.id && choice.id && currentEntry.id) {
            // NEW follow-up for an EXISTING choice (choice has ID from server)
            const followUpNumber = nextQuestionNumber + followUpQuestionCounter
            followUpQuestionCounter++
            
            followUpPromises.push(
              addEntryAsync({
                sectionId: sections[selectedSection].id!,
                entryData: {
                  clientId: followUp.clientId,
                  question: followUp.question,
                  questionNumber: followUpNumber,
                  questionType: followUp.questionType,
                  isRequired: followUp.isRequired,
                  isFollowUp: true,
                  parentQuestionId: currentEntry.id, // Use ID since parent exists
                  triggerChoiceIds: [choice.id], // Use ID since choice exists
                  questionImageFile: followUp.questionImageFile,
                  choices: followUp.choices.map((c, ci) => ({
                    clientId: c.clientId,
                    choiceOrder: c.choiceOrder || String.fromCharCode(65 + ci),
                    choiceText: c.choiceText,
                    choiceImageFile: c.choiceImageFile,
                    hasTextInput: c.hasTextInput || false
                  })),
                  gridRows: followUp.gridRows.map((r, ri) => ({
                    rowNumber: r.rowNumber || ri + 1,
                    rowText: r.rowText,
                    rowImageFile: r.rowImageFile
                  }))
                }
              }).catch(err => {
                console.error(`Failed to create follow-up:`, err)
              })
            )
          } else if (!followUp.id && !choice.id) {
            // NEW follow-up for a NEW choice (choice has no ID yet, only clientId)
            // This happens when both choice and follow-up are new
            const followUpNumber = nextQuestionNumber + followUpQuestionCounter
            followUpQuestionCounter++
            
            followUpPromises.push(
              addEntryAsync({
                sectionId: sections[selectedSection].id!,
                entryData: {
                  clientId: followUp.clientId,
                  question: followUp.question,
                  questionNumber: followUpNumber,
                  questionType: followUp.questionType,
                  isRequired: followUp.isRequired,
                  isFollowUp: true,
                  parentQuestionClientId: currentEntry.clientId, // Use clientId since parent is new
                  triggerChoiceClientIds: [choice.clientId], // Use clientId since choice is new
                  questionImageFile: followUp.questionImageFile,
                  choices: followUp.choices.map((c, ci) => ({
                    clientId: c.clientId,
                    choiceOrder: c.choiceOrder || String.fromCharCode(65 + ci),
                    choiceText: c.choiceText,
                    choiceImageFile: c.choiceImageFile,
                    hasTextInput: c.hasTextInput || false
                  })),
                  gridRows: followUp.gridRows.map((r, ri) => ({
                    rowNumber: r.rowNumber || ri + 1,
                    rowText: r.rowText,
                    rowImageFile: r.rowImageFile
                  }))
                }
              }).catch(err => {
                console.error(`Failed to create follow-up:`, err)
              })
            )
          }
          // Note: Existing follow-ups (with ID) are handled by normal entry updates
        }
      }
      
      if (followUpPromises.length > 0) {
        await Promise.all(followUpPromises)
      }
      
      // Count what was actually changed
      const totalOperations = promises.length + followUpPromises.length
      
      if (totalOperations > 0) {
        toast.success("Question saved successfully!")
        
        // Update snapshot for this entry to reflect saved state
        const newSnapshot = JSON.parse(JSON.stringify(originalSectionsSnapshot))
        if (newSnapshot[selectedSection] && newSnapshot[selectedSection].entries[selectedQuestion]) {
          newSnapshot[selectedSection].entries[selectedQuestion] = JSON.parse(JSON.stringify(currentEntry))
        }
        setOriginalSectionsSnapshot(newSnapshot)
        
        // Refresh data to get any server-generated IDs for new choices/gridRows
        onRefreshSurveyData?.()
      } else {
        toast.info("No changes to save")
      }
      
    } catch (error) {
      console.error("Failed to save question:", error)
      toast.error("Failed to save question changes")
    } finally {
      setIsSavingCurrentQuestion(false)
    }
  }

  // =============================================================================
  // FORM SUBMISSION
  // =============================================================================
  
  const handleSubmit = async () => {
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
      return
    }

    // =============================================================================
    // EDIT MODE - Detect and apply changes directly via API
    // =============================================================================
    
    let totalChanges = 0
    let successCount = 0
    let failureCount = 0
    const pendingPromises: Promise<void>[] = []
    
    // Track completion
    const trackSuccess = () => { successCount++ }
    const trackFailure = () => { failureCount++ }
    
    // 1. Detect section title changes
    for (let si = 0; si < Math.min(sections.length, originalSectionsSnapshot.length); si++) {
      const current = sections[si]
      const original = originalSectionsSnapshot[si]
      
      if (current.id && hasSectionChanged(current, original)) {
        totalChanges++
        const promise = new Promise<void>((resolve) => {
          updateSection({ 
            sectionId: current.id!, 
            data: { 
              title: current.title, 
              description: current.description,
              sectionNumber: current.sectionNumber || si + 1
            }
          }, {
            onSuccess: () => { trackSuccess(); resolve() },
            onError: () => { trackFailure(); resolve() }
          })
        })
        pendingPromises.push(promise)
      }
    }
    
    // 2. Detect question (entry) changes
    for (let si = 0; si < Math.min(sections.length, originalSectionsSnapshot.length); si++) {
      const currentSection = sections[si]
      const originalSection = originalSectionsSnapshot[si]
      
      for (let qi = 0; qi < Math.min(currentSection.entries.length, originalSection.entries.length); qi++) {
        const currentEntry = currentSection.entries[qi]
        const originalEntry = originalSection.entries[qi]
        
        // Skip if no server ID (new question)
        if (!currentEntry.id) continue
        
        // Check if entry itself changed
        if (hasEntryChanged(currentEntry, originalEntry)) {
          totalChanges++
          const promise = new Promise<void>((resolve) => {
            // Only send questionImageFile if there's a new file to upload
            // Don't send questionImage URL - backend expects File, not URL
            updateSurveyEntry({
              entryId: currentEntry.id!,
              data: {
                question: currentEntry.question,
                questionNumber: currentEntry.questionNumber,
                questionType: currentEntry.questionType,
                isRequired: currentEntry.isRequired,
                questionImageFile: currentEntry.questionImageFile // Only send if it's a File
              }
            }, {
              onSuccess: () => { trackSuccess(); resolve() },
              onError: () => { trackFailure(); resolve() }
            })
          })
          pendingPromises.push(promise)
        }
        
        // 3. Detect choice changes
        for (let ci = 0; ci < Math.min(currentEntry.choices.length, originalEntry.choices.length); ci++) {
          const currentChoice = currentEntry.choices[ci]
          const originalChoice = originalEntry.choices[ci]
          
          // Skip if no server ID (new choice)
          if (!currentChoice.id) continue
          
          if (hasChoiceChanged(currentChoice, originalChoice)) {
            totalChanges++
            const promise = new Promise<void>((resolve) => {
              // Only send choiceImageFile if there's a new file to upload
              // Don't send choiceImage URL - backend expects File, not URL
              updateChoice({
                choiceId: currentChoice.id!,
                data: {
                  clientId: currentChoice.clientId,
                  choiceOrder: currentChoice.choiceOrder || String.fromCharCode(65 + ci),
                  choiceText: currentChoice.choiceText,
                  choiceImageFile: currentChoice.choiceImageFile, // Only send if it's a File
                  hasTextInput: currentChoice.hasTextInput || false
                }
              }, {
                onSuccess: () => { trackSuccess(); resolve() },
                onError: () => { trackFailure(); resolve() }
              })
            })
            pendingPromises.push(promise)
          }
        }
        
        // 4. Detect grid row changes (for GRID questions)
        if (currentEntry.questionType === 'GRID') {
          for (let ri = 0; ri < Math.min(currentEntry.gridRows.length, originalEntry.gridRows.length); ri++) {
            const currentRow = currentEntry.gridRows[ri]
            const originalRow = originalEntry.gridRows[ri]
            
            // Skip if no server ID (new row)
            if (!currentRow.id) continue
            
            if (hasGridRowChanged(currentRow, originalRow)) {
              totalChanges++
              const promise = new Promise<void>((resolve) => {
                // Only send rowImageFile if there's a new file to upload
                // Don't send rowImage URL - backend expects File, not URL
                updateGridRow({
                  gridRowId: currentRow.id!,
                  data: {
                    rowNumber: currentRow.rowNumber || ri + 1,
                    rowText: currentRow.rowText,
                    rowImageFile: currentRow.rowImageFile // Only send if it's a File
                  }
                }, {
                  onSuccess: () => { trackSuccess(); resolve() },
                  onError: () => { trackFailure(); resolve() }
                })
              })
              pendingPromises.push(promise)
            }
          }
        }
      }
    }
    
    // 5. Handle NEW sections and questions via the parent component
    // =============================================================================
    // 5. Handle NEW sections (use bulk add API)
    // =============================================================================
    const newSectionsData = sections.slice(originalSectionsCount)
    if (newSectionsData.length > 0) {
      totalChanges += newSectionsData.length
      const bulkPayload = newSectionsData.map((section, idx) => ({
        title: section.title,
        description: section.description,
        sectionNumber: originalSectionsCount + idx + 1,
        entries: flattenEntriesForPayload(section.entries)
      }))
      
      const promise = new Promise<void>((resolve) => {
        addSectionsBulkMutation.mutate(bulkPayload, {
          onSuccess: () => { 
            successCount += newSectionsData.length
            resolve() 
          },
          onError: () => { 
            failureCount += newSectionsData.length
            resolve() 
          }
        })
      })
      pendingPromises.push(promise)
    }
    
    // =============================================================================
    // 6. Handle NEW questions in existing sections (use add entry API)
    // =============================================================================
    for (let i = 0; i < Math.min(originalSectionsCount, sections.length); i++) {
      const current = sections[i]
      const originalQCount = originalQuestionCounts[i] || 0
      
      if (current.entries.length > originalQCount && current.id) {
        const newEntries = current.entries.slice(originalQCount)
        
        for (const entry of newEntries) {
          totalChanges++
          const promise = new Promise<void>(async (resolve) => {
            try {
              await addEntryAsync({
                sectionId: current.id!,
                entryData: {
                  clientId: entry.clientId,
                  question: entry.question,
                  questionNumber: entry.questionNumber,
                  questionType: entry.questionType,
                  isRequired: entry.isRequired,
                  isFollowUp: entry.isFollowUp,
                  parentQuestionClientId: entry.parentQuestionClientId,
                  triggerChoiceClientIds: entry.triggerChoiceClientIds,
                  questionImageFile: entry.questionImageFile,
                  choices: entry.choices.map((c, ci) => ({
                    clientId: c.clientId,
                    choiceOrder: c.choiceOrder || String.fromCharCode(65 + ci),
                    choiceText: c.choiceText,
                    choiceImageFile: c.choiceImageFile,
                    hasTextInput: c.hasTextInput || false
                  })),
                  gridRows: entry.gridRows.map((r, ri) => ({
                    rowNumber: r.rowNumber || ri + 1,
                    rowText: r.rowText,
                    rowImageFile: r.rowImageFile
                  }))
                }
              })
              successCount++
              resolve()
            } catch {
              failureCount++
              resolve()
            }
          })
          pendingPromises.push(promise)
        }
      }
    }
    
    // Wait for all operations to complete
    if (pendingPromises.length > 0) {
      await Promise.all(pendingPromises)
    }
    
    // Show results
    if (totalChanges === 0) {
      toast.message('No changes to save')
    } else if (failureCount === 0) {
      toast.success(`All ${successCount} change(s) saved successfully`)
      onRefreshSurveyData?.()
      // Update snapshot to reflect saved changes
      setOriginalSectionsSnapshot(JSON.parse(JSON.stringify(sections)))
      setOriginalSectionsCount(sections.length)
      setOriginalQuestionCounts(sections.map(s => s.entries.length))
    } else if (successCount > 0) {
      toast.warning(`${successCount} change(s) saved, ${failureCount} failed`)
      onRefreshSurveyData?.()
    } else {
      toast.error(`Failed to save ${failureCount} change(s)`)
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
            <SurveyNavigation
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
                      onSaveQuestion={currentQuestion.id ? handleSaveCurrentQuestion : undefined}
                      isSavingQuestion={isSavingCurrentQuestion}
                    />
                  )
                )}
              </div>
            </Card>
          </div>

          {/* Right Sidebar - Preview */}
          <div className="col-span-3">
            {editMode === 'question' && currentQuestion && (
              <QuestionPreview question={currentQuestion} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

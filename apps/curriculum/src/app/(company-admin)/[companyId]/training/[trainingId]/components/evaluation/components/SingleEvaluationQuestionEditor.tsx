"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload } from "@/components/ui/file-upload"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { EvaluationEntryForm, EvaluationChoiceForm, EvaluationQuestionType } from "@/lib/hooks/evaluation-types"
import { useAddQuestionEntry, useDeleteChoice, useUpdateQuestionEntry } from "@/lib/hooks/useEvaluation"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
type UpdateQuestionFn = (updates: Partial<EvaluationEntryForm>) => void

interface SingleEvaluationQuestionEditorProps {
  question: EvaluationEntryForm
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdateQuestion: UpdateQuestionFn
  isCreatingNew?: boolean // To determine POST vs PATCH logic
  isEditMode?: boolean
  sectionId?: string
  onAddQuestion?: () => void
}

export function SingleEvaluationQuestionEditor({
  question,
  onUpdateQuestion,
  isCreatingNew = true,
  isEditMode = false,
  sectionId,
  onAddQuestion
}: SingleEvaluationQuestionEditorProps) {
  const [expandedFollowUps, setExpandedFollowUps] = useState<Record<string, boolean>>({})
  const [deleteChoiceIdx, setDeleteChoiceIdx] = useState<number | null>(null)
  const [isDeletingChoice, setIsDeletingChoice] = useState(false)

  const deleteChoiceMutation = useDeleteChoice()
  const updateQuestionEntry = useUpdateQuestionEntry()
  const addQuestionEntry = useAddQuestionEntry()
  
  const addChoice = () => {
    const newChoice: EvaluationChoiceForm = {
      clientId: crypto.randomUUID(),
      choiceText: "",
      choiceImage: "",
      hasFollowUp: false
    }
    onUpdateQuestion({
      choices: [...question.choices, newChoice]
    })
  }

  const removeChoice = (choiceIndex: number) => {
    const choice = question.choices[choiceIndex]
    if (isEditMode && choice?.id) {
      setDeleteChoiceIdx(choiceIndex)
    } else {
      onUpdateQuestion({
        choices: question.choices.filter((_, i) => i !== choiceIndex)
      })
    }
  }

  const updateChoice = (choiceIndex: number, choiceUpdates: Partial<EvaluationChoiceForm>) => {
    onUpdateQuestion({
      choices: question.choices.map((choice, i) => 
        i === choiceIndex ? { ...choice, ...choiceUpdates } : choice
      )
    })
  }

  const toggleChoiceFollowUp = (choiceIndex: number, hasFollowUp: boolean) => {
    const choice = question.choices[choiceIndex]
    const updatedChoice: EvaluationChoiceForm = {
      ...choice,
      hasFollowUp,
      followUpQuestion: hasFollowUp && !choice.followUpQuestion 
        ? createEmptyFollowUpQuestion(choice.clientId)
        : hasFollowUp 
          ? choice.followUpQuestion 
          : undefined
    }
    
    updateChoice(choiceIndex, updatedChoice)
    
    // Expand the follow-up editor when enabled
    if (hasFollowUp) {
      setExpandedFollowUps(prev => ({ ...prev, [choice.clientId]: true }))
    }
  }

  const createEmptyFollowUpQuestion = (triggerChoiceClientId: string): EvaluationEntryForm => ({
    // Use the choice's clientId as the follow-up's clientId - it's already generated and unique
    clientId: triggerChoiceClientId,
    question: "",
    questionType: "TEXT",
    choices: [],
    isFollowUp: true,
    parentQuestionClientId: question.clientId,
    triggerChoiceClientIds: [triggerChoiceClientId],
    // Use server IDs only if we're editing an existing evaluation and have server IDs
    ...(isCreatingNew ? {} : {
      parentQuestionId: question.id,
      triggerChoiceIds: question.choices.find(c => c.clientId === triggerChoiceClientId)?.id ? [question.choices.find(c => c.clientId === triggerChoiceClientId)!.id!] : []
    })
  })

  const updateFollowUpQuestion = (choiceIndex: number, followUpUpdates: Partial<EvaluationEntryForm>) => {
    const choice = question.choices[choiceIndex]
    if (!choice.followUpQuestion) return
    
    const updatedChoice: EvaluationChoiceForm = {
      ...choice,
      followUpQuestion: {
        ...choice.followUpQuestion,
        ...followUpUpdates
      }
    }
    
    updateChoice(choiceIndex, updatedChoice)
  }

  const addFollowUpChoice = (choiceIndex: number) => {
    const choice = question.choices[choiceIndex]
    if (!choice.followUpQuestion) return
    
    const newFollowUpChoice: EvaluationChoiceForm = {
      clientId: crypto.randomUUID(),
      choiceText: "",
      choiceImage: "",
      hasFollowUp: false
    }
    
    updateFollowUpQuestion(choiceIndex, {
      choices: [...choice.followUpQuestion.choices, newFollowUpChoice]
    })
  }

  const removeFollowUpChoice = (choiceIndex: number, followUpChoiceIndex: number) => {
    const choice = question.choices[choiceIndex]
    if (!choice.followUpQuestion) return
    
    updateFollowUpQuestion(choiceIndex, {
      choices: choice.followUpQuestion.choices.filter((_, i) => i !== followUpChoiceIndex)
    })
  }

  const updateFollowUpChoice = (choiceIndex: number, followUpChoiceIndex: number, updates: Partial<EvaluationChoiceForm>) => {
    const choice = question.choices[choiceIndex]
    if (!choice.followUpQuestion) return
    
    updateFollowUpQuestion(choiceIndex, {
      choices: choice.followUpQuestion.choices.map((fChoice, i) => 
        i === followUpChoiceIndex ? { ...fChoice, ...updates } : fChoice
      )
    })
  }

  const shouldShowChoices = question.questionType === "RADIO" || question.questionType === "CHECKBOX"

  const buildEntryPatchPayload = (entry: EvaluationEntryForm, opts?: { parentQuestionId?: string; triggerChoiceIds?: string[] }) => {
    return {
      question: entry.question,
      questionImage: entry.questionImage || undefined,
      questionImageFile: entry.questionImageFile,
      questionType: entry.questionType,
      choices: (entry.choices || []).map((c) => ({
        clientId: c.clientId,
        choiceText: c.choiceText,
        choiceImage: c.choiceImage || undefined,
        choiceImageFile: c.choiceImageFile
      })),
      isFollowUp: !!entry.isFollowUp,
      parentQuestionId: opts?.parentQuestionId,
      triggerChoiceIds: opts?.triggerChoiceIds
    }
  }

  const canUpdateMain = isEditMode && !!question.id

  return (
    <div className="space-y-6">
      {/* Question Text with Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question *
        </label>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <Input
              value={question.question}
              onChange={(e) => onUpdateQuestion({ question: e.target.value })}
              placeholder="Enter your question"
              className="w-full"
            />
          </div>
          <FileUpload 
            accept="image/*" 
            onChange={(file) => onUpdateQuestion({ questionImageFile: file || undefined })}
            variant="icon"
            size="md"
          />
        </div>
        
        {/* Question Image Preview */}
        {(question.questionImageFile || question.questionImage) && (
          <div className="mt-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={question.questionImageFile ? URL.createObjectURL(question.questionImageFile) : question.questionImage} 
              alt="question" 
              className="h-16 w-16 object-cover rounded border" 
            />
            <div className="text-xs text-gray-600">
              {question.questionImageFile ? (
                <>
                  <div className="font-medium truncate max-w-[160px]">{question.questionImageFile.name}</div>
                  <div>{(question.questionImageFile.size / 1024).toFixed(1)} KB</div>
                </>
              ) : (
                <div className="font-medium">Existing image</div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateQuestion({ 
                questionImageFile: undefined, 
                questionImage: "" 
              })}
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      {/* Question Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Type *
        </label>
        <Select
          value={question.questionType}
          onValueChange={(value) => onUpdateQuestion({ 
            questionType: value as EvaluationQuestionType,
            // Clear choices when switching to TEXT type
            choices: value === "TEXT" ? [] : question.choices
          })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TEXT">Text Response</SelectItem>
            <SelectItem value="RADIO">Single Choice</SelectItem>
            <SelectItem value="CHECKBOX">Multiple Choice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Only show follow-up message for existing follow-up questions */}
      {question.isFollowUp && (
        <div className="border rounded-lg p-3 bg-orange-50">
          <div className="text-sm text-orange-700">
            📎 This is a follow-up question that will only appear based on specific triggers from the parent question.
          </div>
        </div>
      )}

      {/* Choices (only for RADIO and CHECKBOX types) */}
      {shouldShowChoices && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Answer Choices *
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={addChoice}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Choice
            </Button>
          </div>

          <div className="space-y-4">
            {question.choices.map((choice, choiceIndex) => (
              <div key={choice.clientId} className="border rounded-lg p-4 space-y-3">
                {/* Choice Text and Image */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        value={choice.choiceText}
                        onChange={(e) => updateChoice(choiceIndex, { choiceText: e.target.value })}
                        placeholder={`Choice ${choiceIndex + 1}`}
                        className="flex-1"
                      />
                      <FileUpload
                        accept="image/*"
                        onChange={(file) => updateChoice(choiceIndex, { choiceImageFile: file || undefined })}
                        variant="icon"
                        size="sm"
                      />
                    </div>
                    
                    {/* Choice Image Preview */}
                    {(choice.choiceImageFile || choice.choiceImage) && (
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={choice.choiceImageFile ? URL.createObjectURL(choice.choiceImageFile) : choice.choiceImage} 
                          alt={`choice ${choiceIndex + 1}`} 
                          className="h-12 w-12 object-cover rounded border" 
                        />
                        <div className="text-xs text-gray-600">
                          {choice.choiceImageFile ? (
                            <>
                              <div className="font-medium truncate max-w-[120px]">{choice.choiceImageFile.name}</div>
                              <div>{(choice.choiceImageFile.size / 1024).toFixed(1)} KB</div>
                            </>
                          ) : (
                            <div className="font-medium">Existing image</div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateChoice(choiceIndex, { 
                            choiceImageFile: undefined, 
                            choiceImage: choice.choiceImageFile ? choice.choiceImage : undefined 
                          })}
                          className="text-xs px-2 py-1"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Remove Choice */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChoice(choiceIndex)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={question.choices.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Follow-up Question Toggle */}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`followup-${choice.clientId}`}
                        checked={choice.hasFollowUp || false}
                        onCheckedChange={(checked) => toggleChoiceFollowUp(choiceIndex, !!checked)}
                      />
                      <Label htmlFor={`followup-${choice.clientId}`} className="text-sm font-medium text-gray-700">
                        Add follow-up question for this choice
                      </Label>
                      {choice.hasFollowUp && (
                        <div className="ml-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Follow-up Active
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {choice.hasFollowUp && choice.followUpQuestion && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedFollowUps(prev => ({ 
                          ...prev, 
                          [choice.clientId]: !prev[choice.clientId] 
                        }))}
                        className="flex items-center gap-1"
                      >
                        {expandedFollowUps[choice.clientId] ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                        {expandedFollowUps[choice.clientId] ? 'Collapse' : 'Expand'}
                      </Button>
                    )}
                  </div>

                  {/* Follow-up Question Editor */}
                  {choice.hasFollowUp && choice.followUpQuestion && expandedFollowUps[choice.clientId] && (
                    <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-4 h-4 text-blue-500">
                            <svg fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-blue-800">Follow-up Question for &quot;{choice.choiceText || `Choice ${choiceIndex + 1}`}&quot;</span>
                        </div>

                        {/* Follow-up Question Text */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Question *</Label>
                          <div className="flex items-start gap-2 mt-1">
                            <Input
                              value={choice.followUpQuestion.question}
                              onChange={(e) => updateFollowUpQuestion(choiceIndex, { question: e.target.value })}
                              placeholder="Enter follow-up question"
                              className="flex-1"
                            />
                            <FileUpload
                              accept="image/*"
                              onChange={(file) => updateFollowUpQuestion(choiceIndex, { questionImageFile: file || undefined })}
                              variant="icon"
                              size="sm"
                            />
                          </div>
                          
                          {/* Follow-up Question Image Preview */}
                          {(choice.followUpQuestion.questionImageFile || choice.followUpQuestion.questionImage) && (
                            <div className="flex items-center gap-2 mt-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={choice.followUpQuestion.questionImageFile ? URL.createObjectURL(choice.followUpQuestion.questionImageFile) : choice.followUpQuestion.questionImage} 
                                alt="follow-up question" 
                                className="h-16 w-16 object-cover rounded border" 
                              />
                              <div className="text-xs text-gray-600">
                                {choice.followUpQuestion.questionImageFile ? (
                                  <>
                                    <div className="font-medium truncate max-w-[120px]">{choice.followUpQuestion.questionImageFile.name}</div>
                                    <div>{(choice.followUpQuestion.questionImageFile.size / 1024).toFixed(1)} KB</div>
                                  </>
                                ) : (
                                  <div className="font-medium">Existing image</div>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateFollowUpQuestion(choiceIndex, { 
                                  questionImageFile: undefined, 
                                  questionImage: choice.followUpQuestion?.questionImageFile ? choice.followUpQuestion?.questionImage : undefined 
                                })}
                                className="text-xs px-2 py-1"
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Follow-up Question Type */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Question Type</Label>
                          <Select
                            value={choice.followUpQuestion.questionType}
                            onValueChange={(value) => updateFollowUpQuestion(choiceIndex, { 
                              questionType: value as EvaluationQuestionType,
                              choices: value === "TEXT" ? [] : choice.followUpQuestion?.choices || []
                            })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TEXT">Text Response</SelectItem>
                              <SelectItem value="RADIO">Single Choice</SelectItem>
                              <SelectItem value="CHECKBOX">Multiple Choice</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Follow-up Choices (if not TEXT) */}
                        {(choice.followUpQuestion.questionType === "RADIO" || choice.followUpQuestion.questionType === "CHECKBOX") && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-sm font-medium text-gray-700">Answer Choices</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addFollowUpChoice(choiceIndex)}
                                className="flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Add Choice
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              {(choice.followUpQuestion.choices || []).map((followUpChoice, followUpChoiceIndex) => (
                                <div key={followUpChoice.clientId} className="border border-blue-200 bg-white rounded-lg p-3 space-y-2">
                                  {/* Follow-up Choice Text and Image */}
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={followUpChoice.choiceText}
                                      onChange={(e) => updateFollowUpChoice(choiceIndex, followUpChoiceIndex, { choiceText: e.target.value })}
                                      placeholder={`Follow-up choice ${followUpChoiceIndex + 1}`}
                                      className="flex-1"
                                    />
                                    <FileUpload
                                      accept="image/*"
                                      onChange={(file) => updateFollowUpChoice(choiceIndex, followUpChoiceIndex, { choiceImageFile: file || undefined })}
                                      variant="icon"
                                      size="sm"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeFollowUpChoice(choiceIndex, followUpChoiceIndex)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                                      disabled={(choice.followUpQuestion?.choices || []).length <= 1}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>

                                  {/* Follow-up Choice Image Preview */}
                                  {(followUpChoice.choiceImageFile || followUpChoice.choiceImage) && (
                                    <div className="flex items-center gap-2">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img 
                                        src={followUpChoice.choiceImageFile ? URL.createObjectURL(followUpChoice.choiceImageFile) : followUpChoice.choiceImage} 
                                        alt={`follow-up choice ${followUpChoiceIndex + 1}`} 
                                        className="h-12 w-12 object-cover rounded border" 
                                      />
                                      <div className="text-xs text-gray-600">
                                        {followUpChoice.choiceImageFile ? (
                                          <>
                                            <div className="font-medium truncate max-w-[120px]">{followUpChoice.choiceImageFile.name}</div>
                                            <div>{(followUpChoice.choiceImageFile.size / 1024).toFixed(1)} KB</div>
                                          </>
                                        ) : (
                                          <div className="font-medium">Existing image</div>
                                        )}
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateFollowUpChoice(choiceIndex, followUpChoiceIndex, { 
                                          choiceImageFile: undefined, 
                                          choiceImage: followUpChoice.choiceImageFile ? followUpChoice.choiceImage : undefined 
                                        })}
                                        className="text-xs px-2 py-1"
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2 flex gap-2 justify-end">
                          {/* Add Follow-up Button (new follow-up, server add) */}
                          {/* Only allow adding a follow-up when parent question AND choice have server IDs */}
                          {isEditMode && sectionId && question.id && choice.id && choice.followUpQuestion && !choice.followUpQuestion?.id && (
                            <Button
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700"
                              onClick={async () => {
                                const follow = choice.followUpQuestion!
                                const choiceServerId = choice.id! // Already verified in condition
                                const parentServerId = question.id! // Already verified in condition
                                await addQuestionEntry.mutateAsync({
                                  sectionId,
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
                                    // Use server IDs for parent and trigger - API requires these
                                    parentQuestionId: parentServerId,
                                    triggerChoiceIds: [choiceServerId]
                                  }
                                })
                              }}
                            >
                              Add Follow-up
                            </Button>
                          )}
                          {/* Update Follow-up Button (server-backed only) */}
                          {isEditMode && choice.followUpQuestion?.id && (
                            <Button
                              size="sm"
                              className="bg-blue-600 text-white hover:bg-blue-700"
                              onClick={() => {
                                const follow = choice.followUpQuestion!
                                updateQuestionEntry.mutate({
                                  entryId: follow.id as string,
                                  data: buildEntryPatchPayload(follow, {
                                    parentQuestionId: question.id,
                                    triggerChoiceIds: choice.id ? [choice.id] : undefined
                                  })
                                })
                              }}
                            >
                              Update Follow-up
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Validation Messages */}
          <div className="mt-2 space-y-1">
            {shouldShowChoices && question.choices.length < 1 && (
              <p className="text-sm text-red-600">
                ❌ Please add at least 1 answer choice
              </p>
            )}
          </div>
        </div>
      )}

      {/* Update Main Question Button (server-backed only) */}
      {canUpdateMain && (
        <div className="flex justify-end">
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              updateQuestionEntry.mutate({
                entryId: question.id as string,
                data: buildEntryPatchPayload(question)
              })
            }}
          >
            Update Question
          </Button>
        </div>
      )}
      
      {/* Add New Question Button (client-only new, in edit mode) */}
      {isEditMode && !question.id && onAddQuestion && (
        <div className="flex justify-end">
          <Button
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={onAddQuestion}
          >
            Add Question
          </Button>
        </div>
      )}
      
      {/* Delete choice confirm */}
      <DeleteConfirmDialog
        isOpen={deleteChoiceIdx !== null}
        onClose={() => setDeleteChoiceIdx(null)}
        onConfirm={async () => {
          const idx = deleteChoiceIdx
          if (idx === null) return
          const choice = question.choices[idx]
          try {
            setIsDeletingChoice(true)
            if (isEditMode && choice?.id) {
              await deleteChoiceMutation.mutateAsync(choice.id)
            }
            onUpdateQuestion({
              choices: question.choices.filter((_, i) => i !== idx)
            })
          } finally {
            setIsDeletingChoice(false)
            setDeleteChoiceIdx(null)
          }
        }}
        title="Delete Choice"
        description="Are you sure you want to delete this choice? This action cannot be undone."
        confirmText="Delete Choice"
        isDeleting={isDeletingChoice}
      />
    </div>
  )
}

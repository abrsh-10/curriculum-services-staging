"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Send, X, ChevronDown, ChevronRight } from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import { ChoiceDeleteDialog } from "./ChoiceDeleteDialog"
import { 
  SurveyEntryForm, 
  SurveyChoiceForm, 
  SurveyQuestionType,
  SurveyGridRowForm,
  getDefaultQuestionFields,
  emptyChoice,
  createEmptyFollowUp,
  useAddChoice, 
  useRemoveChoice 
} from "@/lib/hooks/useSurvey"

interface SingleQuestionEditorProps {
  question: SurveyEntryForm
  onUpdateQuestion: (updates: Partial<SurveyEntryForm>) => void
  isFirstInSection?: boolean
  isEditMode?: boolean
  surveyEntryId?: string
  onRefreshSurveyData?: () => void
}

export function SingleQuestionEditor({ 
  question, 
  onUpdateQuestion, 
  isFirstInSection = false, 
  isEditMode = false, 
  surveyEntryId,
  onRefreshSurveyData
}: SingleQuestionEditorProps) {
  // API hooks for immediate choice add/remove operations
  const { addChoice, isLoading: isAddingChoice } = useAddChoice()
  const { removeChoice, isLoading: isRemovingChoice } = useRemoveChoice()
  
  // UI state
  const [showAddChoiceInput, setShowAddChoiceInput] = useState(false)
  const [newChoiceText, setNewChoiceText] = useState("")
  const [newChoiceImageFile, setNewChoiceImageFile] = useState<File | undefined>(undefined)
  const [expandedFollowUps, setExpandedFollowUps] = useState<Record<string, boolean>>({})
  
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    choiceIndex: number;
    choiceText: string;
    choiceOrder: string;
  }>({
    isOpen: false,
    choiceIndex: -1,
    choiceText: "",
    choiceOrder: ""
  });

  // Question type change handler
  const handleQuestionTypeChange = (newType: SurveyQuestionType) => {
    const defaults = getDefaultQuestionFields(newType)
    
    onUpdateQuestion({
      questionType: newType,
      choices: defaults.choices || [],
      gridRows: defaults.gridRows || [],
      questionImageFile: undefined,
      questionImage: undefined,
    })
  }

  // Choice management
  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = question.choices.map((c, i) => 
      i === index ? { ...c, choiceText: value } : c
    )
    onUpdateQuestion({ choices: newChoices })
  }

  const updateChoice = (choiceIndex: number, updates: Partial<SurveyChoiceForm>) => {
    onUpdateQuestion({
      choices: question.choices.map((c, i) => 
        i === choiceIndex ? { ...c, ...updates } : c
      )
    })
  }

  const handleShowAddChoiceInput = () => {
    setShowAddChoiceInput(true)
    setNewChoiceText("")
    setNewChoiceImageFile(undefined)
  }

  const handleCancelAddChoice = () => {
    setShowAddChoiceInput(false)
    setNewChoiceText("")
    setNewChoiceImageFile(undefined)
  }

  const handleAddChoiceDirectly = () => {
    const newChoice = emptyChoice(question.choices.length)
    onUpdateQuestion({ choices: [...question.choices, newChoice] })
  }

  const handleSubmitNewChoice = () => {
    if (!newChoiceText.trim() && !newChoiceImageFile) return
    
    if (isEditMode && surveyEntryId) {
      addChoice({
        surveyEntryId,
        choiceData: {
          choice: newChoiceText.trim(),
          choiceImage: undefined,
          choiceImageFile: newChoiceImageFile
        }
      }, {
        onSuccess: () => {
          setShowAddChoiceInput(false)
          setNewChoiceText("")
          setNewChoiceImageFile(undefined)
          onRefreshSurveyData?.()
        },
      })
    } else {
      const newChoice: SurveyChoiceForm = {
        clientId: crypto.randomUUID(),
        choiceOrder: String.fromCharCode(65 + question.choices.length),
        choiceText: newChoiceText.trim(),
        choiceImageFile: newChoiceImageFile,
        hasFollowUp: false
      }
      onUpdateQuestion({ choices: [...question.choices, newChoice] })
      setShowAddChoiceInput(false)
      setNewChoiceText("")
      setNewChoiceImageFile(undefined)
    }
  }

  const handleRemoveChoiceClick = (index: number) => {
    if (question.choices.length <= 2) return
    
    const choice = question.choices[index]
    const choiceText = choice?.choiceText || ""
    const choiceOrder = choice?.choiceOrder || String.fromCharCode(65 + index)
    
    if (isEditMode && surveyEntryId && choice?.id) {
      setDeleteDialog({
        isOpen: true,
        choiceIndex: index,
        choiceText,
        choiceOrder
      })
    } else {
      onUpdateQuestion({ choices: question.choices.filter((_, i) => i !== index) })
    }
  }

  const handleConfirmRemoveChoice = () => {
    if (isEditMode && surveyEntryId) {
      removeChoice({
        surveyEntryId,
        order: deleteDialog.choiceOrder
      }, {
        onSuccess: () => {
          setDeleteDialog({ isOpen: false, choiceIndex: -1, choiceText: "", choiceOrder: "" })
          onRefreshSurveyData?.()
        },
      })
    }
  }

  // Follow-up question management (NEW - like Evaluation)
  const toggleChoiceFollowUp = (choiceIndex: number, hasFollowUp: boolean) => {
    const choice = question.choices[choiceIndex]
    const updatedChoice: SurveyChoiceForm = {
      ...choice,
      hasFollowUp,
      followUpQuestion: hasFollowUp && !choice.followUpQuestion 
        ? createEmptyFollowUp(question.clientId, choice.clientId)
        : hasFollowUp 
          ? choice.followUpQuestion 
          : undefined
    }
    
    updateChoice(choiceIndex, updatedChoice)
    
    if (hasFollowUp) {
      setExpandedFollowUps(prev => ({ ...prev, [choice.clientId]: true }))
    }
  }

  const updateFollowUpQuestion = (choiceIndex: number, updates: Partial<SurveyEntryForm>) => {
    const choice = question.choices[choiceIndex]
    if (!choice.followUpQuestion) return
    
    updateChoice(choiceIndex, {
      followUpQuestion: {
        ...choice.followUpQuestion,
        ...updates
      }
    })
  }

  const addFollowUpChoice = (choiceIndex: number) => {
    const choice = question.choices[choiceIndex]
    if (!choice.followUpQuestion) return
    
    const newFollowUpChoice = emptyChoice(choice.followUpQuestion.choices.length)
    
    updateFollowUpQuestion(choiceIndex, {
      choices: [...choice.followUpQuestion.choices, newFollowUpChoice]
    })
  }

  const removeFollowUpChoice = (choiceIndex: number, followUpChoiceIndex: number) => {
    const choice = question.choices[choiceIndex]
    if (!choice.followUpQuestion || choice.followUpQuestion.choices.length <= 2) return
    
    updateFollowUpQuestion(choiceIndex, {
      choices: choice.followUpQuestion.choices.filter((_, i) => i !== followUpChoiceIndex)
    })
  }

  const updateFollowUpChoice = (choiceIndex: number, followUpChoiceIndex: number, updates: Partial<SurveyChoiceForm>) => {
    const choice = question.choices[choiceIndex]
    if (!choice.followUpQuestion) return
    
    updateFollowUpQuestion(choiceIndex, {
      choices: choice.followUpQuestion.choices.map((fc, i) => 
        i === followUpChoiceIndex ? { ...fc, ...updates } : fc
      )
    })
  }

  // Grid row management
  const handleRowChange = (index: number, value: string) => {
    const newRows = question.gridRows.map((r, i) => 
      i === index ? { ...r, rowText: value } : r
    )
    onUpdateQuestion({ gridRows: newRows })
  }

  const addRow = () => {
    const newRow: SurveyGridRowForm = {
      rowNumber: question.gridRows.length + 1,
      rowText: ""
    }
    onUpdateQuestion({ gridRows: [...question.gridRows, newRow] })
  }

  const removeRow = (index: number) => {
    if (question.gridRows.length > 2) {
      onUpdateQuestion({ gridRows: question.gridRows.filter((_, i) => i !== index) })
    }
  }

  const shouldShowChoices = question.questionType === "RADIO" || question.questionType === "CHECKBOX" || question.questionType === "GRID"
  const canHaveFollowUp = question.questionType === "RADIO" || question.questionType === "CHECKBOX"

  return (
    <div className="space-y-6">
      {/* Question Image */}
      <div>
        <Label className="text-sm font-medium">Question Image</Label>
        <div className="mt-2 flex items-center gap-3">
          <FileUpload 
            accept="image/*" 
            onChange={(file) => onUpdateQuestion({ questionImageFile: file || undefined })} 
          />
          {(question.questionImageFile || question.questionImage) && (
            <div className="flex items-center gap-3">
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
              <button
                type="button"
                className="text-red-600 text-xs"
                onClick={() => onUpdateQuestion({ 
                  questionImageFile: undefined, 
                  questionImage: question.questionImageFile ? question.questionImage : undefined 
                })}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Question Text */}
      <div>
        <Label htmlFor="questionText" className="text-sm font-medium">Question Text *</Label>
        <Textarea
          id="questionText"
          value={question.question}
          onChange={(e) => onUpdateQuestion({ question: e.target.value })}
          placeholder="Enter your question here..."
          className="mt-2"
          rows={3}
        />
      </div>

      {/* Question Type */}
      <div>
        <Label className="text-sm font-medium">Question Type *</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {(['TEXT', 'RADIO', 'CHECKBOX', 'GRID'] as SurveyQuestionType[]).map((type) => (
            <Button
              key={type}
              variant={question.questionType === type ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuestionTypeChange(type)}
              className={`h-auto p-3 font-semibold transition-all duration-200 ${
                question.questionType === type 
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md" 
                  : "border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={`/question-type-${type.toLowerCase()}.svg`}
                  alt={`${type} icon`}
                  className="w-4 h-4"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                {type}
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Follow-up indicator (for existing follow-up questions) */}
      {question.isFollowUp && (
        <div className="border rounded-lg p-3 bg-orange-50">
          <div className="text-sm text-orange-700">
            📎 This is a follow-up question that will only appear when the user selects specific choices from the parent question.
          </div>
        </div>
      )}

      {/* Answer Options (for RADIO, CHECKBOX, GRID) */}
      {shouldShowChoices && (
        <div>
          <Label className="text-sm font-medium">
            {question.questionType === 'GRID' ? 'Column Options *' : 'Answer Options *'}
          </Label>
          <div className="space-y-4 mt-2">
            {(question.choices || []).map((choice, choiceIndex) => (
              <div key={choice.clientId} className="border rounded-lg p-4 space-y-3">
                {/* Choice Text and Image */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 min-w-[24px]">
                    {choice.choiceOrder || String.fromCharCode(65 + choiceIndex)}.
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Input
                        value={choice.choiceText ?? ""}
                        onChange={(e) => handleChoiceChange(choiceIndex, e.target.value)}
                        placeholder={`Option ${choiceIndex + 1}`}
                        className="flex-1"
                      />
                      <FileUpload
                        accept="image/*"
                        onChange={(file) => updateChoice(choiceIndex, { choiceImageFile: file || undefined })}
                      />
                    </div>
                    
                    {/* Choice Image Preview */}
                    {(choice.choiceImageFile || choice.choiceImage) && (
                      <div className="flex items-center gap-2 mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={choice.choiceImageFile ? URL.createObjectURL(choice.choiceImageFile) : choice.choiceImage} 
                          alt={`choice ${choiceIndex + 1}`} 
                          className="h-10 w-10 object-cover rounded border" 
                        />
                        <button
                          type="button"
                          className="text-red-600 text-xs"
                          onClick={() => updateChoice(choiceIndex, { 
                            choiceImageFile: undefined, 
                            choiceImage: choice.choiceImageFile ? choice.choiceImage : undefined 
                          })}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Remove Choice */}
                  {question.choices.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChoiceClick(choiceIndex)}
                      disabled={isRemovingChoice}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      {isRemovingChoice ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b border-red-500" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Follow-up Question Toggle (Only for RADIO/CHECKBOX) */}
                {canHaveFollowUp && (
                  <div className="border-t border-gray-200 pt-3 mt-2">
                    <div className="flex items-center justify-between bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`followup-${choice.clientId}`}
                          checked={choice.hasFollowUp || false}
                          onCheckedChange={(checked) => toggleChoiceFollowUp(choiceIndex, !!checked)}
                        />
                        <Label htmlFor={`followup-${choice.clientId}`} className="text-sm font-medium text-amber-800 cursor-pointer">
                          🔗 Add follow-up question for this choice
                        </Label>
                        {choice.hasFollowUp && (
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded ml-2 font-medium">
                            Follow-up Active
                          </span>
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
                          className="flex items-center gap-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
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
                            <span className="text-blue-500">➜</span>
                            <span className="text-sm font-medium text-blue-800">
                              Follow-up for &quot;{choice.choiceText || `Option ${choiceIndex + 1}`}&quot;
                            </span>
                          </div>

                          {/* Follow-up Question Text */}
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Question *</Label>
                            <div className="flex items-start gap-2 mt-1">
                              <Textarea
                                value={choice.followUpQuestion.question}
                                onChange={(e) => updateFollowUpQuestion(choiceIndex, { question: e.target.value })}
                                placeholder="Enter follow-up question"
                                className="flex-1"
                                rows={2}
                              />
                              <FileUpload
                                accept="image/*"
                                onChange={(file) => updateFollowUpQuestion(choiceIndex, { questionImageFile: file || undefined })}
                              />
                            </div>
                            
                            {/* Follow-up Question Image Preview */}
                            {(choice.followUpQuestion.questionImageFile || choice.followUpQuestion.questionImage) && (
                              <div className="flex items-center gap-2 mt-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={choice.followUpQuestion.questionImageFile 
                                    ? URL.createObjectURL(choice.followUpQuestion.questionImageFile) 
                                    : choice.followUpQuestion.questionImage} 
                                  alt="follow-up question" 
                                  className="h-12 w-12 object-cover rounded border" 
                                />
                                <button
                                  type="button"
                                  className="text-red-600 text-xs"
                                  onClick={() => updateFollowUpQuestion(choiceIndex, { 
                                    questionImageFile: undefined, 
                                    questionImage: undefined 
                                  })}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Follow-up Question Type */}
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Question Type</Label>
                            <Select
                              value={choice.followUpQuestion.questionType}
                              onValueChange={(value) => {
                                const defaults = getDefaultQuestionFields(value as SurveyQuestionType)
                                updateFollowUpQuestion(choiceIndex, { 
                                  questionType: value as SurveyQuestionType,
                                  choices: defaults.choices || [],
                                  gridRows: defaults.gridRows || []
                                })
                              }}
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

                          {/* Follow-up Required */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`followup-required-${choice.clientId}`}
                              checked={choice.followUpQuestion.isRequired}
                              onCheckedChange={(checked) => updateFollowUpQuestion(choiceIndex, { isRequired: !!checked })}
                            />
                            <Label htmlFor={`followup-required-${choice.clientId}`} className="text-sm text-gray-600">
                              Required question
                            </Label>
                          </div>

                          {/* Follow-up Choices (if RADIO or CHECKBOX) */}
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
                                {(choice.followUpQuestion.choices || []).map((followUpChoice, fci) => (
                                  <div key={followUpChoice.clientId} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-blue-200">
                                    <span className="text-xs text-gray-500 min-w-[20px]">
                                      {followUpChoice.choiceOrder || String.fromCharCode(65 + fci)}.
                                    </span>
                                    <Input
                                      value={followUpChoice.choiceText}
                                      onChange={(e) => updateFollowUpChoice(choiceIndex, fci, { choiceText: e.target.value })}
                                      placeholder={`Option ${fci + 1}`}
                                      className="flex-1"
                                    />
                                    <FileUpload
                                      accept="image/*"
                                      onChange={(file) => updateFollowUpChoice(choiceIndex, fci, { choiceImageFile: file || undefined })}
                                    />
                                    {(choice.followUpQuestion?.choices || []).length > 2 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFollowUpChoice(choiceIndex, fci)}
                                        className="text-red-500 hover:text-red-700 p-1 h-8 w-8"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {/* Add choice input area */}
            {isEditMode && surveyEntryId && showAddChoiceInput ? (
              <div className="space-y-2 p-3 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                <div className="flex items-center gap-2">
                  <Input
                    value={newChoiceText}
                    onChange={(e) => setNewChoiceText(e.target.value)}
                    placeholder="Enter choice text"
                    className="flex-1"
                    onKeyPress={(e) => e.key === 'Enter' && (newChoiceText.trim() || newChoiceImageFile) && handleSubmitNewChoice()}
                  />
                  <FileUpload
                    accept="image/*"
                    onChange={(file) => setNewChoiceImageFile(file || undefined)}
                  />
                </div>
                
                {newChoiceImageFile && (
                  <div className="flex items-center gap-2 p-2 bg-white rounded border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={URL.createObjectURL(newChoiceImageFile)} 
                      alt="choice preview" 
                      className="h-12 w-12 object-cover rounded border" 
                    />
                    <div className="flex-1 text-xs text-gray-600">
                      <div className="font-medium truncate">{newChoiceImageFile.name}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewChoiceImageFile(undefined)}
                      disabled={isAddingChoice}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    onClick={handleSubmitNewChoice}
                    disabled={(!newChoiceText.trim() && !newChoiceImageFile) || isAddingChoice}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isAddingChoice ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                        <span>Adding...</span>
                      </div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelAddChoice}
                    disabled={isAddingChoice}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={isEditMode && surveyEntryId ? handleShowAddChoiceInput : handleAddChoiceDirectly}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Grid Rows (for GRID questions) */}
      {question.questionType === 'GRID' && (
        <div>
          <Label className="text-sm font-medium">Row Options *</Label>
          <div className="space-y-2 mt-2">
            {question.gridRows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm text-gray-500 min-w-[24px]">{row.rowNumber || index + 1}.</span>
                <Input
                  value={row.rowText}
                  onChange={(e) => handleRowChange(index, e.target.value)}
                  placeholder={`Row ${index + 1}`}
                  className="flex-1"
                />
                <FileUpload
                  accept="image/*"
                  onChange={(file) => {
                    const newRows = question.gridRows.map((r, i) => 
                      i === index ? { ...r, rowImageFile: file || undefined } : r
                    )
                    onUpdateQuestion({ gridRows: newRows })
                  }}
                />
                {question.gridRows.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(index)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={addRow}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </div>
        </div>
      )}

      {/* Question Options (only for RADIO/CHECKBOX) */}
      {canHaveFollowUp && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
          <Label className="text-sm font-medium text-gray-700">Question Options</Label>
          
          {/* Has Text Input / Allow Other */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasTextInput"
              checked={question.hasTextInput || false}
              onCheckedChange={(checked) => onUpdateQuestion({ hasTextInput: !!checked })}
            />
            <Label htmlFor="hasTextInput" className="text-sm text-gray-600 cursor-pointer">
              Allow &quot;Other&quot; text input (adds a free-text option at the end)
            </Label>
          </div>

          {/* Required Question */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="required"
              checked={question.isRequired}
              onCheckedChange={(checked) => onUpdateQuestion({ isRequired: !!checked })}
            />
            <Label htmlFor="required" className="text-sm text-gray-600 cursor-pointer">
              Required question
            </Label>
          </div>
        </div>
      )}

      {/* Required Question (for TEXT and GRID - no hasTextInput option) */}
      {!canHaveFollowUp && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="required"
            checked={question.isRequired}
            onCheckedChange={(checked) => onUpdateQuestion({ isRequired: !!checked })}
          />
          <Label htmlFor="required" className="text-sm font-medium">
            Required question
          </Label>
        </div>
      )}

      {/* Choice Delete Confirmation Dialog */}
      <ChoiceDeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, choiceIndex: -1, choiceText: "", choiceOrder: "" })}
        onConfirm={handleConfirmRemoveChoice}
        choiceText={deleteDialog.choiceText}
        choiceOrder={deleteDialog.choiceOrder}
        isDeleting={isRemovingChoice}
      />
    </div>
  )
}

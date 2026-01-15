"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { 
  SurveyEntry, 
  QuestionType,
  getDefaultQuestionFieldsLegacy,
  validateSurveyEntryLegacy
} from "@/lib/hooks/useSurvey"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface AddQuestionFormProps {
  surveyId: string
  onCancel: () => void
  onSubmit: (data: { surveyId: string; questionData: SurveyEntry }) => void
  isSubmitting: boolean
}

export function AddQuestionForm({
  surveyId,
  onCancel,
  onSubmit,
  isSubmitting
}: AddQuestionFormProps) {
  const [question, setQuestion] = useState<SurveyEntry>({
    question: "",
    questionType: "RADIO",
    choices: ["", ""],
    allowMultipleAnswers: false,
    allowOtherAnswer: false,
    rows: [],
    required: true
  })

  const updateQuestionText = (text: string) => {
    setQuestion(prev => ({ ...prev, question: text }))
  }

  const updateQuestionType = (questionType: QuestionType) => {
    const defaults = getDefaultQuestionFieldsLegacy(questionType)
    
    setQuestion(prev => ({ 
      ...prev, 
      questionType,
      choices: defaults.choices,
      allowMultipleAnswers: questionType === 'CHECKBOX',
      rows: defaults.rows
    }))
  }

  const updateRequired = (required: boolean) => {
    setQuestion(prev => ({ ...prev, required }))
  }

  const handleAddChoice = () => {
    if (question.choices.length >= 6) return
    setQuestion(prev => ({
      ...prev,
      choices: [...(prev.choices as string[]), ""]
    }))
  }

  const handleRemoveChoice = (index: number) => {
    if (question.choices.length <= 2) return
    setQuestion(prev => ({
      ...prev,
      choices: (prev.choices as string[]).filter((_, i) => i !== index)
    }))
  }

  const updateChoice = (index: number, value: string) => {
    setQuestion(prev => ({
      ...prev,
      choices: (prev.choices as string[]).map((c, i) => i === index ? value : c)
    }))
  }

  const addRow = () => {
    if (question.rows.length >= 8) return
    setQuestion(prev => ({
      ...prev,
      rows: [...prev.rows, ""]
    }))
  }

  const removeRow = (index: number) => {
    if (question.rows.length <= 2) return
    setQuestion(prev => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== index)
    }))
  }

  const updateRow = (index: number, value: string) => {
    setQuestion(prev => ({
      ...prev,
      rows: prev.rows.map((r, i) => i === index ? value : r)
    }))
  }

  const validateQuestion = () => {
    // Convert choices to string[] for legacy validation
    const choicesAsStrings = question.choices.map(c => 
      typeof c === 'string' ? c : c.choiceText || ''
    )
    const validation = validateSurveyEntryLegacy({
      question: question.question,
      questionType: question.questionType,
      choices: choicesAsStrings,
      rows: question.rows
    })
    if (!validation.isValid) {
      toast.error(validation.errors[0])
      return false
    }
    return true
  }

  const handleSubmit = () => {
    if (!validateQuestion()) return
    
    onSubmit({
      surveyId,
      questionData: question
    })
  }

  // Question Type Selector Component
  const QuestionTypeSelector = ({ 
    questionType, 
    onChange 
  }: { 
    questionType: QuestionType; 
    onChange: (type: QuestionType) => void 
  }) => {
    const getIconSrc = (type: QuestionType) => {
      switch (type) {
        case 'TEXT': return '/question-type-text.svg'
        case 'RADIO': return '/question-type-radio.svg'
        case 'CHECKBOX': return '/question-type-checkbox.svg'
        case 'GRID': return '/question-type-grid.svg'
        default: return '/question-type-text.svg'
      }
    }

    return (
      <div className="space-y-2">
        <Label>Question Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { type: 'TEXT' as const, label: 'Text Answer', desc: 'Free text input' },
            { type: 'RADIO' as const, label: 'Single Choice', desc: 'Select one option' },
            { type: 'CHECKBOX' as const, label: 'Multiple Choice', desc: 'Select multiple' },
            { type: 'GRID' as const, label: 'Grid/Matrix', desc: 'Rate multiple items' }
          ]).map(({ type, label, desc }) => (
            <Button
              key={type}
              variant={questionType === type ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(type)}
              className={`h-auto p-4 flex flex-col items-start transition-all duration-200 ${
                questionType === type 
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg border-0" 
                  : "border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
              }`}
              type="button"
            >
              <div className="flex items-center gap-2 mb-1">
                <img 
                  src={getIconSrc(type)} 
                  alt={`${type} icon`}
                  className={`w-5 h-5 ${
                    questionType === type ? "text-white" : "text-gray-600"
                  }`}
                />
                <span className={`font-semibold text-sm ${
                  questionType === type ? "text-white" : ""
                }`}>{label}</span>
              </div>
              <span className={`text-xs leading-tight ${
                questionType === type ? "text-blue-100" : "text-gray-500"
              }`}>{desc}</span>
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // Preview Components for Different Question Types
  const QuestionPreview = () => {
    const renderPreview = () => {
      switch (question.questionType) {
        case 'TEXT':
          return (
            <div className="mt-3">
              <Textarea
                placeholder="Trainee will type their answer here..."
                disabled
                className="bg-gray-50 border-gray-200 text-gray-500"
                rows={3}
              />
            </div>
          )
          
        case 'RADIO':
          return (
            <div className="mt-3 space-y-2">
              {question.choices.map((choice, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mt-0.5 flex-shrink-0"></div>
                  <span className="text-gray-700 break-words whitespace-normal">{typeof choice === 'string' ? choice : choice.choiceText || `Option ${index + 1}`}</span>
                </div>
              ))}
            </div>
          )
          
        case 'CHECKBOX':
          return (
            <div className="mt-3 space-y-2">
              {question.choices.map((choice, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded mt-0.5 flex-shrink-0"></div>
                  <span className="text-gray-700 break-words whitespace-normal">{typeof choice === 'string' ? choice : choice.choiceText || `Option ${index + 1}`}</span>
                </div>
              ))}
            </div>
          )
          
        case 'GRID':
          return (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border border-gray-200 bg-white">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-3 text-left text-sm font-medium text-gray-900"></th>
                    {question.choices.map((choice, index) => (
                      <th key={index} className="border border-gray-200 p-3 text-center text-sm font-medium text-gray-900 break-words">
                        {typeof choice === 'string' ? choice : choice.choiceText || `Column ${index + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {question.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-200 p-3 text-sm font-medium text-gray-900 break-words">
                        {row || `Row ${rowIndex + 1}`}
                      </td>
                      {question.choices.map((_, colIndex) => (
                        <td key={colIndex} className="border border-gray-200 p-3 text-center">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 mx-auto"></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          
        default:
          return <div className="text-gray-500 mt-3">Unsupported question type</div>
      }
    }

    return (
      <div className="border-l-4 border-blue-200 pl-4 py-3">
        <div className="flex items-start gap-3 mb-2">
          <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 text-blue-600 rounded-full text-sm font-medium shrink-0">
            1
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                {question.questionType}
              </span>
              {question.required && (
                <span className="text-red-500 text-sm font-medium">Required</span>
              )}
            </div>
            <p className="font-medium text-gray-900 text-base leading-relaxed break-words whitespace-normal">
              {question.question || "Your question will appear here"}
            </p>
          </div>
        </div>
        {renderPreview()}
      </div>
    )
  }

  return (
    <div className="px-[7%] py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Add New Question</h2>
          <p className="text-gray-600 mt-1">
            Create a question with multiple question types available
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Form */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">Question Details</h3>
            </div>
            
            <div className="space-y-6">
              {/* Question Type Selector */}
              <QuestionTypeSelector
                questionType={question.questionType}
                onChange={updateQuestionType}
              />

              {/* Question Text */}
              <div>
                <Label>Question</Label>
                <Textarea
                  value={question.question}
                  onChange={(e) => updateQuestionText(e.target.value)}
                  placeholder="Enter your question"
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Required Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required-question"
                  checked={question.required}
                  onChange={(e) => updateRequired(e.target.checked)}
                  className="rounded"
                  aria-label="Mark as required question"
                />
                <Label htmlFor="required-question">
                  Required question
                </Label>
              </div>

              {/* Question Type Specific Fields */}
              {(question.questionType === 'RADIO' || question.questionType === 'CHECKBOX') && (
                <div>
                  <Label>Answer Choices</Label>
                  <div className="space-y-3 mt-2">
                    {question.choices.map((choice, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium shrink-0">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <Input
                          value={typeof choice === 'string' ? choice : choice.choiceText || ''}
                          onChange={(e) => updateChoice(index, e.target.value)}
                          placeholder={`Choice ${index + 1}`}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveChoice(index)}
                          disabled={question.choices.length <= 2}
                          className="p-1 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {question.choices.length < 6 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddChoice}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Choice
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {question.questionType === 'GRID' && (
                <div className="space-y-4">
                  <div>
                    <Label>Column Headers (Rating Scale)</Label>
                    <div className="space-y-3 mt-2">
                      {question.choices.map((choice, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium shrink-0">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <Input
                            value={typeof choice === 'string' ? choice : choice.choiceText || ''}
                            onChange={(e) => updateChoice(index, e.target.value)}
                            placeholder={`Column ${index + 1}`}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveChoice(index)}
                            disabled={question.choices.length <= 2}
                            className="p-1 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {question.choices.length < 6 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddChoice}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Column
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Row Options (Items to Rate)</Label>
                    <div className="space-y-3 mt-2">
                      {question.rows.map((row, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium shrink-0">
                            {index + 1}
                          </div>
                          <Input
                            value={row}
                            onChange={(e) => updateRow(index, e.target.value)}
                            placeholder={`Row option ${index + 1}`}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRow(index)}
                            disabled={question.rows.length <= 2}
                            className="p-1 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {question.rows.length < 8 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addRow}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Row
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add Question"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Preview */}
        <div>
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">Question Preview</h3>
            </div>
            
            <QuestionPreview />
          </Card>
        </div>
      </div>
    </div>
  )
} 
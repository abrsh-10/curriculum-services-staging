"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PencilIcon, Plus, FileText, CheckCircle, Square, Grid3X3, Trash2, Check, X, Edit, ChevronDown, ChevronRight, ArrowRight } from "lucide-react"
import { SurveyDetail, SurveyEntry, QuestionType, useUpdateSurveySection, useDeleteSurveySection } from "@/lib/hooks/useSurvey"

interface ViewSurveyDetailsProps {
  surveyDetail: SurveyDetail
  onBackToList: () => void
  onEditSurvey: (surveyId: string) => void
  onEditSurveyStructure: (surveyId: string, options?: {
    focusSection?: {
      sectionId?: string
      action: 'add-question' | 'add-section' | 'edit-questions'
    }
  }) => void
  onRefreshDetails: () => void
}

export function ViewSurveyDetails({
  surveyDetail,
  onBackToList,
  onEditSurvey,
  onEditSurveyStructure,
  onRefreshDetails
}: ViewSurveyDetailsProps) {
  const { updateSurveySection, isLoading: isUpdatingSection } = useUpdateSurveySection()
  const { deleteSurveySection, isLoading: isDeletingSection } = useDeleteSurveySection()
  
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSectionTitle, setEditingSectionTitle] = useState("")
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sectionToDelete, setSectionToDelete] = useState<{ id: string; title: string } | null>(null)

  const handleEditSectionTitle = (sectionId: string, currentTitle: string) => {
    setEditingSectionId(sectionId)
    setEditingSectionTitle(currentTitle)
  }

  const handleSaveSectionTitle = (sectionId: string) => {
    if (!editingSectionTitle.trim()) return
    
    // Use new v2 API format
    updateSurveySection({ 
      sectionId, 
      data: { title: editingSectionTitle.trim() }
    }, {
      onSuccess: () => {
        setEditingSectionId(null)
        setEditingSectionTitle("")
        onRefreshDetails()
      }
    })
  }

  const handleCancelEdit = () => {
    setEditingSectionId(null)
    setEditingSectionTitle("")
  }

  const handleDeleteSection = (sectionId: string, sectionTitle: string) => {
    setSectionToDelete({ id: sectionId, title: sectionTitle })
    setDeleteDialogOpen(true)
  }

  const confirmDeleteSection = () => {
    if (sectionToDelete) {
      deleteSurveySection(sectionToDelete.id, {
        onSuccess: () => {
          onRefreshDetails()
          setDeleteDialogOpen(false)
          setSectionToDelete(null)
        }
      })
    }
  }

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }
  
  // Question Type Icon Component
  const QuestionTypeIcon = ({ type }: { type: QuestionType }) => {
    switch (type) {
      case 'TEXT':
        return <FileText className="h-4 w-4" />
      case 'RADIO':
        return <CheckCircle className="h-4 w-4" />
      case 'CHECKBOX':
        return <Square className="h-4 w-4" />
      case 'GRID':
        return <Grid3X3 className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Question Type Badge
  const QuestionTypeBadge = ({ type }: { type: QuestionType }) => {
    const colors = {
      TEXT: "bg-green-100 text-green-700",
      RADIO: "bg-blue-100 text-blue-700", 
      CHECKBOX: "bg-purple-100 text-purple-700",
      GRID: "bg-orange-100 text-orange-700"
    }
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
        <QuestionTypeIcon type={type} />
        {type}
      </span>
    )
  }

  // Compact Question Preview Component
  const QuestionPreview = ({ question, questionNumber }: { question: SurveyEntry; questionNumber: number }) => {
    const getChoicesPreview = (choices: string[] | any[]) => {
      const choiceTexts = choices.map(choice => 
        typeof choice === 'string' ? choice : (choice?.choiceText || choice?.choice || 'Option')
      );
      if (choiceTexts.length <= 3) {
        return choiceTexts.join(", ");
      }
      return `${choiceTexts.slice(0, 2).join(", ")} and ${choiceTexts.length - 2} more...`;
    };

    const getQuestionDetails = () => {
      switch (question.questionType) {
        case 'TEXT':
          return "Text response";
        case 'RADIO':
          return `Single choice: ${getChoicesPreview(question.choices)}`;
        case 'CHECKBOX':
          return `Multiple choice: ${getChoicesPreview(question.choices)}`;
        case 'GRID':
          return `Grid: ${question.rows.length} rows × ${question.choices.length} columns`;
        default:
          return "Unknown type";
      }
    };

    return (
      <div className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors ${
        question.followUp ? 'bg-amber-50 border-l-4 border-amber-400' : 'bg-gray-50'
      }`}>
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 ${
          question.followUp ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'
        }`}>
          {questionNumber}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <QuestionTypeBadge type={question.questionType} />
            {question.required && (
              <span className="text-red-500 text-xs font-medium">Required</span>
            )}
            {question.followUp && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                <ArrowRight className="h-3 w-3" />
                Follow-up
              </span>
            )}
          </div>
          <p className="font-medium text-gray-900 text-sm truncate mb-1">
            {question.question}
          </p>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              {getQuestionDetails()}
            </p>
            {question.followUp && question.parentQuestionNumber && question.parentChoice && (
              <p className="text-xs text-amber-600 font-medium">
                ↳ Follows Q{question.parentQuestionNumber} → Choice "{question.parentChoice}"
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="px-[7%] py-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold">{surveyDetail?.name || "Loading..."}</h2>
            {surveyDetail?.type && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                {surveyDetail.type}
              </span>
            )}
          </div>
          <p className="text-gray-600 text-sm mb-3 max-w-2xl">
            {surveyDetail?.description || "Loading..."}
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>{surveyDetail?.sections?.length || 0} sections</span>
            <span>{surveyDetail?.sections?.reduce((total, section) => total + section.questions.length, 0) || 0} questions</span>
            <span>{surveyDetail?.sections?.reduce((total, section) => 
              total + section.questions.filter(q => q.required).length, 0
            ) || 0} required</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => onEditSurvey(surveyDetail.id)}
            size="sm"
            className="bg-[#0B75FF] hover:bg-[#0B75FF]/90 text-white"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Survey
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToList}
          >
            Back to List
          </Button>
        </div>
      </div>
      
      {/* Survey Sections and Questions */}
      {surveyDetail?.sections && surveyDetail.sections.length > 0 ? (
        <div className="space-y-4">
          {surveyDetail.sections.map((section, sectionIndex) => {
            let questionCounter = 0;
            // Calculate starting question number for this section
            for (let i = 0; i < sectionIndex; i++) {
              questionCounter += surveyDetail.sections[i].questions.length;
            }
            
            return (
              <Card key={sectionIndex} className="overflow-hidden">
                <div className="p-4 border-b bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Button
                        onClick={() => toggleSectionCollapse(section.id || `section-${sectionIndex}`)}
                        variant="ghost"
                        size="sm"
                        className="p-1 h-6 w-6"
                      >
                        {collapsedSections.has(section.id || `section-${sectionIndex}`) ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {editingSectionId === (section.id || `section-${sectionIndex}`) ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingSectionTitle}
                            onChange={(e) => setEditingSectionTitle(e.target.value)}
                            className="text-lg font-semibold"
                            placeholder="Section title"
                            disabled={isUpdatingSection}
                          />
                          <Button
                            onClick={() => handleSaveSectionTitle(section.id || `section-${sectionIndex}`)}
                            size="sm"
                            variant="default"
                            disabled={!editingSectionTitle.trim() || isUpdatingSection}
                          >
                            <Check className="h-3 w-3 text-white" />
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="outline"
                            disabled={isUpdatingSection}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                         {section.title}
                              </h3>
                              <Button
                                onClick={() => handleEditSectionTitle(section.id || `section-${sectionIndex}`, section.title)}
                                size="sm"
                                variant="ghost"
                                className="p-1 h-5 w-5 text-gray-400 hover:text-gray-600"
                              >
                                <PencilIcon className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-gray-500 text-sm">
                              {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {section.questions.length > 0 && (
                        <Button
                          onClick={() => onEditSurveyStructure(surveyDetail.id, {
                            focusSection: {
                              sectionId: section.id || `section-${sectionIndex}`,
                              action: 'edit-questions'
                            }
                          })}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                      <Button
                        onClick={() => onEditSurveyStructure(surveyDetail.id, {
                          focusSection: {
                            sectionId: section.id || `section-${sectionIndex}`,
                            action: 'add-question'
                          }
                        })}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                      <Button
                        onClick={() => handleDeleteSection(section.id || `section-${sectionIndex}`, section.title)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={isDeletingSection}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {!collapsedSections.has(section.id || `section-${sectionIndex}`) && (
                  <div className="p-4">
                    {section.questions.length > 0 ? (
                      <div className="space-y-2">
                        {section.questions.map((entry, questionIndex) => (
                          <QuestionPreview
                            key={entry.id || questionIndex}
                            question={entry}
                            questionNumber={questionCounter + questionIndex + 1}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                        <p className="text-sm">No questions in this section yet.</p>
                        <Button
                          onClick={() => onEditSurveyStructure(surveyDetail.id, {
                            focusSection: {
                              sectionId: section.id || `section-${sectionIndex}`,
                              action: 'add-question'
                            }
                          })}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Question
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-6">
          <div className="text-center py-8 text-gray-500">
            <h3 className="text-lg font-medium mb-2">No Sections Found</h3>
            <p className="mb-4">This survey doesn&apos;t have any sections yet.</p>
            <Button
              onClick={() => onEditSurveyStructure(surveyDetail.id, {
                focusSection: {
                  action: 'add-section'
                }
              })}
              className="bg-[#0B75FF] hover:bg-[#0B75FF]/90 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Section
            </Button>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the section &quot;{sectionToDelete?.title}&quot;? 
              All questions in this section will also be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeletingSection}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteSection}
              disabled={isDeletingSection}
            >
              {isDeletingSection ? "Deleting..." : "Delete Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
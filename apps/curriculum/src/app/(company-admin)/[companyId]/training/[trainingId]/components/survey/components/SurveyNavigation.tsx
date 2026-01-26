"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2 } from "lucide-react"
import { SurveySectionForm, SurveyType } from "@/lib/hooks/survey-types"
import { SurveyDeleteDialog } from "../SurveyDeleteDialog"

interface SurveyNavigationProps {
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
}

export function SurveyNavigation({
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
}: SurveyNavigationProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    sectionIndex: number;
    questionIndex: number;
    questionText: string;
  }>({
    isOpen: false,
    sectionIndex: -1,
    questionIndex: -1,
    questionText: ""
  });

  const handleDeleteClick = (sectionIndex: number, questionIndex: number, questionText: string) => {
    setDeleteDialog({
      isOpen: true,
      sectionIndex,
      questionIndex,
      questionText
    });
  };

  const handleDeleteConfirm = () => {
    onDeleteQuestion(deleteDialog.sectionIndex, deleteDialog.questionIndex);
    setDeleteDialog({ isOpen: false, sectionIndex: -1, questionIndex: -1, questionText: "" });
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm sticky top-8">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-800">Survey Structure</h3>
      </div>
      
      <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Survey Settings - Only clickable in create mode */}
        <div
          className={`p-3 rounded-lg transition-all ${
            isEditMode 
              ? 'bg-gray-100 border border-gray-200 cursor-not-allowed opacity-60' 
              : editMode === 'survey' 
                ? 'bg-blue-50 border border-blue-200 shadow-sm cursor-pointer' 
                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 cursor-pointer'
          }`}
          onClick={isEditMode ? undefined : onSelectSurveySettings}
        >
          <div className="flex items-center gap-2">
            <span className="text-blue-600">⚙️</span>
            <span className="font-medium text-sm">
              Survey Settings {isEditMode && '(Read-only)'}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1 truncate">
            {surveyName || 'Untitled Survey'}
          </p>
        </div>

        {/* Sections */}
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="bg-white rounded-lg border border-gray-200">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-green-600 text-lg">📁</span>
                  <div className="flex-1">
                    {/** Allow editing section titles for newly added sections in edit mode */}
                    {/** Existing sections (index < originalSectionsCount) remain read-only in edit mode */}
                    {/** In create mode, all are editable */}
                    {/** This preserves the smart edit mode from the README */}
                    <div className="space-y-2">
                      <Input
                        value={section.title}
                        onChange={(e) => onUpdateSectionTitle(sectionIndex, e.target.value)}
                        placeholder={`Section ${sectionIndex + 1}`}
                        readOnly={isEditMode && sectionIndex < originalSectionsCount}
                        className={`text-sm h-9 border-0 px-3 py-2 font-medium bg-transparent transition-all duration-200 ${
                          isEditMode && sectionIndex < originalSectionsCount
                            ? 'cursor-not-allowed opacity-60 bg-gray-50'
                            : 'hover:bg-gray-50 focus:bg-white focus:border focus:border-blue-300 focus:rounded'
                        }`}
                      />
                      <Textarea
                        value={section.description || ""}
                        onChange={(e) => onUpdateSectionDescription(sectionIndex, e.target.value)}
                        placeholder="Section description (optional)"
                        readOnly={isEditMode && sectionIndex < originalSectionsCount}
                        className={`text-xs h-16 border-0 px-3 py-2 bg-transparent resize-none transition-all duration-200 ${
                          isEditMode && sectionIndex < originalSectionsCount
                            ? 'cursor-not-allowed opacity-60 bg-gray-50'
                            : 'hover:bg-gray-50 focus:bg-white focus:border focus:border-blue-300 focus:rounded'
                        }`}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
                {sections.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteSection(sectionIndex)}
                    className="p-1 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="p-2 space-y-1">
              {section.entries.map((entry, questionIndex) => (
                <div
                  key={questionIndex}
                  className={`p-2 rounded cursor-pointer transition-all ${
                    selectedSection === sectionIndex && selectedQuestion === questionIndex && editMode === 'question'
                      ? 'bg-blue-50 border border-blue-200 shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectQuestion(sectionIndex, questionIndex)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img 
                        src={`/question-type-${entry.questionType.toLowerCase()}.svg`}
                        alt={`${entry.questionType} icon`}
                        className="w-4 h-4 text-gray-600"
                      />
                      <span className="text-sm font-medium">Q{entry.questionNumber || questionIndex + 1}</span>
                      {questionIndex === 0 && (
                        <span className="text-[10px] text-gray-500">(Parent)</span>
                      )}
                    </div>
                    {section.entries.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(sectionIndex, questionIndex, entry.question || `Question ${questionIndex + 1}`)
                        }}
                        className="p-1 h-5 w-5 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {entry.question || 'Untitled question'}
                  </p>
                </div>
              ))}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddQuestion(sectionIndex)}
                className="w-full mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-blue-300 hover:border-blue-400"
              >
                + Add Question
              </Button>
            </div>
          </div>
        ))}

        {/* Add Section Button */}
        <Button
          variant="ghost"
          onClick={onAddSection}
          className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 border border-dashed border-green-300 hover:border-green-400"
        >
          + Add Section
        </Button>
      </div>

      <SurveyDeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, sectionIndex: -1, questionIndex: -1, questionText: "" })}
        onConfirm={handleDeleteConfirm}
        surveyName={`Question: ${deleteDialog.questionText}`}
        isDeleting={false}
      />
    </div>
  )
}

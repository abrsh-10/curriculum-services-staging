"use client"

import { SurveySummary } from "@/lib/hooks/survey-types"
import { SurveyCard } from "./SurveyCard"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, ClipboardList } from "lucide-react"
import { SurveyDeleteDialog } from "./SurveyDeleteDialog"
import { useState } from "react"

interface SurveyListProps {
  surveys: SurveySummary[]
  onCreateNew: () => void
  onViewSurvey: (surveyId: string) => void
  onEditSurvey: (surveyId: string) => void
  onDeleteSurvey: (surveyId: string) => void
  isDeletingSurvey: boolean
}

export function SurveyList({
  surveys,
  onCreateNew,
  onViewSurvey,
  onEditSurvey,
  onDeleteSurvey,
  isDeletingSurvey
}: SurveyListProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; survey: SurveySummary | null }>({
    isOpen: false,
    survey: null
  })

  const handleDeleteClick = (survey: SurveySummary) => {
    setDeleteDialog({ isOpen: true, survey })
  }

  const handleDeleteConfirm = () => {
    if (!deleteDialog.survey) return
    onDeleteSurvey(deleteDialog.survey.id)
    setDeleteDialog({ isOpen: false, survey: null })
  }

  if (surveys.length === 0) {
    return (
      <div className="px-[7%] py-8">
        <Card className="p-8 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium mb-2">No Surveys Available</h3>
          <p className="text-gray-500 mb-6">
            Get started by creating your first survey for this training.
          </p>
          <Button 
            onClick={onCreateNew}
            className="bg-[#0B75FF] hover:bg-[#0B75FF]/90 text-white"
          >
            Create Your First Survey
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-[7%] py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Training Surveys</h2>
          <p className="text-gray-600 mt-1">
            Create and manage surveys for gathering trainee feedback
          </p>
        </div>
        
        <Button
          onClick={onCreateNew}
          className="bg-[#0B75FF] hover:bg-[#0B75FF]/90 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Survey
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {surveys.map(survey => (
          <SurveyCard
            key={survey.id}
            survey={survey}
            onDelete={() => handleDeleteClick(survey)}
            onView={() => onViewSurvey(survey.id)}
            onEdit={() => onEditSurvey(survey.id)}
          />
        ))}
      </div>

      <SurveyDeleteDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, survey: null })}
        onConfirm={handleDeleteConfirm}
        surveyName={deleteDialog.survey?.name || ""}
        isDeleting={isDeletingSurvey}
      />
    </div>
  )
} 
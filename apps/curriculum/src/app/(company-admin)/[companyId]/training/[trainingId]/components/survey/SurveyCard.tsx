"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PencilIcon, Trash2, ClipboardList } from "lucide-react"
import { SurveySummary } from "@/lib/hooks/survey-types"

interface SurveyCardProps {
  survey: SurveySummary
  onDelete: () => void
  onView: () => void
  onEdit: () => void
}

export function SurveyCard({
  survey,
  onDelete,
  onView,
  onEdit
}: SurveyCardProps) {
  const maxDescriptionLength = 100;
  const truncatedDescription = survey.description && survey.description.length > maxDescriptionLength
    ? survey.description.substring(0, maxDescriptionLength) + "..."
    : survey.description;

  return (
    <Card className="bg-white border p-4 hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer group" onClick={onView}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-semibold truncate group-hover:text-blue-600 transition-colors">{survey.name}</h3>
            {survey.type && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium shrink-0">
                {survey.type}
              </span>
            )}
          </div>
          
          {truncatedDescription && (
            <p className="text-gray-600 text-sm mb-2 leading-relaxed line-clamp-2">
              {truncatedDescription}
            </p>
          )}
          
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <ClipboardList className="h-3 w-3 text-gray-400" />
              <span>{survey.sectionCount} section{survey.sectionCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="h-7 w-7 p-0 hover:bg-gray-100"
            title="Edit survey"
          >
            <PencilIcon className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            title="Delete survey"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  )
} 
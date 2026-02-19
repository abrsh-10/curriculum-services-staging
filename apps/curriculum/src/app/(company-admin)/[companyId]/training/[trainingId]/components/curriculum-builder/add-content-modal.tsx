"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  useAvailableSurveys,
  useAvailableAssessments,
  useAddContentItem,
  AvailableAssessment,
  AvailableSurvey,
} from "@/lib/hooks/useCurriculumStructure"

type ContentTab = "ASSESSMENT" | "SURVEY"

interface AddContentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cohortId: string
  moduleId: string
}

export function AddContentModal({
  open,
  onOpenChange,
  cohortId,
  moduleId,
}: AddContentModalProps) {
  const [activeTab, setActiveTab] = useState<ContentTab>("ASSESSMENT")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)

  const { mutateAsync: addContentItem } = useAddContentItem()

  const { data: assessments, isLoading: isLoadingAssessments } =
    useAvailableAssessments(cohortId, moduleId, open)
  const { data: surveys, isLoading: isLoadingSurveys } =
    useAvailableSurveys(cohortId, moduleId, open)

  const currentItems: (AvailableAssessment | AvailableSurvey)[] =
    activeTab === "ASSESSMENT" ? (assessments ?? []) : (surveys ?? [])
  const isLoadingItems =
    activeTab === "ASSESSMENT" ? isLoadingAssessments : isLoadingSurveys

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleTabChange = useCallback((tab: ContentTab) => {
    setActiveTab(tab)
    setSelectedIds(new Set())
  }, [])

  const handleAddSelected = useCallback(async () => {
    if (selectedIds.size === 0) return
    setIsAdding(true)

    try {
      for (const contentId of selectedIds) {
        await addContentItem({
          cohortId,
          moduleId,
          type: activeTab,
          contentId,
        })
      }
      setSelectedIds(new Set())
      onOpenChange(false)
    } finally {
      setIsAdding(false)
    }
  }, [selectedIds, activeTab, cohortId, moduleId, addContentItem, onOpenChange])

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!isAdding) {
        setSelectedIds(new Set())
        onOpenChange(nextOpen)
      }
    },
    [isAdding, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg">Select a Content</DialogTitle>
        </DialogHeader>

        <div className="border-t border-gray-200" />

        <div className="px-6 pt-4">
          <div className="flex rounded-lg bg-[#F7F7F7] p-1 overflow-hidden">
            <button
              onClick={() => handleTabChange("ASSESSMENT")}
              className={`flex-1 py-2 text-sm font-medium text-center rounded-md transition-colors ${
                activeTab === "ASSESSMENT"
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Assessments
            </button>
            <button
              onClick={() => handleTabChange("SURVEY")}
              className={`flex-1 py-2 text-sm font-medium text-center rounded-md transition-colors ${
                activeTab === "SURVEY"
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Surveys
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 min-h-0 px-6 py-4">
          {isLoadingItems ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-pulse flex space-x-2">
                <div className="h-2 w-2 bg-gray-400 rounded-full" />
                <div className="h-2 w-2 bg-gray-400 rounded-full" />
                <div className="h-2 w-2 bg-gray-400 rounded-full" />
              </div>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-10">
              No available {activeTab === "ASSESSMENT" ? "assessments" : "surveys"} to add.
            </div>
          ) : (
            currentItems.map((item) => {
              const isSelected = selectedIds.has(item.id)
              const isAssessment = activeTab === "ASSESSMENT"
              const assessmentItem = isAssessment ? (item as AvailableAssessment) : null
              const surveyItem = !isAssessment ? (item as AvailableSurvey) : null

              const typeBadge = item.type.replace(/_/g, " ")
              const sectionLabel = `${item.sectionCount} section${item.sectionCount !== 1 ? "s" : ""}`

              let durationLabel = ""
              if (assessmentItem && assessmentItem.duration > 0) {
                const mins = assessmentItem.duration
                durationLabel = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
              } else if (surveyItem?.timeToTakeMinutes) {
                durationLabel = `${surveyItem.timeToTakeMinutes}m`
              }

              return (
                <button
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${
                    isSelected
                      ? "border-brand bg-brand/5 ring-1 ring-brand/20"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    {assessmentItem && (
                      <span
                        className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          assessmentItem.approvalStatus === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {assessmentItem.approvalStatus}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase">
                      {typeBadge}
                    </span>
                    <span>{sectionLabel}</span>
                    {durationLabel && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>{durationLabel}</span>
                      </>
                    )}
                    {assessmentItem && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>{assessmentItem.maxAttempts} attempt{assessmentItem.maxAttempts !== 1 ? "s" : ""}</span>
                      </>
                    )}
                  </div>
                  {item.description && (
                    <div className="mt-1.5 text-xs text-gray-400 truncate">
                      {item.description}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-lg"
            onClick={() => handleClose(false)}
            disabled={isAdding}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-11 rounded-lg bg-brand hover:bg-brand/90 text-white"
            onClick={handleAddSelected}
            disabled={isAdding || selectedIds.size === 0}
          >
            {isAdding ? "Adding..." : "Add Selected"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

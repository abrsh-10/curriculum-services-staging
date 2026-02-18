"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Cohort } from "@/lib/hooks/useCohorts"
import { useCopyOrdering } from "@/lib/hooks/useCurriculumStructure"

interface ApplyToCohortsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceCohortId: string
  moduleId: string
  allLeafCohorts: Cohort[]
}

export function ApplyToCohortsModal({
  open,
  onOpenChange,
  sourceCohortId,
  moduleId,
  allLeafCohorts,
}: ApplyToCohortsModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { mutateAsync: copyOrdering, isPending } = useCopyOrdering()

  const otherCohorts = useMemo(
    () => allLeafCohorts.filter((c) => c.id !== sourceCohortId),
    [allLeafCohorts, sourceCohortId]
  )

  const toggleCohort = useCallback((id: string) => {
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

  const handleApply = useCallback(async () => {
    if (selectedIds.size === 0) return

    try {
      await copyOrdering({
        sourceCohortId,
        moduleId,
        targetCohortIds: Array.from(selectedIds),
      })
      setSelectedIds(new Set())
      onOpenChange(false)
    } catch {
      // Error toast handled by the mutation
    }
  }, [selectedIds, sourceCohortId, moduleId, copyOrdering, onOpenChange])

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!isPending) {
        setSelectedIds(new Set())
        onOpenChange(nextOpen)
      }
    },
    [isPending, onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Apply Curriculum to Multiple Cohorts</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 py-2">
          {otherCohorts.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-10">
              No other cohorts available.
            </div>
          ) : (
            otherCohorts.map((cohort) => {
              const isSelected = selectedIds.has(cohort.id)
              return (
                <button
                  key={cohort.id}
                  onClick={() => toggleCohort(cohort.id)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-left"
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? "border-brand bg-brand"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate">
                    {cohort.name}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <DialogFooter className="flex sm:flex-row gap-2 pt-2 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-brand hover:bg-brand/90 text-white"
            onClick={handleApply}
            disabled={isPending || selectedIds.size === 0}
          >
            {isPending ? "Applying..." : "Apply to selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

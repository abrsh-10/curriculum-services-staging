"use client"

import { useState, useCallback, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Loading } from "@/components/ui/loading"
import { useCohorts } from "@/lib/hooks/useCohorts"
import {
  useCurriculumModules,
  useReorderModules,
  useReorderContentItems,
  ContentOrderItem,
} from "@/lib/hooks/useCurriculumStructure"
import { getAllLeafCohorts } from "@/lib/utils/cohort-utils"
import { CohortItem } from "./curriculum-builder/cohort-item"

interface CurriculumStructureProps {
  trainingId: string
}

export function CurriculumStructure({ trainingId }: CurriculumStructureProps) {
  const { data: cohortsData, isLoading: isCohortsLoading } = useCohorts({
    trainingId,
    pageSize: 500,
  })
  const { data: modulesData, isLoading: isModulesLoading } =
    useCurriculumModules(trainingId)

  const { mutateAsync: reorderModules, isPending: isReorderingModules } =
    useReorderModules()
  const { mutateAsync: reorderContentItems, isPending: isReorderingContent } =
    useReorderContentItems()

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingSave, setPendingSave] = useState<{
    cohortId: string
    moduleOrder: string[] | null
    contentChanges: Map<string, ContentOrderItem[]>
  } | null>(null)
  const [savedCohortId, setSavedCohortId] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const allLeafCohorts = useMemo(() => {
    if (!cohortsData?.cohorts) return []
    return getAllLeafCohorts(cohortsData.cohorts)
  }, [cohortsData?.cohorts])

  const totalElements = allLeafCohorts.length
  const totalPages = Math.ceil(totalElements / pageSize)

  const paginatedCohorts = useMemo(() => {
    const start = (page - 1) * pageSize
    return allLeafCohorts.slice(start, start + pageSize)
  }, [allLeafCohorts, page, pageSize])

  const modules = useMemo(() => modulesData?.modules ?? [], [modulesData?.modules])
  const isLoading = isCohortsLoading || isModulesLoading
  const isSaving = isReorderingModules || isReorderingContent

  const handleCohortSave = useCallback(
    (data: {
      cohortId: string
      moduleOrder: string[] | null
      contentChanges: Map<string, ContentOrderItem[]>
    }) => {
      setPendingSave(data)
      setShowConfirmDialog(true)
    },
    []
  )

  const handleConfirmSave = useCallback(async () => {
    if (!pendingSave) return

    try {
      if (pendingSave.moduleOrder) {
        await reorderModules({
          trainingId,
          orderedModuleIds: pendingSave.moduleOrder,
        })
      }

      for (const [moduleId, orderedItems] of pendingSave.contentChanges) {
        await reorderContentItems({
          cohortId: pendingSave.cohortId,
          moduleId,
          orderedItems,
        })
      }

      setSavedCohortId(pendingSave.cohortId)
      setPendingSave(null)
      setShowConfirmDialog(false)
      setTimeout(() => setSavedCohortId(null), 100)
    } catch {
      setShowConfirmDialog(false)
    }
  }, [pendingSave, reorderModules, reorderContentItems, trainingId])

  if (isLoading) {
    return <Loading />
  }

  if (!allLeafCohorts.length) {
    return (
      <div className="md:px-8 px-4 py-10">
        <div className="flex flex-col items-center justify-center p-8">
          <p className="text-gray-500">
            No cohorts found. Please create cohorts first to structure the
            curriculum.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="md:px-8 px-4 py-8 mb-10">
      <div className="space-y-4">
        {paginatedCohorts.map((cohort) => (
          <CohortItem
            key={cohort.id}
            cohort={cohort}
            modules={modules}
            allLeafCohorts={allLeafCohorts}
            onSave={handleCohortSave}
            isSaving={isSaving}
            savedCohortId={savedCohortId}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="md:text-sm text-xs text-gray-500">Showing</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value)
                  setPageSize(newSize)
                  setPage(1)
                }}
                className="border rounded-md md:text-sm text-xs md:px-2 px-2 py-1 bg-white"
                title="Page Size"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="text-xs md:text-sm pl-2 text-gray-500">
              {(() => {
                const startRecord = page > 0 ? ((page - 1) * pageSize) + 1 : 0
                const endRecord = Math.min(page * pageSize, totalElements)
                return totalElements > 0
                  ? `Showing ${startRecord} to ${endRecord} out of ${totalElements} records`
                  : "No records to show"
              })()}
            </div>

            <div className="flex gap-1">
              <Button
                variant="pagination"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber
                if (totalPages <= 5) {
                  pageNumber = i + 1
                } else {
                  const middle = 2
                  const start = Math.max(1, page - middle)
                  const end = Math.min(totalPages, start + 4)
                  const adjustedStart = end === totalPages ? Math.max(1, end - 4) : start
                  pageNumber = adjustedStart + i
                }
                if (pageNumber > totalPages) return null
                return (
                  <Button
                    key={pageNumber}
                    variant="outline"
                    className={page === pageNumber ? "border-brand text-brand" : ""}
                    size="sm"
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                )
              }).filter(Boolean)}
              <Button
                variant="pagination"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="md:w-4 md:h-4 w-2 h-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Reorder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save the new order? This will update the
              curriculum structure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              {isSaving ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

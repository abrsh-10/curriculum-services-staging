"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { ChevronRight, ChevronUp, Eye, Save, Copy, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Cohort } from "@/lib/hooks/useCohorts"
import { CurriculumModule, ContentOrderItem } from "@/lib/hooks/useCurriculumStructure"
import { ModuleCard, SortableModuleCard } from "./module-card"
import { ApplyToCohortsModal } from "./apply-to-cohorts-modal"

export interface CohortItemProps {
  cohort: Cohort
  modules: CurriculumModule[]
  allLeafCohorts: Cohort[]
  onSave: (data: {
    cohortId: string
    moduleOrder: string[] | null
    contentChanges: Map<string, ContentOrderItem[]>
  }) => void
  isSaving: boolean
  savedCohortId: string | null
}

export function CohortItem({
  cohort,
  modules,
  allLeafCohorts,
  onSave,
  isSaving,
  savedCohortId,
}: CohortItemProps) {
  const params = useParams()
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isNavigatingToPreview, setIsNavigatingToPreview] = useState(false)
  const [orderedModules, setOrderedModules] = useState<CurriculumModule[]>([])
  const [expandedModuleId, setExpandedModuleId] = useState<string>("")
  const [showApplyModal, setShowApplyModal] = useState(false)

  const [hasModuleChanges, setHasModuleChanges] = useState(false)
  const contentChangesRef = useRef<Map<string, ContentOrderItem[]>>(new Map())
  const [hasContentChanges, setHasContentChanges] = useState(false)

  const hasPendingChanges = hasModuleChanges || hasContentChanges

  useEffect(() => {
    if (!isEditMode && modules.length) {
      setOrderedModules(
        [...modules].sort((a, b) => a.moduleOrder - b.moduleOrder)
      )
    }
  }, [modules, isEditMode])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleModuleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setOrderedModules((prev) => {
        const oldIndex = prev.findIndex((m) => m.id === active.id)
        const newIndex = prev.findIndex((m) => m.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
      setHasModuleChanges(true)
    }
  }, [])

  const handleContentChange = useCallback(
    (moduleId: string, orderedItems: ContentOrderItem[]) => {
      contentChangesRef.current.set(moduleId, orderedItems)
      setHasContentChanges(true)
    },
    []
  )

  const handleModuleToggle = useCallback((moduleId: string) => {
    setExpandedModuleId((prev) => (prev === moduleId ? "" : moduleId))
  }, [])

  const handleEnterEdit = useCallback(() => {
    setIsEditMode(true)
    setIsOpen(true)
  }, [])

  // const handleExitEdit = useCallback(() => {
  //   setIsEditMode(false)
  //   setHasModuleChanges(false)
  //   setHasContentChanges(false)
  //   contentChangesRef.current.clear()
  //   if (modules.length) {
  //     setOrderedModules(
  //       [...modules].sort((a, b) => a.moduleOrder - b.moduleOrder)
  //     )
  //   }
  // }, [modules])

  useEffect(() => {
    if (savedCohortId === cohort.id) {
      setHasModuleChanges(false)
      setHasContentChanges(false)
      contentChangesRef.current.clear()
    }
  }, [savedCohortId, cohort.id])

  const handleSaveClick = useCallback(() => {
    onSave({
      cohortId: cohort.id,
      moduleOrder: hasModuleChanges ? orderedModules.map((m) => m.id) : null,
      contentChanges: contentChangesRef.current,
    })
  }, [cohort.id, hasModuleChanges, orderedModules, onSave])

  const handlePreviewStructure = useCallback(() => {
    setIsNavigatingToPreview(true)
    const companyId = params.companyId as string
    const trainingId = params.trainingId as string
    router.push(
      `/${companyId}/training/${trainingId}/curriculum-builder/preview?cohortId=${cohort.id}`
    )
  }, [params.companyId, params.trainingId, cohort.id, router])

  return (
    <div className="border border-gray-200 rounded-lg bg-[#FBFBFB] overflow-hidden">
      <div className="flex items-center px-5 py-4">
        <div className="flex-1 flex items-center justify-between min-w-0">
          <h3 className="font-semibold text-base md:text-lg truncate">
            {cohort.name}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 text-[#09C3FD] hover:text-[#09C3FD]/70"
                  onClick={handlePreviewStructure}
                  disabled={isSaving || isNavigatingToPreview}
                >
                  {isNavigatingToPreview ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {isNavigatingToPreview ? "Loading..." : "Preview Structure"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 border-brand text-brand hover:bg-brand/5 hover:text-brand"
                  onClick={() => setShowApplyModal(true)}
                  disabled={!expandedModuleId || isSaving}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Apply to Other Cohorts
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`text-xs gap-1.5 ${
                    hasPendingChanges
                      ? "border-brand bg-brand text-white hover:bg-brand/90 hover:text-white"
                      : "border-brand text-brand hover:bg-brand/5"
                  }`}
                  onClick={hasPendingChanges ? handleSaveClick : undefined}
                  disabled={isSaving || !hasPendingChanges}
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 text-[#09C3FD] hover:text-[#09C3FD]/70"
                  onClick={handlePreviewStructure}
                  disabled={isNavigatingToPreview}
                >
                  {isNavigatingToPreview ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {isNavigatingToPreview ? "Loading..." : "Preview Structure"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 border-brand text-brand hover:bg-brand/5 hover:text-brand"
                  onClick={handleEnterEdit}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  Edit Structure
                </Button>
              </>
            )}

            <button
              onClick={() => setIsOpen((prev) => !prev)}
              className="p-1 hover:bg-gray-200 rounded-md transition-colors"
            >
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="px-6 pb-5 space-y-3">
          {orderedModules.length === 0 ? (
            <div className="text-sm text-gray-500 p-4 bg-white rounded-md border border-dashed border-gray-200 text-center">
              No modules in this training yet.
            </div>
          ) : isEditMode ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleModuleDragEnd}
            >
              <SortableContext
                items={orderedModules.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                {orderedModules.map((mod) => (
                  <SortableModuleCard
                    key={mod.id}
                    module={mod}
                    cohortId={cohort.id}
                    isEditMode={isEditMode}
                    isExpanded={expandedModuleId === mod.id}
                    onToggle={() => handleModuleToggle(mod.id)}
                    onContentChange={handleContentChange}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            orderedModules.map((mod) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                cohortId={cohort.id}
                isEditMode={false}
                isExpanded={expandedModuleId === mod.id}
                onToggle={() => handleModuleToggle(mod.id)}
                onContentChange={handleContentChange}
              />
            ))
          )}
        </div>
      )}

      {expandedModuleId && (
        <ApplyToCohortsModal
          open={showApplyModal}
          onOpenChange={setShowApplyModal}
          sourceCohortId={cohort.id}
          moduleId={expandedModuleId}
          allLeafCohorts={allLeafCohorts}
        />
      )}
    </div>
  )
}

"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronRight, ChevronUp, Eye, Save } from "lucide-react"
import Image from "next/image"
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
import { useCohorts, Cohort } from "@/lib/hooks/useCohorts"
import {
  useCurriculumModules,
  useModuleContents,
  useReorderModules,
  useReorderContentItems,
  CurriculumModule,
  ModuleContentItem,
  ContentOrderItem,
} from "@/lib/hooks/useCurriculumStructure"
import { getAllLeafCohorts } from "@/lib/utils/cohort-utils"

// ---- Drag Handle SVG ----

function DragHandle({ size = "md" }: { size?: "sm" | "md" }) {
  const w = size === "sm" ? 12 : 16
  const h = size === "sm" ? 18 : 24
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {size === "sm" ? (
        <>
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="9" r="1.5" />
          <circle cx="9" cy="9" r="1.5" />
          <circle cx="3" cy="15" r="1.5" />
          <circle cx="9" cy="15" r="1.5" />
        </>
      ) : (
        <>
          <circle cx="5" cy="4" r="1.5" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="10" r="1.5" />
          <circle cx="11" cy="10" r="1.5" />
          <circle cx="5" cy="16" r="1.5" />
          <circle cx="11" cy="16" r="1.5" />
          <circle cx="5" cy="22" r="1.5" />
          <circle cx="11" cy="22" r="1.5" />
        </>
      )}
    </svg>
  )
}

// ---- Module Stats Row ----

function ModuleStats({
  lessonCount,
  contentCount,
  catCount,
}: {
  lessonCount: number
  contentCount: number
  catCount: number
}) {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <span className="flex items-center gap-1.5">
        <Image src="/newIcon.svg" alt="" width={14} height={14} />
        <span>{lessonCount} Lesson</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Image src="/newIcon.svg" alt="" width={14} height={14} />
        <span>{contentCount} Content</span>
      </span>
      <span className="flex items-center gap-1.5">
        <Image src="/newIcon.svg" alt="" width={14} height={14} />
        <span>{catCount} CAT</span>
      </span>
    </div>
  )
}

// ---- Sortable Content Item ----

function SortableContentItem({
  item,
  isEditMode,
}: {
  item: ModuleContentItem
  isEditMode: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-md ${
        isDragging ? "shadow-md ring-1 ring-brand/20" : ""
      }`}
    >
      {isEditMode ? (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
          aria-label="Drag to reorder"
        >
          <DragHandle size="sm" />
        </div>
      ) : (
        <div className="text-gray-300 flex-shrink-0">
          <DragHandle size="sm" />
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-sm truncate">{item.name}</span>
        {item.contentFileType && (
          <span className="text-xs text-gray-400">{item.contentFileType}</span>
        )}
      </div>
    </div>
  )
}

// ---- Module Content Section ----

interface ModuleContentSectionProps {
  moduleId: string
  cohortId: string
  isEditMode: boolean
  onContentChange: (moduleId: string, orderedItems: ContentOrderItem[]) => void
}

function ModuleContentSection({
  moduleId,
  cohortId,
  isEditMode,
  onContentChange,
}: ModuleContentSectionProps) {
  const { data, isLoading } = useModuleContents(moduleId, cohortId)
  const [orderedItems, setOrderedItems] = useState<ModuleContentItem[]>([])

  useEffect(() => {
    if (data?.contents) {
      setOrderedItems(data.contents)
    }
  }, [data?.contents])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        setOrderedItems((prev) => {
          const oldIndex = prev.findIndex((i) => i.id === active.id)
          const newIndex = prev.findIndex((i) => i.id === over.id)
          const newOrder = arrayMove(prev, oldIndex, newIndex)
          onContentChange(
            moduleId,
            newOrder.map((i) => ({ type: i.type, id: i.id }))
          )
          return newOrder
        })
      }
    },
    [moduleId, onContentChange]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-50/50 rounded-md">
        <div className="animate-pulse flex space-x-2">
          <div className="h-2 w-2 bg-gray-400 rounded-full" />
          <div className="h-2 w-2 bg-gray-400 rounded-full" />
          <div className="h-2 w-2 bg-gray-400 rounded-full" />
        </div>
      </div>
    )
  }

  if (!orderedItems.length) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-gray-50/50 rounded-md text-center">
        No content
      </div>
    )
  }

  if (!isEditMode) {
    return (
      <div className="space-y-2">
        {orderedItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-md"
          >
            <div className="text-gray-300 flex-shrink-0">
              <DragHandle size="sm" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-sm truncate">{item.name}</span>
              {item.contentFileType && (
                <span className="text-xs text-gray-400">
                  {item.contentFileType}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedItems.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {orderedItems.map((item) => (
            <SortableContentItem
              key={item.id}
              item={item}
              isEditMode={isEditMode}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

// ---- Module Card (preview mode) ----

interface ModuleCardProps {
  module: CurriculumModule
  cohortId: string
  isEditMode: boolean
  isExpanded: boolean
  onToggle: () => void
  onContentChange: (moduleId: string, orderedItems: ContentOrderItem[]) => void
}

function ModuleCard({
  module,
  cohortId,
  isEditMode,
  isExpanded,
  onToggle,
  onContentChange,
}: ModuleCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex flex-col items-start text-left gap-1">
          <span className="font-semibold text-sm md:text-base">
            Module {module.moduleOrder} {module.name}
          </span>
          <ModuleStats
            lessonCount={module.lessonCount}
            contentCount={module.contentCount}
            catCount={module.catCount}
          />
        </div>
        <ChevronRight
          className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>
      {isExpanded && (
        <div className="px-5 pb-4 pt-2 bg-gray-50/30">
          <ModuleContentSection
            moduleId={module.id}
            cohortId={cohortId}
            isEditMode={isEditMode}
            onContentChange={onContentChange}
          />
        </div>
      )}
    </div>
  )
}

// ---- Sortable Module Card (edit mode with drag handle inside the card) ----

function SortableModuleCard({
  module,
  cohortId,
  isEditMode,
  isExpanded,
  onToggle,
  onContentChange,
}: ModuleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg bg-white overflow-hidden ${
        isDragging ? "opacity-90 shadow-lg ring-2 ring-brand/20" : ""
      }`}
    >
      <div className="flex items-start">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center px-3 py-5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label="Drag to reorder module"
        >
          <DragHandle />
        </div>
        {/* Module content */}
        <div className="flex-1 min-w-0">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-3 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex flex-col items-start text-left gap-1">
              <span className="font-semibold text-sm md:text-base">
                Module {module.moduleOrder} {module.name}
              </span>
              <ModuleStats
                lessonCount={module.lessonCount}
                contentCount={module.contentCount}
                catCount={module.catCount}
              />
            </div>
            <ChevronRight
              className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </button>
          {isExpanded && (
            <div className="px-3 pb-4 pt-2 bg-gray-50/30">
              <ModuleContentSection
                moduleId={module.id}
                cohortId={cohortId}
                isEditMode={isEditMode}
                onContentChange={onContentChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Cohort Accordion Item ----

interface CohortItemProps {
  cohort: Cohort
  modules: CurriculumModule[]
  onSave: (data: {
    cohortId: string
    moduleOrder: string[] | null
    contentChanges: Map<string, ContentOrderItem[]>
  }) => void
  isSaving: boolean
  savedCohortId: string | null
}

function CohortItem({
  cohort,
  modules,
  onSave,
  isSaving,
  savedCohortId,
}: CohortItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [orderedModules, setOrderedModules] = useState<CurriculumModule[]>([])
  const [expandedModuleId, setExpandedModuleId] = useState<string>("")

  // Track pending changes
  const [hasModuleChanges, setHasModuleChanges] = useState(false)
  const contentChangesRef = useRef<Map<string, ContentOrderItem[]>>(new Map())
  const [hasContentChanges, setHasContentChanges] = useState(false)

  const hasPendingChanges = hasModuleChanges || hasContentChanges

  // Sync modules to local state
  useEffect(() => {
    if (modules.length) {
      setOrderedModules(
        [...modules].sort((a, b) => a.moduleOrder - b.moduleOrder)
      )
    }
  }, [modules])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleModuleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        setOrderedModules((prev) => {
          const oldIndex = prev.findIndex((m) => m.id === active.id)
          const newIndex = prev.findIndex((m) => m.id === over.id)
          return arrayMove(prev, oldIndex, newIndex)
        })
        setHasModuleChanges(true)
      }
    },
    []
  )

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

  const handleExitEdit = useCallback(() => {
    setIsEditMode(false)
    setHasModuleChanges(false)
    setHasContentChanges(false)
    contentChangesRef.current.clear()
    // Reset module order
    if (modules.length) {
      setOrderedModules(
        [...modules].sort((a, b) => a.moduleOrder - b.moduleOrder)
      )
    }
  }, [modules])

  // Exit edit mode when save succeeds for this cohort
  useEffect(() => {
    if (savedCohortId === cohort.id) {
      setIsEditMode(false)
      setHasModuleChanges(false)
      setHasContentChanges(false)
      contentChangesRef.current.clear()
    }
  }, [savedCohortId, cohort.id])

  const handleSaveClick = useCallback(() => {
    onSave({
      cohortId: cohort.id,
      moduleOrder: hasModuleChanges
        ? orderedModules.map((m) => m.id)
        : null,
      contentChanges: contentChangesRef.current,
    })
  }, [cohort.id, hasModuleChanges, orderedModules, onSave])

  return (
    <div className="border border-gray-200 rounded-lg bg-[#FBFBFB] overflow-hidden">
      {/* Cohort Header */}
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
                  className="text-xs gap-1.5 text-teal-600 hover:text-teal-700"
                  onClick={handleExitEdit}
                  disabled={isSaving}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview Structure
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
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 text-teal-600 hover:text-teal-700"
                  onClick={() => setIsOpen((prev) => !prev)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview Structure
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 border-brand text-brand hover:bg-brand/5"
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

            {/* Expand/Collapse */}
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

      {/* Cohort Body - Modules */}
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
    </div>
  )
}

// ---- Main Component ----

interface CurriculumStructureProps {
  trainingId: string
}

export function CurriculumStructure({ trainingId }: CurriculumStructureProps) {
  const { data: cohortsData, isLoading: isCohortsLoading } = useCohorts({
    trainingId,
    pageSize: 100,
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

  const leafCohorts = useMemo(() => {
    if (!cohortsData?.cohorts) return []
    return getAllLeafCohorts(cohortsData.cohorts)
  }, [cohortsData?.cohorts])

  const modules = modulesData?.modules ?? []
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
      // Save module order if changed
      if (pendingSave.moduleOrder) {
        await reorderModules({
          trainingId,
          orderedModuleIds: pendingSave.moduleOrder,
        })
      }

      // Save all content changes
      for (const [moduleId, orderedItems] of pendingSave.contentChanges) {
        await reorderContentItems({
          cohortId: pendingSave.cohortId,
          moduleId,
          orderedItems,
        })
      }

      // Signal the cohort to exit edit mode
      setSavedCohortId(pendingSave.cohortId)
      setPendingSave(null)
      setShowConfirmDialog(false)

      // Reset after a tick so it can be triggered again
      setTimeout(() => setSavedCohortId(null), 100)
    } catch {
      setShowConfirmDialog(false)
    }
  }, [pendingSave, reorderModules, reorderContentItems, trainingId])

  if (isLoading) {
    return <Loading />
  }

  if (!leafCohorts.length) {
    return (
      <div className="px-[7%] py-10">
        <h1 className="text-md md:text-xl text-black mb-4 font-semibold">
          Curriculum Structure
        </h1>
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
    <div className="px-[7%] py-10 mb-10">
      <div className="mb-6">
        <h1 className="text-md md:text-xl text-black font-semibold">
          Curriculum Structure
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Organize modules and content within each cohort
        </p>
      </div>

      <div className="space-y-4">
        {leafCohorts.map((cohort) => (
          <CohortItem
            key={cohort.id}
            cohort={cohort}
            modules={modules}
            onSave={handleCohortSave}
            isSaving={isSaving}
            savedCohortId={savedCohortId}
          />
        ))}
      </div>

      {/* Confirmation Dialog */}
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

"use client"

import { useState, useCallback, useEffect } from "react"
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
import { ChevronRight } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import { useModulesByTrainingId } from "@/lib/hooks/useModule"
import { useGetLessons } from "@/lib/hooks/useLesson"
import { useReorderModules } from "@/lib/hooks/useCurriculumStructure"
import { Module } from "@/types/module"

interface CurriculumStructureProps {
  trainingId: string
}

// ---- Sortable Module Item ----

interface SortableModuleItemProps {
  module: Module
  index: number
  isExpanded: boolean
  onToggleExpand: (moduleId: string) => void
}

function SortableModuleItem({
  module,
  index,
  isExpanded,
  onToggleExpand,
}: SortableModuleItemProps) {
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
    position: isDragging ? ("relative" as const) : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem
        value={module.id}
        className={`border border-[#CED4DA] rounded-lg ${
          isDragging ? "shadow-lg bg-white ring-2 ring-brand/20" : "bg-white"
        }`}
      >
        <div className="flex items-center">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center px-3 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            aria-label="Drag to reorder"
          >
            <svg
              width="16"
              height="24"
              viewBox="0 0 16 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="5" cy="4" r="1.5" />
              <circle cx="11" cy="4" r="1.5" />
              <circle cx="5" cy="10" r="1.5" />
              <circle cx="11" cy="10" r="1.5" />
              <circle cx="5" cy="16" r="1.5" />
              <circle cx="11" cy="16" r="1.5" />
              <circle cx="5" cy="22" r="1.5" />
              <circle cx="11" cy="22" r="1.5" />
            </svg>
          </div>

          {/* Module Header */}
          <div className="flex-1 flex items-center justify-between py-5 pr-4">
            <div className="flex flex-col">
              <span className="font-semibold text-md md:text-lg">
                Module {index + 1} - {module.name}
              </span>
              {module.trainingTag && (
                <span className="text-xs text-gray-500 mt-1">
                  {module.trainingTag.name}
                </span>
              )}
            </div>
            <AccordionTrigger
              className="p-1 hover:bg-gray-100 rounded-md [&[data-state=open]>svg]:rotate-90 transition-transform"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand(module.id)
              }}
            >
              <ChevronRight className="h-5 w-5 text-gray-500 transition-transform" />
            </AccordionTrigger>
          </div>
        </div>

        <AccordionContent>
          <div className="px-6 pb-4">
            <ModuleContentPreview moduleId={module.id} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  )
}

// ---- Module Content Preview (lessons inside expanded module) ----

function ModuleContentPreview({ moduleId }: { moduleId: string }) {
  const { data: lessons, isLoading } = useGetLessons(moduleId)

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

  if (!lessons || lessons.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4 bg-gray-50/50 rounded-md">
        No lessons in this module yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {lessons.map((lesson) => (
        <div
          key={lesson.id}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-md"
        >
          {/* Decorative dots (non-draggable) */}
          <div className="text-gray-300">
            <svg
              width="12"
              height="18"
              viewBox="0 0 12 18"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="3" cy="3" r="1.5" />
              <circle cx="9" cy="3" r="1.5" />
              <circle cx="3" cy="9" r="1.5" />
              <circle cx="9" cy="9" r="1.5" />
              <circle cx="3" cy="15" r="1.5" />
              <circle cx="9" cy="15" r="1.5" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{lesson.name}</span>
            <span className="text-xs text-gray-500">
              {lesson.duration} {lesson.durationType.toLowerCase()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Main Component ----

export function CurriculumStructure({ trainingId }: CurriculumStructureProps) {
  const { data, isLoading } = useModulesByTrainingId(trainingId)
  const { mutateAsync: reorderModules, isPending: isReordering } =
    useReorderModules()

  const [orderedModules, setOrderedModules] = useState<Module[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [expandedModule, setExpandedModule] = useState<string>("")

  // Sync modules from API to local state
  useEffect(() => {
    if (data?.modules) {
      setOrderedModules(data.modules)
      setHasChanges(false)
    }
  }, [data?.modules])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        setOrderedModules((prev) => {
          const oldIndex = prev.findIndex((m) => m.id === active.id)
          const newIndex = prev.findIndex((m) => m.id === over.id)
          const newOrder = arrayMove(prev, oldIndex, newIndex)
          return newOrder
        })
        setHasChanges(true)
      }
    },
    []
  )

  const handleToggleExpand = useCallback((moduleId: string) => {
    setExpandedModule((prev) => (prev === moduleId ? "" : moduleId))
  }, [])

  const handleSaveClick = useCallback(() => {
    setShowConfirmDialog(true)
  }, [])

  const handleConfirmReorder = useCallback(async () => {
    try {
      await reorderModules({
        trainingId,
        orderedModuleIds: orderedModules.map((m) => m.id),
      })
      setHasChanges(false)
      setShowConfirmDialog(false)
    } catch {
      // Error is handled by the mutation's onError
      setShowConfirmDialog(false)
    }
  }, [reorderModules, trainingId, orderedModules])

  const handleCancelReorder = useCallback(() => {
    // Reset to original order
    if (data?.modules) {
      setOrderedModules(data.modules)
      setHasChanges(false)
    }
  }, [data?.modules])

  if (isLoading) {
    return <Loading />
  }

  if (!orderedModules.length) {
    return (
      <div className="px-[7%] py-10">
        <h1 className="text-md md:text-xl text-black mb-4 font-semibold">
          Curriculum Structure
        </h1>
        <div className="flex flex-col items-center justify-center p-8">
          <p className="text-gray-500">
            No modules available to structure. Please add modules first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-[7%] py-10 mb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-md md:text-xl text-black font-semibold">
            Curriculum Structure
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Drag and drop modules to reorder them
          </p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleCancelReorder}
              disabled={isReordering}
            >
              Reset
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={isReordering}
              className="bg-brand hover:bg-brand/90 text-white"
            >
              {isReordering ? "Saving..." : "Save Order"}
            </Button>
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedModules.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <Accordion
            type="single"
            collapsible
            value={expandedModule}
            onValueChange={setExpandedModule}
            className="space-y-3"
          >
            {orderedModules.map((module, index) => (
              <SortableModuleItem
                key={module.id}
                module={module}
                index={index}
                isExpanded={expandedModule === module.id}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </Accordion>
        </SortableContext>
      </DndContext>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm Module Reorder
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save the new module order? This will
              update the curriculum structure for all users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReordering}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReorder}
              disabled={isReordering}
              className="bg-brand hover:bg-brand/90"
            >
              {isReordering ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

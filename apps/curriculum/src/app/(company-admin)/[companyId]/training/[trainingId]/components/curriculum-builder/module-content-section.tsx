"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Plus } from "lucide-react"
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
import {
  useModuleContents,
  ModuleContentItem,
  ContentOrderItem,
} from "@/lib/hooks/useCurriculumStructure"
import { DragHandle } from "./drag-handle"
import { ContentItemRow } from "./content-item-row"
import { SortableContentItem } from "./sortable-content-item"
import { AddContentModal } from "./add-content-modal"

interface ModuleContentSectionProps {
  moduleId: string
  cohortId: string
  isEditMode: boolean
  onContentChange: (moduleId: string, orderedItems: ContentOrderItem[]) => void
}

export function ModuleContentSection({
  moduleId,
  cohortId,
  isEditMode,
  onContentChange,
}: ModuleContentSectionProps) {
  const { data, isLoading } = useModuleContents(moduleId, cohortId)
  const [orderedItems, setOrderedItems] = useState<ModuleContentItem[]>([])
  const hasLocalChanges = useRef(false)
  const [showAddContentModal, setShowAddContentModal] = useState(false)

  useEffect(() => {
    if (data?.contents && !hasLocalChanges.current) {
      setOrderedItems(data.contents)
    }
  }, [data?.contents])

  const handleAddContentModalChange = useCallback((open: boolean) => {
    setShowAddContentModal(open)
    if (!open) {
      hasLocalChanges.current = false
    }
  }, [])

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
        hasLocalChanges.current = true
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

  if (!isEditMode) {
    if (!orderedItems.length) {
      return (
        <div className="space-y-3">
          <div className="text-sm text-gray-500 p-4 bg-gray-50/50 rounded-md text-center">
            No content items in this module
          </div>
          <button
            onClick={() => setShowAddContentModal(true)}
            className="w-full p-3 flex items-center justify-center gap-1.5 text-sm font-medium text-brand border-2 border-dashed border-brand/30 rounded-lg hover:border-brand/50 hover:bg-brand/5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Content
          </button>
          <AddContentModal
            open={showAddContentModal}
            onOpenChange={handleAddContentModalChange}
            cohortId={cohortId}
            moduleId={moduleId}
          />
        </div>
      )
    }
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
            <ContentItemRow item={item} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {orderedItems.length > 0 ? (
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
                  cohortId={cohortId}
                  moduleId={moduleId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-sm text-gray-500 p-4 bg-gray-50/50 rounded-md text-center">
          No content items in this module
        </div>
      )}
      <button
        onClick={() => setShowAddContentModal(true)}
        className="w-full mt-3 p-3 flex items-center justify-center gap-1.5 text-sm font-medium text-brand border-2 border-dashed border-brand/30 rounded-lg hover:border-brand/50 hover:bg-brand/5 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Content
      </button>
      <AddContentModal
        open={showAddContentModal}
        onOpenChange={handleAddContentModalChange}
        cohortId={cohortId}
        moduleId={moduleId}
      />
    </>
  )
}

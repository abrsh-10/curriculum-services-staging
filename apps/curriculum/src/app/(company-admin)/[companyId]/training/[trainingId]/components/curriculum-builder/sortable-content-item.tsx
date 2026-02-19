"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
import { ModuleContentItem, useRemoveContentItem } from "@/lib/hooks/useCurriculumStructure"
import { DragHandle } from "./drag-handle"
import { ContentItemRow } from "./content-item-row"

interface SortableContentItemProps {
  item: ModuleContentItem
  isEditMode: boolean
  cohortId: string
  moduleId: string
}

export function SortableContentItem({
  item,
  isEditMode,
  cohortId,
  moduleId,
}: SortableContentItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { mutateAsync: removeItem, isPending: isRemoving } = useRemoveContentItem()

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

  const handleConfirmDelete = async () => {
    await removeItem({
      cohortId,
      moduleId,
      type: item.type,
      contentId: item.id,
    })
    setShowDeleteDialog(false)
  }

  return (
    <>
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
        <ContentItemRow item={item} />
        {isEditMode && (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            aria-label="Remove content"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!isRemoving) setShowDeleteDialog(open)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{item.title}&quot; from this module? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDelete()
              }}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRemoving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

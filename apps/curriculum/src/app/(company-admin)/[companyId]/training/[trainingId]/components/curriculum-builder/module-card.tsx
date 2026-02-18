"use client"

import { ChevronRight } from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CurriculumModule, ContentOrderItem } from "@/lib/hooks/useCurriculumStructure"
import { DragHandle } from "./drag-handle"
import { ModuleStats } from "./module-stats"
import { ModuleContentSection } from "./module-content-section"

export interface ModuleCardProps {
  module: CurriculumModule
  cohortId: string
  isEditMode: boolean
  isExpanded: boolean
  onToggle: () => void
  onContentChange: (moduleId: string, orderedItems: ContentOrderItem[]) => void
}

export function ModuleCard({
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

export function SortableModuleCard({
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
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center px-3 py-5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label="Drag to reorder module"
        >
          <DragHandle />
        </div>
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

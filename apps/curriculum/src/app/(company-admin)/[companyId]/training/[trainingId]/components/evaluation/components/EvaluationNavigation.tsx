"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Save as SaveIcon, X as XIcon, Pencil, GripVertical } from "lucide-react"
import { EvaluationSectionForm } from "@/lib/hooks/evaluation-types"
import { useDeleteQuestion, useDeleteSection } from "@/lib/hooks/useEvaluation"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"

interface EvaluationNavigationProps {
  sections: EvaluationSectionForm[]
  selectedSection: number
  selectedQuestion: number
  editMode: 'evaluation' | 'question'
  evaluationName: string
  isEditMode?: boolean
  canAddSection?: boolean
  disableEvaluationSettings?: boolean
  onSelectEvaluationSettings: () => void
  onSelectQuestion: (sectionIndex: number, questionIndex: number) => void
  onUpdateSectionTitle: (sectionIndex: number, title: string) => void
  onUpdateSectionDescription: (sectionIndex: number, description: string) => void
  onDeleteSection: (sectionIndex: number) => void
  onDeleteQuestion: (sectionIndex: number, questionIndex: number) => void
  onAddQuestion: (sectionIndex: number) => void
  onAddSection?: () => void
  onSaveSectionMeta?: (sectionIndex: number, title: string, description: string) => void
  onReorderSections?: (fromIndex: number, toIndex: number) => void
  onOpenSectionEditModal?: (sectionIndex: number) => void
  onPersistNewSection?: (sectionIndex: number) => void
}

export function EvaluationNavigation({
  sections,
  selectedSection,
  selectedQuestion,
  editMode,
  evaluationName,
  isEditMode = false,
  canAddSection = true,
  disableEvaluationSettings = false,
  onSelectEvaluationSettings,
  onSelectQuestion,
  onUpdateSectionTitle,
  onUpdateSectionDescription,
  onDeleteSection,
  onDeleteQuestion,
  onAddQuestion,
  onAddSection,
  onSaveSectionMeta,
  onReorderSections,
  onOpenSectionEditModal,
  onPersistNewSection
}: EvaluationNavigationProps) {

  const [editingMap, setEditingMap] = useState<Record<number, boolean>>({})
  const [draftTitles, setDraftTitles] = useState<Record<number, string>>({})
  const [draftDescs, setDraftDescs] = useState<Record<number, string>>({})
  const [deleteSectionIndex, setDeleteSectionIndex] = useState<number | null>(null)
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<{ sectionIndex: number; entryIndex: number } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const deleteSectionMutation = useDeleteSection()
  const deleteQuestionMutation = useDeleteQuestion()

  useEffect(() => {
    const newDraftTitles: Record<number, string> = {}
    const newDraftDescs: Record<number, string> = {}
    sections.forEach((sec, idx) => {
      if (!editingMap[idx]) {
        newDraftTitles[idx] = sec.title || `Section ${idx + 1}`
        newDraftDescs[idx] = sec.description || ""
      } else {
        newDraftTitles[idx] = draftTitles[idx] ?? sec.title ?? `Section ${idx + 1}`
        newDraftDescs[idx] = draftDescs[idx] ?? sec.description ?? ""
      }
    })
    setDraftTitles(newDraftTitles)
    setDraftDescs(newDraftDescs)
  }, [sections])

  const startEdit = (index: number) => {
    setEditingMap(prev => ({ ...prev, [index]: true }))
    setDraftTitles(prev => ({ ...prev, [index]: sections[index]?.title || `Section ${index + 1}` }))
    setDraftDescs(prev => ({ ...prev, [index]: sections[index]?.description || "" }))
  }

  // const cancelEdit = (index: number) => {
  //   setEditingMap(prev => ({ ...prev, [index]: false }))
  //   setDraftTitles(prev => ({ ...prev, [index]: sections[index]?.title || `Section ${index + 1}` }))
  //   setDraftDescs(prev => ({ ...prev, [index]: sections[index]?.description || "" }))
  // }

  // const saveEdit = (index: number) => {
  //   const newTitle = draftTitles[index] ?? sections[index]?.title ?? `Section ${index + 1}`
  //   const newDesc = draftDescs[index] ?? sections[index]?.description ?? ""
  //   onSaveSectionMeta?.(index, newTitle, newDesc)
  //   // Also optimistically update parent via existing callbacks
  //   onSelectQuestion(index, 0) // remain in section context; no-op selection for clarity
  //   setEditingMap(prev => ({ ...prev, [index]: false }))
  // }

  const handleDragStart = (e: React.DragEvent, sectionIndex: number) => {
    setDragFromIndex(sectionIndex)
    e.dataTransfer.effectAllowed = "move"
    // Create ghost element
    const ghost = document.createElement('div')
    ghost.className = 'opacity-50 bg-blue-100 border-2 border-blue-400 rounded-lg p-3'
    ghost.innerHTML = `<div class="font-medium text-sm">${sections[sectionIndex]?.title || `Section ${sectionIndex + 1}`}</div>`
    ghost.style.position = 'absolute'
    ghost.style.top = '-1000px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  const handleDragOver = (e: React.DragEvent, sectionIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(sectionIndex)
    
    // Auto-scroll logic
    if (!containerRef.current) return
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const scrollThreshold = 60
    const scrollSpeed = 5
    
    const mouseY = e.clientY - rect.top
    
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
    
    if (mouseY < scrollThreshold) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed)
      }, 16)
    } else if (mouseY > rect.height - scrollThreshold) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollTop = Math.min(container.scrollHeight, container.scrollTop + scrollSpeed)
      }, 16)
    }
  }

  const handleDragLeave = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }

  const handleDrop = (e: React.DragEvent, sectionIndex: number) => {
    e.preventDefault()
    if (dragFromIndex !== null && dragFromIndex !== sectionIndex) {
      onReorderSections?.(dragFromIndex, sectionIndex)
    }
    setDragFromIndex(null)
    setDragOverIndex(null)
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }

  const handleDragEnd = () => {
    setDragFromIndex(null)
    setDragOverIndex(null)
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current)
      scrollIntervalRef.current = null
    }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm sticky top-8">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-800">Evaluation Structure</h3>
      </div>
      
      <div ref={containerRef} className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Evaluation Settings */}
        <div
          className={`p-3 rounded-lg transition-all ${
            disableEvaluationSettings
              ? 'bg-gray-100 border border-gray-200 cursor-not-allowed opacity-60'
              : editMode === 'evaluation'
                ? 'bg-blue-50 border border-blue-200 shadow-sm cursor-pointer'
                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 cursor-pointer'
          }`}
          onClick={disableEvaluationSettings ? undefined : onSelectEvaluationSettings}
        >
          <div className="flex items-center gap-2">
            <span className="text-blue-600">⚙️</span>
            <span className="font-medium text-sm">
              Evaluation Settings {disableEvaluationSettings && '(Read-only)'}
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1 truncate">
            {evaluationName || 'Untitled Evaluation'}
          </p>
        </div>

        {/* Sections */}
        {sections.map((section, sectionIndex) => {
          const isDragging = dragFromIndex === sectionIndex
          const isDropTarget = dragOverIndex === sectionIndex && dragFromIndex !== sectionIndex
          
          return (
            <div key={sectionIndex} className="relative">
              {/* Drop indicator line */}
              {isDropTarget && dragFromIndex !== null && dragFromIndex < sectionIndex && (
                <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-full z-10" />
              )}
              
              <div
                className={`bg-white rounded-lg border transition-all duration-200 ${
                  isDragging 
                    ? 'opacity-30 scale-95 border-dashed border-blue-400' 
                    : isDropTarget
                      ? 'border-blue-400 border-2 bg-blue-50'
                      : 'border-gray-200'
                }`}
                draggable={!editingMap[sectionIndex]}
                onDragStart={(e) => handleDragStart(e, sectionIndex)}
                onDragOver={(e) => handleDragOver(e, sectionIndex)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, sectionIndex)}
                onDragEnd={handleDragEnd}
              >
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div 
                    className={`cursor-move ${!editingMap[sectionIndex] ? 'hover:bg-gray-100' : 'opacity-50 cursor-not-allowed'} rounded p-1 transition-colors`}
                    title={!editingMap[sectionIndex] ? "Drag to reorder" : ""}
                  >
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-green-600 text-lg">📁</span>
                  <div className="flex-1">
                    <div className="space-y-2">
                      {/* For new sections (no id), allow direct editing; for existing, use edit mode */}
                      {!section.id ? (
                        <>
                          <Input
                            value={section.title || `Section ${sectionIndex + 1}`}
                            onChange={(e) => onUpdateSectionTitle(sectionIndex, e.target.value)}
                            placeholder={`Section ${sectionIndex + 1}`}
                            className="text-sm h-9 border-0 px-3 py-2 font-medium bg-transparent transition-all duration-200 hover:bg-gray-50 focus:bg-white focus:border focus:border-blue-300 focus:rounded"
                          />
                          <Textarea
                            value={section.description || ""}
                            onChange={(e) => onUpdateSectionDescription(sectionIndex, e.target.value)}
                            placeholder="Section description (optional)"
                            className="text-xs h-16 border-0 px-3 py-2 bg-transparent resize-none transition-all duration-200 hover:bg-gray-50 focus:bg-white focus:border focus:border-blue-300 focus:rounded"
                            rows={2}
                          />
                        </>
                      ) : (
                        <>
                          <Input
                            value={editingMap[sectionIndex] ? (draftTitles[sectionIndex] ?? "") : (section.title || `Section ${sectionIndex + 1}`)}
                            onChange={(e) => {
                              if (editingMap[sectionIndex]) {
                                const v = e.target.value
                                setDraftTitles(prev => ({ ...prev, [sectionIndex]: v }))
                              }
                            }}
                            placeholder={`Section ${sectionIndex + 1}`}
                            readOnly={!editingMap[sectionIndex]}
                            className={`text-sm h-9 border-0 px-3 py-2 font-medium bg-transparent transition-all duration-200 ${
                              editingMap[sectionIndex]
                                ? 'hover:bg-gray-50 focus:bg-white focus:border focus:border-blue-300 focus:rounded'
                                : 'cursor-default'
                            }`}
                          />
                          <Textarea
                            value={editingMap[sectionIndex] ? (draftDescs[sectionIndex] ?? "") : (section.description || "")}
                            onChange={(e) => {
                              if (editingMap[sectionIndex]) {
                                const v = e.target.value
                                setDraftDescs(prev => ({ ...prev, [sectionIndex]: v }))
                              }
                            }}
                            placeholder="Section description (optional)"
                            readOnly={!editingMap[sectionIndex]}
                            className={`text-xs h-16 border-0 px-3 py-2 bg-transparent resize-none transition-all duration-200 ${
                              editingMap[sectionIndex]
                                ? 'hover:bg-gray-50 focus:bg-white focus:border focus:border-blue-300 focus:rounded'
                                : 'cursor-default'
                            }`}
                            rows={2}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Only show Edit/Save/Cancel for existing sections with an id */}
                  {section.id && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (onOpenSectionEditModal) {
                            onOpenSectionEditModal(sectionIndex)
                          } else {
                            // Fallback to inline editing if modal handler not provided
                            startEdit(sectionIndex)
                          }
                        }}
                        className="h-7 w-7 p-0"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {sections.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const section = sections[sectionIndex]
                        if (section?.id) {
                          setDeleteSectionIndex(sectionIndex)
                        } else {
                          onDeleteSection(sectionIndex)
                        }
                      }}
                      className="p-1 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-2 space-y-1">
              {/* Only show main questions (non-follow-up) in navigation */}
              {section.entries.filter(entry => !entry.isFollowUp).map((entry, mainQuestionIndex) => {
                // Get the original index of this main question in the full entries array
                const originalIndex = section.entries.findIndex(e => e.clientId === entry.clientId)
                
                // Check if this main question has follow-ups in its choices
                const hasFollowUpChoices = entry.choices?.some(choice => choice.hasFollowUp && choice.followUpQuestion)
                
                return (
                  <div
                    key={entry.clientId || mainQuestionIndex}
                    className={`p-2 rounded cursor-pointer transition-all ${
                      selectedSection === sectionIndex && selectedQuestion === originalIndex && editMode === 'question'
                        ? 'bg-blue-50 border border-blue-200 shadow-sm'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectQuestion(sectionIndex, originalIndex)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img 
                          src={`/question-type-${entry.questionType.toLowerCase()}.svg`}
                          alt={`${entry.questionType} icon`}
                          className="w-4 h-4 text-gray-600"
                          onError={(e) => {
                            // Fallback to generic icon if specific icon doesn't exist
                            const fallbackIcon = entry.questionType === 'RADIO' ? '🔘' : entry.questionType === 'CHECKBOX' ? '☑️' : '📝'
                            e.currentTarget.style.display = 'none'
                            const span = document.createElement('span')
                            span.textContent = fallbackIcon
                            span.className = 'w-4 h-4 text-center'
                            e.currentTarget.parentNode?.insertBefore(span, e.currentTarget)
                          }}
                        />
                        <span className="text-sm font-medium">Q{mainQuestionIndex + 1}</span>
                        {hasFollowUpChoices && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded">Has Follow-ups</span>
                        )}
                      </div>
                      {section.entries.filter(e => !e.isFollowUp).length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            const entry = section.entries[originalIndex]
                            if (entry?.id) {
                              setDeleteQuestionTarget({ sectionIndex, entryIndex: originalIndex })
                            } else {
                              onDeleteQuestion(sectionIndex, originalIndex)
                            }
                          }}
                          className="p-1 h-5 w-5 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {entry.question || 'Untitled question'}
                    </p>
                    {/* Add Question badge for client-only new questions */}
                    {isEditMode && !entry.id && (
                      <div className="mt-2">
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                          New question - use Add Question in editor
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddQuestion(sectionIndex)}
                className="w-full mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-blue-300 hover:border-blue-400"
              >
                + Add Question
              </Button>
              
              {/* Add Section button for client-only new sections */}
              {isEditMode && !section.id && onPersistNewSection && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPersistNewSection(sectionIndex)}
                  className="w-full mt-3 text-green-700 border-green-300 hover:bg-green-50"
                >
                  Add Section
                </Button>
              )}
            </div>
              </div>
              
              {/* Drop indicator line at bottom */}
              {isDropTarget && dragFromIndex !== null && dragFromIndex > sectionIndex && (
                <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-blue-500 rounded-full z-10" />
              )}
            </div>
          )
        })}

        {/* Add Section Button (hidden in edit mode if canAddSection is false) */}
        {canAddSection && onAddSection && (
          <Button
            variant="ghost"
            onClick={onAddSection}
            className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 border border-dashed border-green-300 hover:border-green-400"
          >
            + Add Section
          </Button>
        )}
      </div>
      
      {/* Delete Section Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteSectionIndex !== null}
        onClose={() => setDeleteSectionIndex(null)}
        onConfirm={async () => {
          const idx = deleteSectionIndex
          if (idx === null) return
          const section = sections[idx]
          try {
            setIsDeleting(true)
            if (section?.id) {
              await deleteSectionMutation.mutateAsync(section.id)
            }
            onDeleteSection(idx)
          } finally {
            setIsDeleting(false)
            setDeleteSectionIndex(null)
          }
        }}
        title="Delete Section"
        description="Are you sure you want to delete this section? All questions in this section will also be deleted. This action cannot be undone."
        confirmText="Delete Section"
        isDeleting={isDeleting}
      />

      {/* Delete Question Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteQuestionTarget !== null}
        onClose={() => setDeleteQuestionTarget(null)}
        onConfirm={async () => {
          const target = deleteQuestionTarget
          if (!target) return
          const { sectionIndex, entryIndex } = target
          const entry = sections[sectionIndex]?.entries[entryIndex]
          try {
            setIsDeleting(true)
            if (entry?.id) {
              await deleteQuestionMutation.mutateAsync(entry.id)
            }
            onDeleteQuestion(sectionIndex, entryIndex)
          } finally {
            setIsDeleting(false)
            setDeleteQuestionTarget(null)
          }
        }}
        title="Delete Question"
        description="Are you sure you want to delete this question? This action cannot be undone."
        confirmText="Delete Question"
        isDeleting={isDeleting}
      />
    </div>
  )
}

// Delete dialogs
export function EvaluationNavigationDeleteDialogs({
  open,
}: {
  open?: boolean
}) {
  return null
}

// Inline delete dialogs in component scope
// We append them at the bottom of the component return


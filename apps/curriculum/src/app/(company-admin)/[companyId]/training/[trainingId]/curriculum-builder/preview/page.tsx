"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import {
  ChevronRight,
  ChevronLeft,
  FileText,
  Video,
  Link2,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Layers,
  Timer,
} from "lucide-react"
import { Loading } from "@/components/ui/loading"
import {
  useCurriculumModules,
  useModuleContents,
  CurriculumModule,
  ModuleContentItem,
} from "@/lib/hooks/useCurriculumStructure"
import { useContentById, Content } from "@/lib/hooks/useContent"
import { useAssessmentDetail, AssessmentDetail } from "@/lib/hooks/useAssessment"
import { useSurveyDetailNew } from "@/lib/hooks/useSurvey"
import { SurveyDetailResponse } from "@/lib/hooks/survey-types"

const FILE_TYPE_ICON: Record<string, typeof FileText> = {
  PDF: FileText,
  VIDEO: Video,
  LINK: Link2,
  CONTENT: FileText,
  ASSESSMENT: ClipboardList,
  SURVEY: ClipboardList,
}

const FILE_TYPE_LABEL: Record<string, string> = {
  PDF: "Pdf",
  VIDEO: "Video",
  LINK: "Link",
  CONTENT: "Content",
  ASSESSMENT: "Assessment",
  SURVEY: "Survey",
}

function getEmbedUrl(content: Content): string | null {
  if (!content.link) return null
  const url = content.link

  if (url.includes("docs.google.com/presentation")) {
    return url.replace(/\/edit.*$/, "/embed?start=false&loop=false&delayms=3000")
  }
  if (url.includes("docs.google.com/document")) {
    return url.replace(/\/edit.*$/, "/preview")
  }
  if (url.includes("drive.google.com/file")) {
    return url.replace(/\/view.*$/, "/preview")
  }
  if (url.includes("youtube.com/watch")) {
    const videoId = new URL(url).searchParams.get("v")
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  }
  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0]
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  }
  if (url.includes("vimeo.com/")) {
    const videoId = url.split("vimeo.com/")[1]?.split("?")[0]
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url
  }

  return url
}

function ModuleSidebarSection({
  module: mod,
  cohortId,
  isExpanded,
  onToggle,
  selectedContentId,
  onSelectContent,
}: {
  module: CurriculumModule
  cohortId: string
  isExpanded: boolean
  onToggle: () => void
  selectedContentId: string | null
  onSelectContent: (item: ModuleContentItem) => void
}) {
  const { data, isLoading } = useModuleContents(mod.id, cohortId)
  const contents = data?.contents ?? []

  const totalItems = mod.lessonCount + mod.contentCount + mod.catCount
  const statParts: string[] = []
  if (mod.lessonCount > 0) statParts.push(`${mod.lessonCount} Lesson`)
  if (mod.contentCount > 0) statParts.push(`${mod.contentCount} Content`)
  if (mod.catCount > 0) statParts.push(`${mod.catCount} CAT`)

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between md:px-8 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div>
          <div className="font-semibold text-sm">{mod.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {totalItems > 0 && <span>0/{totalItems}</span>}
            {statParts.length > 0 && (
              <span> · {statParts.join(" · ")}</span>
            )}
          </div>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="pb-2">
          {isLoading ? (
            <div className="md:px-8 px-4 py-2 text-xs text-gray-400">Loading...</div>
          ) : contents.length === 0 ? (
            <div className="md:px-8 px-4 py-2 text-xs text-gray-400">No content</div>
          ) : (
            contents.map((item) => {
              const isActive = selectedContentId === item.id
              const TypeIcon = FILE_TYPE_ICON[item.type] ?? FileText
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectContent(item)}
                  className={`w-full flex items-start gap-3 md:px-8 px-4 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-brand/5"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                      isActive ? "border-brand bg-brand/20" : "border-gray-300"
                    }`}
                  />
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${
                        isActive ? "text-brand" : "text-gray-800"
                      }`}
                    >
                      {item.title}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <TypeIcon className="w-3 h-3" />
                      <span>{FILE_TYPE_LABEL[item.type] ?? item.type}</span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function ContentViewer({ content }: { content: Content }) {
  const embedUrl = getEmbedUrl(content)

  if (!embedUrl) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2" />
          <p>No preview available for this content.</p>
          {content.link && (
            <a
              href={content.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline mt-2 inline-block"
            >
              Open in new tab
            </a>
          )}
        </div>
      </div>
    )
  }

  const TypeIcon = FILE_TYPE_ICON[content.contentFileType] ?? FileText

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-brand">
          <TypeIcon className="w-4 h-4" />
          <span className="font-medium text-sm">{content.name}</span>
        </div>
      </div>
      <div className="flex-1 p-4 bg-gray-50 min-h-0">
        <iframe
          src={embedUrl}
          className="w-full h-full rounded-lg border border-gray-200 bg-white"
          title={content.name}
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>
  )
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "No time limit"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function AssessmentViewer({ assessment }: { assessment: AssessmentDetail }) {
  const totalQuestions = assessment.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0
  )

  const statusConfig = {
    APPROVED: { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    PENDING: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
    REJECTED: { color: "bg-red-100 text-red-700", icon: AlertCircle },
  }
  const status = statusConfig[assessment.approvalStatus] ?? statusConfig.PENDING
  const StatusIcon = status.icon

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100">
        <ClipboardList className="w-4 h-4 text-brand" />
        <span className="font-medium text-sm text-brand">Assessment</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {assessment.name}
            </h2>
            {assessment.description && (
              <p className="text-sm text-gray-500 mt-1">
                {assessment.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Timer className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  Duration
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {assessment.timed
                  ? formatDuration(assessment.duration)
                  : "Untimed"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  Attempts
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {assessment.maxAttempts}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  Sections
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {assessment.sections.length}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <ClipboardList className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  Questions
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {totalQuestions}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}
            >
              <StatusIcon className="w-3 h-3" />
              {assessment.approvalStatus}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium uppercase">
              {assessment.type.replace(/_/g, " ")}
            </span>
          </div>

          {assessment.sections.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Sections
              </h3>
              <div className="space-y-2">
                {assessment.sections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {section.title}
                      </p>
                      {section.description && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {section.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 ml-4">
                      {section.questions.length} question
                      {section.questions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SurveyViewer({ survey }: { survey: SurveyDetailResponse }) {
  const totalEntries = survey.sections.reduce(
    (sum, s) => sum + s.entries.length,
    0
  )

  const typeLabel = survey.type?.replace(/_/g, " ") ?? "Survey"

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100">
        <ClipboardList className="w-4 h-4 text-brand" />
        <span className="font-medium text-sm text-brand">Survey</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {survey.name}
            </h2>
            {survey.description && (
              <p className="text-sm text-gray-500 mt-1">
                {survey.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  Sections
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {survey.sections.length}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <ClipboardList className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  Questions
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {totalEntries}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Timer className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  Estimated Time
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {survey.timeToTakeMinutes
                  ? `${survey.timeToTakeMinutes} min`
                  : "Not specified"}
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium uppercase">
              {typeLabel}
            </span>
          </div>

          {survey.sections.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Sections
              </h3>
              <div className="space-y-2">
                {survey.sections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {section.title}
                      </p>
                      {section.description && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {section.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 ml-4">
                      {section.entries.length} question
                      {section.entries.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PreviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const trainingId = params.trainingId as string
  const cohortId = searchParams.get("cohortId") ?? ""

  const { data: modulesData, isLoading: isModulesLoading } =
    useCurriculumModules(trainingId)
  const modules = useMemo(
    () =>
      [...(modulesData?.modules ?? [])].sort(
        (a, b) => a.moduleOrder - b.moduleOrder
      ),
    [modulesData?.modules]
  )

  const [expandedModuleId, setExpandedModuleId] = useState<string>("")
  const [selectedContentItem, setSelectedContentItem] =
    useState<ModuleContentItem | null>(null)

  const selectedType = selectedContentItem?.type ?? "CONTENT"
  const isContent = selectedType === "CONTENT"
  const isAssessment = selectedType === "ASSESSMENT"
  const isSurvey = selectedType === "SURVEY"

  const { data: selectedContent, isLoading: isContentLoading } =
    useContentById(
      selectedContentItem?.id ?? "",
      !!selectedContentItem && isContent
    )

  const { data: assessmentData, isLoading: isAssessmentLoading } =
    useAssessmentDetail(isAssessment ? (selectedContentItem?.id ?? "") : "")

  const { data: surveyData, isLoading: isSurveyLoading } =
    useSurveyDetailNew(isSurvey ? (selectedContentItem?.id ?? "") : "")

  const isDetailLoading =
    (isContent && isContentLoading) ||
    (isAssessment && isAssessmentLoading) ||
    (isSurvey && isSurveyLoading)

  // Auto-expand first module once loaded
  useEffect(() => {
    if (modules.length > 0 && !expandedModuleId) {
      setExpandedModuleId(modules[0].id)
    }
  }, [modules, expandedModuleId])

  const handleToggleModule = useCallback((moduleId: string) => {
    setExpandedModuleId((prev) => (prev === moduleId ? "" : moduleId))
  }, [])

  const handleSelectContent = useCallback((item: ModuleContentItem) => {
    setSelectedContentItem(item)
  }, [])

  // Build flat list of all content items for prev/next navigation
  const { data: expandedModuleContents } = useModuleContents(
    expandedModuleId,
    cohortId
  )
  const allVisibleItems = expandedModuleContents?.contents ?? []

  const currentIndex = selectedContentItem
    ? allVisibleItems.findIndex((i) => i.id === selectedContentItem.id)
    : -1

  const prevItem = currentIndex > 0 ? allVisibleItems[currentIndex - 1] : null
  const nextItem =
    currentIndex >= 0 && currentIndex < allVisibleItems.length - 1
      ? allVisibleItems[currentIndex + 1]
      : null

  if (isModulesLoading) {
    return <Loading />
  }

  return (
    <div className="flex flex-1 min-h-0 h-[calc(100vh-57px)]">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-200 bg-white overflow-y-auto flex-shrink-0">
        {modules.map((mod) => (
          <ModuleSidebarSection
            key={mod.id}
            module={mod}
            cohortId={cohortId}
            isExpanded={expandedModuleId === mod.id}
            onToggle={() => handleToggleModule(mod.id)}
            selectedContentId={selectedContentItem?.id ?? null}
            onSelectContent={handleSelectContent}
          />
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        {!selectedContentItem ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">
                Select a content item to preview
              </p>
              <p className="text-sm mt-1">
                Choose from the sidebar on the left
              </p>
            </div>
          </div>
        ) : isDetailLoading ? (
          <Loading />
        ) : isContent && selectedContent ? (
          <ContentViewer content={selectedContent} />
        ) : isAssessment && assessmentData?.assessment ? (
          <AssessmentViewer assessment={assessmentData.assessment} />
        ) : isSurvey && surveyData?.survey ? (
          <SurveyViewer survey={surveyData.survey} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Content not found
          </div>
        )}

        {/* Bottom Navigation */}
        {selectedContentItem && (
          <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between">
            <button
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              disabled={!prevItem}
              onClick={() => prevItem && handleSelectContent(prevItem)}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <button
              className="flex items-center gap-2 bg-brand hover:bg-brand/90 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-40 disabled:pointer-events-none transition-colors"
              disabled={!nextItem}
              onClick={() => nextItem && handleSelectContent(nextItem)}
            >
              {nextItem ? `Next: ${nextItem.title}` : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

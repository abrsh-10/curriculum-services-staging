import { ModuleContentItem } from "@/lib/hooks/useCurriculumStructure"

const TYPE_LABELS: Record<string, string> = {
  CONTENT: "Content",
  ASSESSMENT: "Assessment",
  SURVEY: "Survey",
}

const TYPE_COLORS: Record<string, string> = {
  CONTENT: "bg-blue-50 text-blue-600",
  ASSESSMENT: "bg-amber-50 text-amber-600",
  SURVEY: "bg-purple-50 text-purple-600",
}

interface ContentItemRowProps {
  item: ModuleContentItem
}

export function ContentItemRow({ item }: ContentItemRowProps) {
  return (
    <div className="flex flex-col min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm truncate">{item.title}</span>
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            TYPE_COLORS[item.type] ?? "bg-gray-50 text-gray-500"
          }`}
        >
          {TYPE_LABELS[item.type] ?? item.type}
        </span>
      </div>
      {item.contentLevel === "LESSON" && item.lessonName && (
        <span className="text-xs text-gray-400 truncate">{item.lessonName}</span>
      )}
    </div>
  )
}

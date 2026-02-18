import Image from "next/image"

interface ModuleStatsProps {
  lessonCount: number
  contentCount: number
  catCount: number
}

export function ModuleStats({ lessonCount, contentCount, catCount }: ModuleStatsProps) {
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

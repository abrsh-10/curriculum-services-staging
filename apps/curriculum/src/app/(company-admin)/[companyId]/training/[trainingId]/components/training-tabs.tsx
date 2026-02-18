/* eslint-disable no-unused-vars */
/* eslint-disable @next/next/no-img-element */
"use client"

import { cn } from "@/lib/utils"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { Loading } from "@/components/ui/loading"

export type TabType = 'overview' | 'profile' | 'audience' | 'module' | 'evaluation' | 'students' | 'cohorts' | 'attendance' | 'certificate' | 'assessment' | 'cat' | 'survey' | 'content'

interface TabConfig {
  id: TabType
  label: string
  icon: string
  activeIcon: string
}

const allTabs: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: '/overview.svg', activeIcon: '/overview_active.svg' },
  { id: 'profile', label: 'Training Profile', icon: '/trainingProfile.svg', activeIcon: '/baseDataActive.svg' },
  { id: 'audience', label: 'Audience Profile', icon: '/audienceProfile.svg', activeIcon: '/audience_active.svg' },
  { id: 'module', label: 'Module', icon: '/module.svg', activeIcon: '/module_active.svg' },
  { id: 'students', label: 'Students', icon: '/student.svg', activeIcon: '/stuedntActive.svg' },
  { id: 'cohorts', label: 'Cohorts', icon: '/Schedule.svg', activeIcon: '/scheduleActive.svg' },
  { id: 'attendance', label: 'Attendance', icon: '/attendance.svg', activeIcon: '/attendanceActive.svg' },
  { id: 'survey', label: 'Survey', icon: '/survey.svg', activeIcon: '/surveyActive.svg' },
  { id: 'assessment', label: 'Assessment', icon: '/assessment.svg', activeIcon: '/assessmentSelected.svg' },
  { id: 'evaluation', label: 'Evaluation', icon: '/Evaluation.svg', activeIcon: '/EvaluationActive.svg' },
  //{ id: 'certificate', label: 'Certificates', icon: '/certificate.svg', activeIcon: '/certificateActive.svg' },
  { id: 'content', label: 'Content', icon: '/content.svg', activeIcon: '/content-active.svg' },
]


interface TrainingTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function TrainingTabs({ activeTab, onTabChange }: TrainingTabsProps) {
  const { 
    isLoading,
    isCompanyAdmin,
    isProjectManager,
    isCurriculumAdmin,
    isContentDeveloper,
    isTrainingAdmin,
    isTrainerAdmin,
    isTrainer,
    isMeExpert 
  } = useUserRole()

  if (isLoading) {
    return <div className="h-20"><Loading /></div>; 
  }

  let visibleTabs: TabConfig[] = []

  if (isCompanyAdmin) {
    visibleTabs = allTabs
  } else if (isMeExpert) {
    visibleTabs = allTabs.filter(tab => ['overview', 'evaluation'].includes(tab.id))
  } else if (isCurriculumAdmin)  {
    visibleTabs = allTabs.filter(tab => !['students', 'evaluation', 'cohorts', 'attendance', 'certificate'].includes(tab.id))
  } else if (isTrainingAdmin) {
    visibleTabs = allTabs.filter(tab => !['evaluation',].includes(tab.id))
  }
  else if (isTrainerAdmin) {
    visibleTabs = allTabs.filter(tab => !['evaluation', 'attendance', 'certificate', 'assessment', 'survey', 'cat'].includes(tab.id))
  } 
  else if (isTrainer) {
    visibleTabs = allTabs.filter(tab => ['overview','profile', 'audience', 'module', 'attendance', 'content'].includes(tab.id))
  }
  else if (isContentDeveloper) {
    visibleTabs = allTabs.filter(tab => ['overview','profile', 'audience', 'module', 'content', 'assessment'].includes(tab.id))
  }
  else if (isProjectManager) {
    visibleTabs = allTabs
  }
  else {
    visibleTabs = allTabs.filter(tab => tab.id === 'overview') 
  }

  // Add certificate tab only for project manager and training admin 
  if (isTrainingAdmin || isProjectManager) {
    const certificateTab = allTabs.find(tab => tab.id === 'certificate')
    if (certificateTab && !visibleTabs.some( tab => tab.id === 'certificate')) {
      visibleTabs = [...visibleTabs, certificateTab]
    }
  }

  // Rename "Attendance" tab to "My Sessions" for trainers
  if (isTrainer) {
    visibleTabs = visibleTabs.map(tab => {
      if (tab.id === 'attendance') {
        return { ...tab, label: 'My Sessions' }
      }
      return tab
    })
  }

  if (!visibleTabs.some(tab => tab.id === activeTab)) {
    if (visibleTabs.length > 0) {
      onTabChange(visibleTabs[0].id)
    }
  }

  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <style jsx global>{`
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;     /* Firefox */
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;             /* Chrome, Safari and Opera */
        }
      `}</style>
      <div className="flex my-14 min-w-max gap-8 border-b-[0.5px] border-[#CED4DA] mb-6 px-[7%]">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "pb-4 text-sm font-medium flex items-center gap-2 relative whitespace-nowrap",
              activeTab === tab.id
                ? "text-brand border-b-2 border-brand"
                : "text-gray-500"
            )}
          >
            <img
              src={activeTab === tab.id ? tab.activeIcon : tab.icon}
              alt=""
              className={tab.id === 'module' ? "w-3 h-4" : "w-4 h-4"} 
            />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
} 


"use client"


import { useState, useEffect, lazy, Suspense } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useTraining } from "@/lib/hooks/useTraining"
import { Loading } from "@/components/ui/loading"
import { TrainingTabs, type TabType } from "./components/training-tabs"
import { toast } from "sonner"
import { TrainingNotFound } from "./components/training-not-found"
import { useUserRole } from "@/lib/hooks/useUserRole"

// Dynamically import components
const Overview = lazy(() => import("./components/overview").then(module => ({ default: module.Overview })))
const TrainingProfile = lazy(() => import("./components/trainingProfile").then(module => ({ default: module.TrainingProfile })))
const AudienceProfile = lazy(() => import("./components/audienceProfile").then(module => ({ default: module.AudienceProfile })))
const ModuleComponent = lazy(() => import("./components/module").then(module => ({ default: module.ModuleComponent })))
const EvaluationComponent = lazy(() => import("./components/evaluation").then(module => ({ default: module.EvaluationComponent })))
const StudentsComponent = lazy(() => import("./components/students").then(module => ({ default: module.StudentsComponent })))
const CohortsComponent = lazy(() => import("./components/cohorts").then(module => ({ default: module.CohortsComponent })))
const AttendanceComponent = lazy(() => import("./components/attendance").then(module => ({ default: module.AttendanceComponent })))
const CertificateComponent = lazy(() => import("./components/certificate").then(module => ({ default: module.CertificateComponent })))
const SurveyComponent = lazy(() => import("./components/survey").then(module => ({ default: module.SurveyComponent })))
const AssessmentComponent = lazy(() => import("./components/assessment").then(module => ({ default: module.AssessmentComponent })))
const Content = lazy(() => import("./components/content").then(module => ({ default: module.Content })))
// Insert new constant VALID_TABS above the component definition
const VALID_TABS: Array<TabType> = ['overview', 'profile', 'audience', 'module', 'evaluation', 'students', 'cohorts', 'attendance', 'certificate', 'assessment', 'cat', 'survey'];

export default function TrainingDetail() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const trainingId = params.trainingId as string
  const companyId = params.companyId as string
  const { isTrainer } = useUserRole()
  
  // Get tab from URL query or default to 'overview'
  const tabParam = searchParams.get('tab')
  const initialTab: TabType = VALID_TABS.includes(tabParam as TabType) ? (tabParam as TabType) : 'overview'

  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  
  // Update the URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    
    // Create new URLSearchParams object from current params
    const newParams = new URLSearchParams(searchParams)
    
    // Set the tab parameter
    newParams.set('tab', tab)
    
    // Update the URL without reloading the page
    router.replace(`/${companyId}/training/${trainingId}?${newParams.toString()}`, { scroll: false })
  }
  
  const { data: training, isLoading, error } = useTraining(trainingId)

  useEffect(() => {
    if (error) {
      toast.error("Failed to load training", {
        description: "Please try again later"
      })
    }
  }, [error])

  if (isLoading) {
    return <Loading />
  }

  return (
    <div>
      <TrainingTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="">
        {!training ? (
          <TrainingNotFound type={activeTab} />
        ) : (
          <Suspense fallback={<Loading />}>
            {activeTab === 'overview' && <Overview training={training} />}
            {activeTab === 'profile' && <TrainingProfile trainingId={training.id} />}
            {activeTab === 'audience' && <AudienceProfile trainingId={training.id}  />}
            {activeTab === 'module' && <ModuleComponent trainingId={training.id} />}
            {activeTab === 'evaluation' && <EvaluationComponent trainingId={training.id} />}
            {activeTab === 'students' && <StudentsComponent trainingId={training.id} />}
            {activeTab === 'cohorts' && <CohortsComponent trainingId={training.id} />}
            {activeTab === 'attendance' && <AttendanceComponent trainingId={training.id} />}
            {activeTab === 'survey' && <SurveyComponent trainingId={training.id} />}
            {activeTab === 'assessment' && <AssessmentComponent trainingId={training.id} />}
            {activeTab === 'certificate' && <CertificateComponent trainingId={training.id} />}
            {activeTab === 'content' && <Content/>}
          </Suspense>
        )}
      </div>
    </div>
  )
}


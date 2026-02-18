"use client"

import { useParams, useRouter, usePathname } from "next/navigation"
import { ChevronLeft, PencilLine, UserRoundCog } from "lucide-react"
import { useTraining } from "@/lib/hooks/useTraining"
import { useUserRole } from "@/lib/hooks/useUserRole"

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const { data: training } = useTraining(params.trainingId as string)
  const { isCompanyAdmin, isProjectManager, isTrainingAdmin } = useUserRole()
  const companyId = params.companyId as string
  const trainingId = params.trainingId as string

  const handleSettingsClick = () => {
    router.push(`/${companyId}/training/${trainingId}/users`)
  }

  const handleCurriculumBuilderClick = () => {
    router.push(`/${companyId}/training/${trainingId}/curriculum-builder`)
  }

  const handleBack = () => {
    if (params.companyId) {
      router.push(`/${params.companyId}/training`)
    }
  }

  const isUsersPage = pathname.endsWith('/users')
  const isCurriculumBuilderPage = pathname.endsWith('/curriculum-builder')
  const isPreviewPage = pathname.endsWith('/curriculum-builder/preview')

  // Special routes that hide the default layout
  const isSpecialRoute = () => {
    let routePattern = pathname.replace(params.companyId as string, "[companyId]");
    
    if (params.trainingId) {
      routePattern = routePattern.replace(params.trainingId as string, "[trainingId]");
    }
    
    if (params.moduleId) {
      routePattern = routePattern.replace(params.moduleId as string, '[moduleId]');
    }

    if (params.formId) {
      routePattern = routePattern.replace(params.formId as string, '[formId]');
    }

    if (params.cohortId) {
      routePattern = routePattern.replace(params.cohortId as string, '[cohortId]');
    }
    
    const specialRoutes = [
      '/[companyId]/training/[trainingId]/evaluation/create',
      '/[companyId]/training/[trainingId]/evaluation/builder',
      '/[companyId]/training/[trainingId]/evaluation/[formId]',
      '/[companyId]/training/[trainingId]/evaluation/builder/[evaluationId]/question/[questionId]',
      '/[companyId]/training/[trainingId]/sessions/add',
    ];
    
    return specialRoutes.some(route => routePattern === route);
  };

  const hideDefaultLayout = isSpecialRoute();

  if (hideDefaultLayout) {
    return <>{children}</>
  }

  // Determine the page title
  const pageTitle = isUsersPage
    ? 'Users'
    : training?.title || 'Training'

  if (isPreviewPage) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="bg-white md:px-8 px-4 py-4 flex items-center border-b-[0.5px] border-[#CED4DA]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/${companyId}/training/${trainingId}/curriculum-builder`)}
              className="text-brand hover:text-brand-dark font-semibold text-sm flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Edit in Admin</span>
            </button>
            <h1 className="font-semibold text-sm md:text-base">
              {training?.title || 'Training'}
            </h1>
          </div>
        </div>
        {children}
      </div>
    )
  }

  if (isCurriculumBuilderPage) {
    return (
      <div className="min-h-screen">
        <div className="bg-white md:px-8 px-4 py-6 flex items-center border-b-[0.5px] border-[#CED4DA]">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="text-brand hover:text-brand-dark font-semibold text-lg flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
              <span className="text-xs md:text-lg">Back to Trainings</span>
            </button>
            <h1 className="text-xs font-semibold md:text-base">
              Curriculum Builder
            </h1>
          </div>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen ">
      {/* Topbar */}
      <div className="bg-white md:px-8 px-4 py-6 flex items-center justify-between border-b-[0.5px] border-[#CED4DA]">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="text-brand hover:text-brand-dark font-semibold text-lg flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
            <span className="text-xs md:text-lg">Back</span>
          </button>
          <h1 className="text-xs font-semibold md:text-base">
            {pageTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isTrainingAdmin && !isUsersPage && (
            <button
              onClick={handleCurriculumBuilderClick}
              className="flex items-center gap-2 px-4 py-2 bg-[#09C3FD] text-white text-sm font-medium rounded-lg hover:bg-[#09C3FD]/70 transition-colors"
            >
              <PencilLine className="w-4 h-4" />
              Curriculum Builder
            </button>
          )}
          {(isCompanyAdmin || isProjectManager) && (
            <button 
              onClick={handleSettingsClick}
              className="p-3 hover:bg-brand-opacity rounded-full"
              title="Training Users"
              aria-label="Training Users"
            >
              <UserRoundCog className="w-7 h-7" />
            </button>
          )}
        </div>
      </div>

      {children}
    </div>
  )
} 
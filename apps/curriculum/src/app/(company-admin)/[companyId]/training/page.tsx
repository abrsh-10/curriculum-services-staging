"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { usePaginatedTrainings, useArchiveTraining } from "@/lib/hooks/useTrainings"
import { TrainingCard } from "@/components/ui/training-card"
import { Loading } from "@/components/ui/loading"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertCircle, RefreshCw, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import axios from "axios"
import { useUserRole } from "@/lib/hooks/useUserRole"

export default function CompanyAdminTraining() {
  const router = useRouter()
  const params = useParams()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isNavigating, setIsNavigating] = useState(false)
  const { data, isLoading, error, refetch } = usePaginatedTrainings({ page, pageSize })
  const { isPending: isArchiving } = useArchiveTraining()
  const { isCompanyAdmin } = useUserRole()

  // Track responsive grid columns to decide when to hide pagination
  const [gridColumns, setGridColumns] = useState(3)

  useEffect(() => {
    const updateColumns = () => {
      if (typeof window === "undefined") return
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setGridColumns(3)
      } else if (window.matchMedia("(min-width: 768px)").matches) {
        setGridColumns(2)
      } else {
        setGridColumns(1)
      }
    }
    updateColumns()
    window.addEventListener("resize", updateColumns)
    return () => window.removeEventListener("resize", updateColumns)
  }, [])

  const handleCreateTraining = () => {
    setIsNavigating(true)
    router.push(`/${params.companyId}/training/create-training`)
  }

  // Show toast when there's an error
  useEffect(() => {
    if (error) {
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.message || "Failed to fetch trainings" 
        : "Failed to fetch trainings"
      toast.error("Error", { description: errorMessage })
    }
  }, [error])

  if (isLoading || isArchiving) {
    return <Loading />
  }

  // Show error UI when there's an error
  if (error && data?.trainings?.length === 0) {
      
    return (
      <div className="lg:px-16 md:px-14 px-4">
        <div className="rounded-lg p-12 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-4">Unable to Load Trainings</h1>
          
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
       We&apos;re having trouble connecting to the server. This could be due to a network issue or the server might be temporarily unavailable.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={() => refetch()}
              className="bg-[#0B75FF] hover:bg-[#0052CC] text-white px-6 py-5 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            
            <Button 
              onClick={() => router.push(`/${params.companyId}/dashboard`)}
              variant="outline"
              className="border-gray-300 text-gray-700 px-6 py-5"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show empty state with create button only for company admin
  if (!data?.trainings?.length && isCompanyAdmin) {
    return (
      <div className="lg:px-16 md:px-14 px-4">
        <div className="rounded-lg p-12">
          <h1 className="text-2xl font-semibold mb-4">Training</h1>
          
          <p className="text-gray-600 mb-4">
            Creating and managing training programs is seamless with our user-friendly platform. Begin by setting clear objectives to ensure each
            curriculum aligns with your organizational goals. The platform allows you to assign a curriculum admin, who can then create and tailor
            the curriculum to meet specific needs, ensuring your training programs are focused and effective.
          </p>

          <p className="text-gray-600 mb-8">
            Additionally, by planning and organizing your training curricula through our intuitive interface, you can deliver impactful and well-structured 
            training programs that drive results and enhance learning experiences. The platform&apos;s flexibility enables you to adapt and evolve your 
            training content effortlessly, keeping your organization at the forefront of industry standards.
          </p>

     
            <Button 
              onClick={handleCreateTraining}
              disabled={isNavigating}
              className="bg-[#0B75FF] hover:bg-[#0052CC] disabled:opacity-70 disabled:cursor-not-allowed text-white px-6 py-5 flex items-center gap-2"
            >
              {isNavigating ? (
                <>
                  <svg 
                    className="animate-spin h-5 w-5 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                'Create Training'
              )}
            </Button>
      
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full lg:px-16 md:px-14 px-4">
      <div className="flex-1 py-12 sm:pl-12">
        <div className="grid 2xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
          {data?.trainings?.map((training) => (
            <TrainingCard
              key={training.id}
              id={training.id}
              title={training.title}
              location={training.cities[0]?.name || "N/A"}
              duration={`${training.duration} ${training.durationType.toLowerCase()}`}
              ageGroup={training.ageGroups[0]?.name || "N/A"}
              rationale={training.rationale}
            />
          ))}
        </div>

        {/* Pagination Controls - mirrored from users table, only show if more than visible grid capacity */}
        {(() => {
          const totalElements = data?.totalElements || 0
          const maxVisibleWithoutPagination = gridColumns * 3 // 3 rows worth: lg 9, md 6, sm 3
          const showPagination = totalElements > maxVisibleWithoutPagination
          if (!showPagination) return null
          return (
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center justify-between w-full">
            {/* Left side - Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="md:text-sm text-xs text-gray-500">Showing</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value)
                  setPageSize(newSize)
                  setPage(1)
                }}
                className="border rounded-md md:text-sm text-xs md:px-2 px-2 py-1 bg-white"
                title="Page Size"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Center - Showing Text */}
            <div className="text-xs md:text-sm pl-2 text-gray-500">
              {(() => {
                const totalElements = data?.totalElements || 0
                const startRecord = page > 0 ? ((page - 1) * pageSize) + 1 : 0
                const endRecord = Math.min(page * pageSize, totalElements)
                return totalElements > 0
                  ? `Showing ${startRecord} to ${endRecord} out of ${totalElements} records`
                  : "No records to show"
              })()}
            </div>

            {/* Right side - Pagination Controls */}
            <div className="flex gap-1">
              <Button
                variant="pagination"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(5, data?.totalPages || 1) }, (_, i) => {
                const totalPages = data?.totalPages || 1
                let pageNumber
                if (totalPages <= 5) {
                  pageNumber = i + 1
                } else {
                  const middle = 2
                  const start = Math.max(1, page - middle)
                  const end = Math.min(totalPages, start + 4)
                  const adjustedStart = end === totalPages ? Math.max(1, end - 4) : start
                  pageNumber = adjustedStart + i
                }
                if (pageNumber > (data?.totalPages || 1)) return null
                return (
                  <Button
                    key={pageNumber}
                    variant="outline"
                    className={page === pageNumber ? "border-brand text-brand" : ""}
                    size="sm"
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                )
              }).filter(Boolean)}
              <Button
                variant="pagination"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= (data?.totalPages || 1)}
              >
                <ChevronRightIcon className="md:w-4 md:h-4 w-2 h-2" />
              </Button>
            </div>
          </div>
        </div>)})()}
      </div>
    </div>
  );
}
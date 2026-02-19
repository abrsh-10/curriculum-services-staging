"use client"

import { Button } from "@/components/ui/button"
import { MoreVertical, Archive, Link } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useArchiveTraining, useUnarchiveTraining } from "@/lib/hooks/useTrainings"
import { useUserRole } from "@/lib/hooks/useUserRole"
import { RegistrationLinkGenerateModal } from "@/components/ui/registrationLinkGenerateModal"
import { useSyncTraining } from "@/lib/hooks/useSyncTraining"
import { RefreshCw } from "lucide-react"


interface TrainingCardProps {
  id: string
  title: string
  rationale: string
  location: string
  duration: string
  ageGroup: string
  isArchived?: boolean
}

export function TrainingCard({ 
  id,
  title, 
  rationale,
  location, 
  duration, 
  ageGroup,
  isArchived = false,
}: TrainingCardProps) {
  const router = useRouter()
  const params = useParams()
  const { mutateAsync: archiveTraining } = useArchiveTraining()
  const { mutateAsync: unarchiveTraining } = useUnarchiveTraining()
  const { isCompanyAdmin, isProjectManager } = useUserRole()
  const { syncTraining, isLoading: isSyncing } = useSyncTraining()
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  const handleViewTraining = () => {
    setIsNavigating(true)
    router.push(`/${params.companyId}/training/${id}`)
  }

  const handleArchive = async () => {
    try {
      setIsDropdownOpen(false) // Close dropdown before action
      await archiveTraining(id)
    } catch (error) {
      console.error("Error archiving training:", error)
    }
  }

  const handleUnarchive = async () => {
    try {
      setIsDropdownOpen(false) // Close dropdown before action
      await unarchiveTraining(id)
    } catch (error) {
      console.error("Error unarchiving training:", error)
    }
  }

  const handleGenerateLink = () => {
    setIsDropdownOpen(false) // Close dropdown first
    setIsRegistrationModalOpen(true)
  }

  const handleModalClose = () => {
    setIsRegistrationModalOpen(false)
    // Small delay to ensure dropdown state is properly reset
    setTimeout(() => {
      setIsDropdownOpen(false)
    }, 100)
  }

  const handleSyncTraining = () => {
    setIsDropdownOpen(false)
    syncTraining(id)
  }

  // Show dropdown for both company admin and project manager
  const showDropdown = isCompanyAdmin || isProjectManager

  return (
    <div className="bg-white rounded-lg shadow-custom border-[0.5px] border-[#E4E4E4] p-[22px] relative">
      {showDropdown && (
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute right-4 top-4">
            <MoreVertical className="h-4 w-4 text-brand" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isCompanyAdmin && (
            <>
              {isArchived ? (
                <DropdownMenuItem onClick={handleUnarchive} className="text-green-600">
                  <Archive className="mr-2 h-4 w-4 rotate-180" />
                  Unarchive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchive} className="text-red-600">
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
            </>
          )}
          {(isProjectManager || isCompanyAdmin) && (
            <>
              <DropdownMenuItem onClick={handleGenerateLink} className="text-blue-600">
                <Link className="mr-2 h-4 w-4" />
                Generate Link
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleSyncTraining} 
                className="text-blue-600"
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <div className="mr-2 h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Training
                  </>
                )}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      )}

      <h3 className="text-sm md:text-lg font-semibold text-black mb-4">
        {title}
      </h3>

      <div className="flex items-center gap-3 lg:text-[12px] text-[11px] text-[#9C9791] mb-4">
        <div className="flex items-center gap-1">
          <img src="/location.svg" alt="" className="w-4 h-4" />
          <p className="text-[#9C9791]">{location}</p>
        </div>
        <div className="flex items-center gap-1">
          <img src="/clock.svg" alt="" className="w-4 h-4" />
          {duration}
        </div>
        <div className="flex items-center gap-1">
          {/* <img src="/age.svg" alt="" className="w-4 h-4" /> */}
          {ageGroup}
        </div>
      </div>

      <p className="text-sm font-light text-[#292827] mb-4 line-clamp-3">
        {rationale}
      </p>

      <div className="flex items-end justify-end ">
        <Button
          variant="link"
          className="text-brand hover:text-brand-primary p-0 h-auto font-semibold text-sm md:text-md flex items-center gap-1 disabled:opacity-70"
          onClick={handleViewTraining}
          disabled={isNavigating}
        >
          {isNavigating ? (
            <>
              <svg 
                className="animate-spin h-4 w-4 text-brand" 
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
            <>
              View training
              <img src="/rightArrow.svg" alt="" className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>

      {/* Registration Link Modal */}
      <RegistrationLinkGenerateModal
        isOpen={isRegistrationModalOpen}
        onClose={handleModalClose}
        trainingId={id}
        trainingTitle={title}
      />
    </div>
  );
} 
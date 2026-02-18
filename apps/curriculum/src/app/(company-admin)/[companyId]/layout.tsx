"use client";

import { useVerificationStatus } from "@/lib/hooks/useVerificationStatus";
import { toast } from "sonner";
import Sidebar from "@/components/ui/sidebar";
import Topbar from "@/components/ui/topbar";
import { VerificationStatus } from "./components/verification-status";
import { Loading } from "@/components/ui/loading";
import { usePathname, useParams } from "next/navigation";
import { useUserRole } from "@/lib/hooks/useUserRole";

interface NavItem {
  icon: JSX.Element;
  href: string;
  label: string;
}

export default function CompanyAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const { role, isCompanyAdmin, isLoading: isRoleLoading } = useUserRole();
  
  // Only fetch verification status for company admin
  const { data: verificationData, isLoading: verificationLoading } = useVerificationStatus({
    enabled: isCompanyAdmin // Only enable the query for company admin
  });
  
  // Determine navigation items based on user role
  const getNavItems = (): NavItem[] => {
    if (!role) return [];
    
    if (role === "ROLE_CURRICULUM_ADMIN" || role === "ROLE_CONTENT_DEVELOPER") {
      // For curriculum roles, use their role as the companyId
      const roleForUrl = role.toLowerCase().replace('role_', '').replace('_', '-');
      return [
        {
          icon: <img src="/home.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/dashboard`,
          label: "Dashboard",
        },
        {
          icon: <img src="/trainingM.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/training`,
          label: "Training",
        },
        {
          icon: <img src="/settings.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/settings`,
          label: "Settings",
        },
      ];
    } else if (role === "ROLE_COMPANY_ADMIN") {
      return [
        {
          icon: <img src="/home.svg" alt="icon" width={19} height={19} />,
          href: `/${params.companyId}/dashboard`,
          label: "Dashboard",
        },
        {
          icon: <img src="/company-dash.svg" alt="icon" width={17} height={17} />,
          href: `/${params.companyId}/company`,
          label: "My Company",
        },
        {
          icon: <img src="/trainingM.svg" alt="icon" width={19} height={19} />,
          href: `/${params.companyId}/training`,
          label: "Training",
        },
        {
          icon: <img src="/archive.svg" alt="icon" width={19} height={19} />,
          href: `/${params.companyId}/archive`,
          label: "Archive",
        },
        {
          icon: <img src="/profile.svg" alt="icon" width={19} height={19} />,
          href: `/${params.companyId}/users`,
          label: "Users",
        },
        {
          icon: <img src="/settings.svg" alt="icon" width={19} height={19} />,
          href: `/${params.companyId}/settings`,
          label: "Settings",
        },
      ];
    } else if (role === "ROLE_PROJECT_MANAGER") {
      const roleForUrl = role.toLowerCase().replace('role_', '').replace('_', '-');
      return [
        {
          icon: <img src="/home.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/dashboard`,
          label: "Dashboard",
        },
        {
          icon: <img src="/trainingM.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/training`,
          label: "Training",
        },
        {
          icon: <img src="/trainerAdmin.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/trainers`,
          label: "Trainers",
        },
        {
          icon: <img src="/venue.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/venue`,
          label: "Venue",
        },
        {
          icon: <img src="/job.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/create-jobs`,
          label: "Jobs",
        },
        {
          icon: <img src="/settings.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/settings`,
          label: "Settings",
        },
      ];

    } else if (role === "ROLE_TRAINING_ADMIN") {
      const roleForUrl = role.toLowerCase().replace('role_', '').replace('_', '-');
      return [
        {
          icon: <img src="/home.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/dashboard`,
          label: "Dashboard",
        },
        {
          icon: <img src="/trainingM.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/training`,
          label: "Training",
        },
        {
          icon: <img src="/trainerAdmin.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/trainers`,
          label: "Trainers",
        },
        {
          icon: <img src="/job.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/create-jobs`,
          label: "Jobs",
        },
        {
          icon: <img src="/venue.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/venue`,
          label: "Venue",
        },
        {
          icon: <img src="/settings.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/settings`,
          label: "Settings",
        },
      ];
    } else if (role === "ROLE_TRAINER") {
      const roleForUrl = role.toLowerCase().replace('role_', '').replace('_', '-');
      return [
        {
          icon: <img src="/home.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/dashboard`,
          label: "Dashboard",
        },
        {
          icon: <img src="/trainingM.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/training`,
          label: "Training",
        },
        {
          icon: <img src="/job.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/job`,
          label: "Job",
        },
        {
          icon: <img src="/settings.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/settings`,
          label: "Settings",
        },
      ];
    } else if (role === "ROLE_ME_EXPERT") {
      const roleForUrl = role.toLowerCase().replace('role_', '').replace('_', '-');
      return [
        {
          icon: <img src="/home.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/dashboard`,
          label: "Dashboard",
        },
        {
          icon: <img src="/trainingM.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/training`,
          label: "Training",
        },
      ];
    
    } else if (role === "ROLE_TRAINER_ADMIN") {
      const roleForUrl = role.toLowerCase().replace('role_', '').replace('_', '-');
      return [
        {
          icon: <img src="/home.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/dashboard`,
          label: "Dashboard",
        },
        {
          icon: <img src="/trainingM.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/training`,
          label: "Training",
        },
        {
          icon: <img src="/trainerAdmin.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/trainers`,
          label: "Trainers",
        },
        {
          icon: <img src="/job.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/jobs`,
          label: "Jobs",
        },

        {
          icon: <img src="/settings.svg" alt="icon" width={19} height={19} />,
          href: `/${roleForUrl}/settings`,
          label: "Settings",
        },
      ];
    } else {
      return [];
    }
  };

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

    if (params.sessionId) {
      routePattern = routePattern.replace(params.sessionId as string, '[sessionId]');
    }

    if (params.applicationId) {
      routePattern = routePattern.replace(params.applicationId as string, '[applicationId]');
    }

    if (params.cohortId) {
      routePattern = routePattern.replace(params.cohortId as string, '[cohortId]');
    }
    
    const specialRoutes = [
      '/[companyId]/training/create-training',  
      '/[companyId]/training/[trainingId]',
      '/[companyId]/training/[trainingId]/users',
      '/[companyId]/training/[trainingId]/[moduleId]',
      '/[companyId]/training/[trainingId]/cohorts/[cohortId]',
      '/[companyId]/training/[trainingId]/cohorts/[cohortId]/sessions/[sessionId]',
      '/[companyId]/training/[trainingId]/evaluation/create',
      '/[companyId]/training/[trainingId]/evaluation/builder',
      '/[companyId]/training/[trainingId]/evaluation/[formId]',
      '/[companyId]/training/[trainingId]/curriculum-builder',
      '/[companyId]/training/[trainingId]/curriculum-builder/preview',
      '/[companyId]/training/[trainingId]/students/import',
      '/[companyId]/trainers/add',
      '/[companyId]/jobs/applications/[applicationId]',
      '/[companyId]/venue/add',
      '/[companyId]/venue/[venueId]',
      '/[companyId]/analytics-chat',
    ];
    
    return specialRoutes.some(route => routePattern === route);
  };

  const hideDefaultLayout = isSpecialRoute();

  const handleNavigation = (e: React.MouseEvent<HTMLElement>) => {
    // Only check verification for company admin
    if (isCompanyAdmin && verificationData?.verificationStatus !== "ACCEPTED") {
      e.preventDefault();
      toast.error("Account not verified", {
        description: verificationData?.verificationStatus === "REJECTED"
          ? verificationData.rejectionReason
          : "Your account is pending verification",
      });
    }
  };

  // Don't render anything until we've checked the role
  if (isRoleLoading) {
    return <Loading />;
  }    

  // Only show loading for company admin verification check
  if (isCompanyAdmin && verificationLoading) {
    return <Loading />;
  }

  const navItems = getNavItems();

  return (
    <div className="opacity-100 transition-opacity duration-300">
      {!hideDefaultLayout && (
        <>
          <Sidebar
            navItems={navItems}
            onClick={(e: React.MouseEvent<Element>) =>
              handleNavigation(e as React.MouseEvent<HTMLElement>)
            }
            disabled={isCompanyAdmin && verificationData?.verificationStatus !== "ACCEPTED"}
          />
          <Topbar />
        </>
      )}

      {/* Only show verification status for company admin */}
      {isCompanyAdmin && verificationData?.verificationStatus !== "ACCEPTED" ? (
        <VerificationStatus
          status={verificationData?.verificationStatus || "PENDING"}
          rejectionReason={verificationData?.rejectionReason || ""}
        />
      ) : (
        children
      )}
    </div>
  );
}

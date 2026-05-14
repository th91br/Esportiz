export type OnboardingGoal = "students" | "schedule" | "billing";

type AuthFlowNicheSettings = {
  onboarding_goal?: unknown;
} | null;

type AuthFlowProfile = {
  onboarding_completed?: boolean | null;
  business_type?: string | null;
  niche_settings?: Record<string, AuthFlowNicheSettings> | null;
} | null | undefined;

function normalizeBusinessType(businessType?: string | null) {
  if (businessType === "arena" || businessType === "other") {
    return businessType;
  }

  return "sport_school";
}

export function isOnboardingGoal(value: unknown): value is OnboardingGoal {
  return value === "students" || value === "schedule" || value === "billing";
}

export function getAuthenticatedHomePath(profile?: AuthFlowProfile) {
  if (!profile?.onboarding_completed) {
    return "/onboarding";
  }

  return "/dashboard";
}

export function getStoredOnboardingGoal(profile?: AuthFlowProfile) {
  if (!profile?.niche_settings) {
    return null;
  }

  const businessType = normalizeBusinessType(profile.business_type);
  const nicheSettings = profile.niche_settings[businessType];

  if (!nicheSettings || typeof nicheSettings !== "object") {
    return null;
  }

  const goal = nicheSettings.onboarding_goal;
  return isOnboardingGoal(goal) ? goal : null;
}

export function getOnboardingGoalPath(
  businessType: string | null | undefined,
  goal: OnboardingGoal | null | undefined,
) {
  const normalizedBusinessType = normalizeBusinessType(businessType);

  if (normalizedBusinessType === "arena") {
    switch (goal) {
      case "students":
        return "/reservantes";
      case "schedule":
        return "/agenda";
      case "billing":
        return "/pagamentos";
      default:
        return "/dashboard";
    }
  }

  switch (goal) {
    case "students":
      return "/alunos";
    case "schedule":
      return "/calendario";
    case "billing":
      return "/pagamentos";
    default:
      return "/dashboard";
  }
}

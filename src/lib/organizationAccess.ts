interface OrganizationSessionCheck {
  isAuthenticated: boolean;
  profileOrganizationId?: string | null;
  onboardingCompleted?: boolean | null;
  isMembershipLoading: boolean;
  isRoleKnown: boolean;
  hasActiveOrganizationAccess: boolean;
}

export function shouldRevokeOrganizationSession({
  isAuthenticated,
  profileOrganizationId,
  onboardingCompleted,
  isMembershipLoading,
  isRoleKnown,
  hasActiveOrganizationAccess,
}: OrganizationSessionCheck): boolean {
  return Boolean(
    isAuthenticated
      && profileOrganizationId
      && onboardingCompleted === true
      && !isMembershipLoading
      && isRoleKnown
      && !hasActiveOrganizationAccess,
  );
}

import { describe, expect, it } from 'vitest';
import { shouldRevokeOrganizationSession } from './organizationAccess';

describe('organizationAccess', () => {
  it('revokes an authenticated invited user when the organization membership is inactive', () => {
    expect(shouldRevokeOrganizationSession({
      isAuthenticated: true,
      profileOrganizationId: 'org-1',
      onboardingCompleted: true,
      isMembershipLoading: false,
      isRoleKnown: true,
      hasActiveOrganizationAccess: false,
    })).toBe(true);
  });

  it('keeps active members and owners inside the app', () => {
    expect(shouldRevokeOrganizationSession({
      isAuthenticated: true,
      profileOrganizationId: 'org-1',
      onboardingCompleted: true,
      isMembershipLoading: false,
      isRoleKnown: true,
      hasActiveOrganizationAccess: true,
    })).toBe(false);
  });

  it('does not block first-time onboarding users without an organization profile yet', () => {
    expect(shouldRevokeOrganizationSession({
      isAuthenticated: true,
      profileOrganizationId: null,
      onboardingCompleted: false,
      isMembershipLoading: false,
      isRoleKnown: true,
      hasActiveOrganizationAccess: false,
    })).toBe(false);
  });
});

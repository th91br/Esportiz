import { describe, expect, it } from 'vitest';
import {
  getAuthenticatedHomePath,
  getOnboardingGoalPath,
  getStoredOnboardingGoal,
  isOnboardingGoal,
} from './authRouting';

describe('authRouting', () => {
  it('identifies valid onboarding goals', () => {
    expect(isOnboardingGoal('students')).toBe(true);
    expect(isOnboardingGoal('schedule')).toBe(true);
    expect(isOnboardingGoal('billing')).toBe(true);
    expect(isOnboardingGoal('unknown')).toBe(false);
    expect(isOnboardingGoal(null)).toBe(false);
  });

  it('sends completed or existing profiles to the dashboard', () => {
    expect(getAuthenticatedHomePath({ onboarding_completed: true })).toBe('/dashboard');
    expect(getAuthenticatedHomePath({ ct_name: 'Arena Teste' })).toBe('/dashboard');
    expect(getAuthenticatedHomePath({ niche_settings: { arena: {} } })).toBe('/dashboard');
  });

  it('sends new profiles to onboarding', () => {
    expect(getAuthenticatedHomePath(null)).toBe('/onboarding');
    expect(getAuthenticatedHomePath({ onboarding_completed: false, niche_settings: {} })).toBe('/onboarding');
  });

  it('reads the stored onboarding goal for the active business type', () => {
    expect(getStoredOnboardingGoal({
      business_type: 'arena',
      niche_settings: { arena: { onboarding_goal: 'schedule' } },
    })).toBe('schedule');

    expect(getStoredOnboardingGoal({
      business_type: 'sport_school',
      niche_settings: { sport_school: { onboarding_goal: 'students' } },
    })).toBe('students');

    expect(getStoredOnboardingGoal({
      business_type: 'arena',
      niche_settings: { arena: { onboarding_goal: 'invalid' } },
    })).toBeNull();
  });

  it('maps onboarding goals to sport school paths', () => {
    expect(getOnboardingGoalPath('sport_school', 'students')).toBe('/alunos');
    expect(getOnboardingGoalPath('sport_school', 'schedule')).toBe('/calendario');
    expect(getOnboardingGoalPath('sport_school', 'billing')).toBe('/pagamentos');
    expect(getOnboardingGoalPath('sport_school', null)).toBe('/dashboard');
  });

  it('maps onboarding goals to arena paths', () => {
    expect(getOnboardingGoalPath('arena', 'students')).toBe('/reservantes');
    expect(getOnboardingGoalPath('arena', 'schedule')).toBe('/agenda');
    expect(getOnboardingGoalPath('arena', 'billing')).toBe('/pagamentos');
    expect(getOnboardingGoalPath('arena', undefined)).toBe('/dashboard');
  });
});

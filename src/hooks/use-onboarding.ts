import { useContext } from 'react';
import { OnboardingContext } from '@/lib/onboarding';

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}

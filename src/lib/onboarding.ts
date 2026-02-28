import { createContext, useState, ReactNode, createElement } from 'react';

export interface OnboardingData {
  role: string;
  orgName: string;
  region: string;
  vessels: { name: string; zone: string; species: string; gear: string; trackingTag?: string }[];
  enabledSources: string[];
  rssFeeds: string[];
  twitterHandles: string[];
  govUrls: string[];
  enabledGlobalSources: string[];
  enabledAiSources: string[];
  alertCategories: string[];
  channels: { email: boolean; sms: boolean; whatsapp: boolean; push: boolean };
  urgency: string;
  completedAt: string;
}

export interface OnboardingContextValue {
  data: OnboardingData | null;
  isOnboarded: boolean;
  saveOnboarding: (data: OnboardingData) => void;
  clearOnboarding: () => void;
}

const STORAGE_KEY = 'marewatch:onboarding';

function loadFromStorage(): OnboardingData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingData;
  } catch {
    return null;
  }
}

function saveToStorage(data: OnboardingData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData | null>(() => loadFromStorage());

  const saveOnboarding = (newData: OnboardingData) => {
    saveToStorage(newData);
    setData(newData);
  };

  const clearOnboarding = () => {
    clearStorage();
    setData(null);
  };

  const value: OnboardingContextValue = {
    data,
    isOnboarded: data !== null && !!data.completedAt,
    saveOnboarding,
    clearOnboarding,
  };

  return createElement(OnboardingContext.Provider, { value }, children);
}

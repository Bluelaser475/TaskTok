import { useLocalStorage } from './useLocalStorage';

export function useOnboarding() {
  const [hasOnboarded, setHasOnboarded] = useLocalStorage('tasktok-onboarded', false);

  const completeOnboarding = () => {
    setHasOnboarded(true);
  };

  const skipOnboarding = () => {
    setHasOnboarded(true);
  };

  const resetOnboarding = () => {
    setHasOnboarded(false);
  };

  return {
    hasOnboarded,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding
  };
}
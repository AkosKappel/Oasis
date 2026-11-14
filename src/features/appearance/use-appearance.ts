import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { defaultAppearance, personalAppearance } from '@/database/appearance';

export function useAppearance() {
  const [appearance, setAppearance] = useState(defaultAppearance);
  const [error, setError] = useState<string>();
  useEffect(() => {
    const subscription = liveQuery(() => personalAppearance.get()).subscribe({
      next: (value) => {
        setAppearance(value);
        setError(undefined);
      },
      error: () =>
        setError(
          'Appearance settings could not be loaded. Reload to try again.',
        ),
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    function apply() {
      document.documentElement.dataset.theme =
        appearance.theme === 'system'
          ? media.matches
            ? 'dark'
            : 'light'
          : appearance.theme;
      document.documentElement.dataset.accent = appearance.accent;
    }
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [appearance]);
  return { appearance, error };
}

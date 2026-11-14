import { useCallback, useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { applyAppearance } from './apply-appearance';
import {
  defaultAppearance,
  personalAppearance,
  validateAppearance,
  type Appearance,
} from '@/database/appearance';

export function useAppearance(preview?: Appearance) {
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
  const effective = preview ?? appearance;
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => applyAppearance(effective, media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [effective]);
  const saveAppearance = useCallback(async (input: Appearance) => {
    const values = validateAppearance(input);
    await personalAppearance.save(values);
    setAppearance(values);
  }, []);
  return { appearance, error, saveAppearance };
}

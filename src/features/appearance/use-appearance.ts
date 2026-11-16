import { useSpaceRepositories } from '@/features/spaces/space-context';
import {
  reportStorageError,
  storageWriteSucceeded,
} from '@/database/storage-health';
import { useStorageHealth } from '@/features/storage/use-storage-health';
import { useCallback, useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { applyAppearance } from './apply-appearance';
import {
  defaultAppearance,
  validateAppearance,
  type Appearance,
} from '@/database/appearance';

export function useAppearance(preview?: Appearance) {
  const { personalAppearance } = useSpaceRepositories();
  const { retryVersion } = useStorageHealth();
  const [ready, setReady] = useState(false);
  const [appearance, setAppearance] = useState(defaultAppearance);
  const [error, setError] = useState<string>();
  useEffect(() => {
    const subscription = liveQuery(() => personalAppearance.get()).subscribe({
      next: (value) => {
        setAppearance(value);
        setReady(true);
        setError(undefined);
      },
      error: (cause) => {
        reportStorageError(cause, true);
        setError(
          'Appearance settings could not be loaded. Use Retry storage to try again.',
        );
      },
    });
    return () => subscription.unsubscribe();
  }, [retryVersion, personalAppearance]);
  const effective = preview ?? appearance;
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => applyAppearance(effective, media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [effective]);
  const saveAppearance = useCallback(
    async (input: Appearance) => {
      const values = validateAppearance(input);
      await personalAppearance.save(values);
      setAppearance(values);
      storageWriteSucceeded();
    },
    [personalAppearance],
  );
  return { appearance, error, saveAppearance, ready };
}

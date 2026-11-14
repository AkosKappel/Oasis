import { useSyncExternalStore } from 'react';
import { storageHealth } from '@/database/storage-health';
export function useStorageHealth() {
  return useSyncExternalStore(storageHealth.subscribe, storageHealth.get);
}

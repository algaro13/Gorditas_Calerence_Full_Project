import { useEffect, useRef, useCallback } from 'react';
import { appConfig } from '../config/app-config';

export function usePolling(
  fetchFn: () => Promise<void>,
  interval: number = appConfig.pollingInterval,
  enabled: boolean = true
): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef = useRef(fetchFn);

  // Keep the ref updated with the latest fetchFn
  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Call immediately on mount
    fetchRef.current();

    // Set up polling
    intervalRef.current = setInterval(() => {
      fetchRef.current();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, enabled]);
}

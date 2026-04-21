'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/store/settings';

export function ServerProvidersInit() {
  const fetchServerProviders = useSettingsStore((state) => state.fetchServerProviders);

  useEffect(() => {
    fetchServerProviders();
  }, [fetchServerProviders]);

  return null;
}

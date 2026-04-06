import { useSettingsStore } from '@/lib/store/settings';

export function getCurrentModelConfig() {
  const { providerId, modelId, providersConfig } = useSettingsStore.getState();
  const modelString = `${providerId}:${modelId}`;
  const providerConfig = providersConfig[providerId];
  return {
    providerId,
    modelId,
    modelString,
    apiKey: providerConfig?.apiKey || '',
    baseUrl: providerConfig?.baseUrl || '',
    providerType: providerConfig?.type,
    requiresApiKey: providerConfig?.requiresApiKey,
    isServerConfigured: providerConfig?.isServerConfigured,
  };
}

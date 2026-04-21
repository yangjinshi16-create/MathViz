/**
 * Settings Store
 * Global settings state synchronized with localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProviderId } from '@/lib/ai/providers';
import type { ProvidersConfig } from '@/lib/types/settings';
import { parseModelString, PROVIDERS } from '@/lib/ai/providers';
import { createLogger } from '@/lib/logger';
import { validateProvider, validateModel } from '@/lib/store/settings-validation';

const log = createLogger('Settings');

/** Available playback speed tiers */
export const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface SettingsState {
  // Model selection
  providerId: ProviderId;
  modelId: string;

  // Provider configurations (unified JSON storage)
  providersConfig: ProvidersConfig;

  // TTS settings (legacy, kept for backward compatibility)
  ttsModel: string;

  // Auto-config lifecycle flag (persisted)
  autoConfigApplied: boolean;
  lastAppliedDefaultModel: string;

  // Playback controls
  ttsMuted: boolean;
  ttsVolume: number; // 0-1, actual volume level
  autoPlayLecture: boolean;
  playbackSpeed: PlaybackSpeed;

  // Agent settings
  selectedAgentIds: string[];
  maxTurns: string;
  agentMode: 'preset' | 'auto';
  autoAgentCount: number;

  // Layout preferences (persisted via localStorage)
  sidebarCollapsed: boolean;
  chatAreaCollapsed: boolean;
  chatAreaWidth: number;

  // Actions
  setModel: (providerId: ProviderId, modelId: string) => void;
  setProviderConfig: (providerId: ProviderId, config: Partial<ProvidersConfig[ProviderId]>) => void;
  setProvidersConfig: (config: ProvidersConfig) => void;
  setTtsModel: (model: string) => void;
  setTTSMuted: (muted: boolean) => void;
  setTTSVolume: (volume: number) => void;
  setAutoPlayLecture: (autoPlay: boolean) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setSelectedAgentIds: (ids: string[]) => void;
  setMaxTurns: (turns: string) => void;
  setAgentMode: (mode: 'preset' | 'auto') => void;
  setAutoAgentCount: (count: number) => void;

  // Layout actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setChatAreaCollapsed: (collapsed: boolean) => void;
  setChatAreaWidth: (width: number) => void;

  // Server provider actions
  fetchServerProviders: () => Promise<void>;
}

// Initialize default providers config
const getDefaultProvidersConfig = (): ProvidersConfig => {
  const config: ProvidersConfig = {} as ProvidersConfig;
  Object.keys(PROVIDERS).forEach((pid) => {
    const provider = PROVIDERS[pid as ProviderId];
    config[pid as ProviderId] = {
      apiKey: '',
      baseUrl: '',
      models: provider.models,
      name: provider.name,
      type: provider.type,
      defaultBaseUrl: provider.defaultBaseUrl,
      icon: provider.icon,
      requiresApiKey: provider.requiresApiKey,
      isBuiltIn: true,
    };
  });
  return config;
};

/**
 * Check whether a provider ID exists in the given provider registry.
 */
function hasProviderId(providerMap: Record<string, unknown>, providerId?: string): boolean {
  return typeof providerId === 'string' && providerId in providerMap;
}

/**
 * Ensure providersConfig includes all built-in providers and their latest models.
 * Called on every rehydrate (not just version migrations) so new providers
 * added in code are always picked up without clearing cache.
 */
function ensureBuiltInProviders(state: Partial<SettingsState>): void {
  if (!state.providersConfig) return;
  const defaultConfig = getDefaultProvidersConfig();
  Object.keys(PROVIDERS).forEach((pid) => {
    const providerId = pid as ProviderId;
    if (!state.providersConfig![providerId]) {
      // New provider: add with defaults
      state.providersConfig![providerId] = defaultConfig[providerId];
    } else {
      // Existing provider: merge new models & metadata
      const provider = PROVIDERS[providerId];
      const existing = state.providersConfig![providerId];

      const existingModelIds = new Set(existing.models?.map((m) => m.id) || []);
      const newModels = provider.models.filter((m) => !existingModelIds.has(m.id));
      const mergedModels =
        newModels.length > 0 ? [...newModels, ...(existing.models || [])] : existing.models;

      state.providersConfig![providerId] = {
        ...existing,
        models: mergedModels,
        name: existing.name || provider.name,
        type: existing.type || provider.type,
        defaultBaseUrl: existing.defaultBaseUrl || provider.defaultBaseUrl,
        icon: provider.icon || existing.icon,
        requiresApiKey: existing.requiresApiKey ?? provider.requiresApiKey,
        isBuiltIn: existing.isBuiltIn ?? true,
      };
    }
  });
}

// Migrate from old localStorage format
const migrateFromOldStorage = () => {
  if (typeof window === 'undefined') return null;

  // Check if new storage already exists
  const newStorage = localStorage.getItem('settings-storage');
  if (newStorage) return null; // Already migrated or new install

  // Read old localStorage keys
  const oldLlmModel = localStorage.getItem('llmModel');
  const oldProvidersConfig = localStorage.getItem('providersConfig');
  const oldTtsModel = localStorage.getItem('ttsModel');
  const oldSelectedAgents = localStorage.getItem('selectedAgentIds');
  const oldMaxTurns = localStorage.getItem('maxTurns');

  if (!oldLlmModel && !oldProvidersConfig) return null; // No old data

  // Parse model selection
  let providerId: ProviderId = 'openai';
  let modelId = 'gpt-4o-mini';
  if (oldLlmModel) {
    const [pid, mid] = oldLlmModel.split(':');
    if (pid && mid) {
      providerId = pid as ProviderId;
      modelId = mid;
    }
  }

  // Parse providers config
  let providersConfig = getDefaultProvidersConfig();
  if (oldProvidersConfig) {
    try {
      const parsed = JSON.parse(oldProvidersConfig);
      providersConfig = { ...providersConfig, ...parsed };
    } catch (e) {
      log.error('Failed to parse old providersConfig:', e);
    }
  }

  // Parse other settings
  let ttsModel = 'openai-tts';
  if (oldTtsModel) ttsModel = oldTtsModel;

  let selectedAgentIds = ['default-1', 'default-2', 'default-3'];
  if (oldSelectedAgents) {
    try {
      const parsed = JSON.parse(oldSelectedAgents);
      if (Array.isArray(parsed) && parsed.length > 0) {
        selectedAgentIds = parsed;
      }
    } catch (e) {
      log.error('Failed to parse old selectedAgentIds:', e);
    }
  }

  let maxTurns = '10';
  if (oldMaxTurns) maxTurns = oldMaxTurns;

  return {
    providerId,
    modelId,
    providersConfig,
    ttsModel,
    selectedAgentIds,
    maxTurns,
  };
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => {
      // Try to migrate from old storage
      const migratedData = migrateFromOldStorage();

      return {
        // Initial state (use migrated data if available)
        providerId: migratedData?.providerId || 'openai',
        modelId: migratedData?.modelId || '',
        providersConfig: migratedData?.providersConfig || getDefaultProvidersConfig(),
        ttsModel: migratedData?.ttsModel || 'openai-tts',
        selectedAgentIds: migratedData?.selectedAgentIds || ['default-1', 'default-2', 'default-3'],
        maxTurns: migratedData?.maxTurns?.toString() || '10',
        agentMode: 'auto' as const,
        autoAgentCount: 3,

        // Playback controls
        ttsMuted: false,
        ttsVolume: 1,
        autoPlayLecture: false,
        playbackSpeed: 1,

        // Layout preferences
        sidebarCollapsed: true,
        chatAreaCollapsed: true,
        chatAreaWidth: 320,

        autoConfigApplied: false,
        lastAppliedDefaultModel: '',

        // Actions
        setModel: (providerId, modelId) => set({ providerId, modelId }),

        setProviderConfig: (providerId, config) =>
          set((state) => ({
            providersConfig: {
              ...state.providersConfig,
              [providerId]: {
                ...state.providersConfig[providerId],
                ...config,
              },
            },
          })),

        setProvidersConfig: (config) => set({ providersConfig: config }),

        setTtsModel: (model) => set({ ttsModel: model }),

        setTTSMuted: (muted) => set({ ttsMuted: muted }),

        setTTSVolume: (volume) => set({ ttsVolume: Math.max(0, Math.min(1, volume)) }),

        setAutoPlayLecture: (autoPlay) => set({ autoPlayLecture: autoPlay }),

        setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

        setSelectedAgentIds: (ids) => set({ selectedAgentIds: ids }),

        setMaxTurns: (turns) => set({ maxTurns: turns }),
        setAgentMode: (mode) => set({ agentMode: mode }),
        setAutoAgentCount: (count) => set({ autoAgentCount: count }),

        // Layout actions
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        setChatAreaCollapsed: (collapsed) => set({ chatAreaCollapsed: collapsed }),
        setChatAreaWidth: (width) => set({ chatAreaWidth: width }),

        // Fetch server-configured providers and merge into local state
        fetchServerProviders: async () => {
          try {
            const res = await fetch('/api/server-providers');
            if (!res.ok) return;
            const data = (await res.json()) as {
              providers: Record<string, { models?: string[]; baseUrl?: string }>;
              defaultModel?: string;
            };

            set((state) => {
              // Merge LLM providers
              const newProvidersConfig = { ...state.providersConfig };
              // First reset all server flags
              for (const pid of Object.keys(newProvidersConfig)) {
                const key = pid as ProviderId;
                if (newProvidersConfig[key]) {
                  newProvidersConfig[key] = {
                    ...newProvidersConfig[key],
                    isServerConfigured: false,
                    serverModels: undefined,
                    serverBaseUrl: undefined,
                  };
                }
              }
              // Set flags for server-configured providers
              for (const [pid, info] of Object.entries(data.providers)) {
                const key = pid as ProviderId;
                if (newProvidersConfig[key]) {
                  const sourceModels = PROVIDERS[key]?.models ?? newProvidersConfig[key].models;
                  const normalizedServerModels = (info.models || [])
                    .map((rawModelId) => {
                      const parsed = parseModelString(rawModelId);
                      // Accept both "model-id" and "provider:model-id" forms from env.
                      if (rawModelId.includes(':')) {
                        return parsed.providerId === key ? parsed.modelId : '';
                      }
                      return rawModelId;
                    })
                    .filter(Boolean);
                  // When server specifies allowed models, filter the models list
                  const allowed = new Set(normalizedServerModels.map((id) => id.toLowerCase()));
                  const filteredModels = normalizedServerModels.length
                    ? sourceModels.filter(
                        (m) =>
                          allowed.has(m.id.toLowerCase()) ||
                          allowed.has(`${key}:${m.id}`.toLowerCase()),
                      )
                    : sourceModels;
                  const modelsForProvider = filteredModels.length > 0 ? filteredModels : sourceModels;
                  newProvidersConfig[key] = {
                    ...newProvidersConfig[key],
                    isServerConfigured: true,
                    serverModels: normalizedServerModels.length
                      ? normalizedServerModels
                      : info.models,
                    serverBaseUrl: info.baseUrl,
                    models: modelsForProvider,
                  };
                }
              }

              // === Validate current selections against updated configs ===
              const llmFallback = Object.entries(newProvidersConfig)
                .filter(([, c]) => c.isServerConfigured || !!c.apiKey)
                .map(([id]) => id as ProviderId);

              const validLLMProvider = validateProvider(
                state.providerId,
                newProvidersConfig,
                llmFallback,
              );

              const validLLMModel = validLLMProvider
                ? validateModel(
                    state.modelId,
                    newProvidersConfig[validLLMProvider as ProviderId]?.models ?? [],
                  )
                : '';

              // LLM auto-select: apply server default model when available
              let autoProviderId: ProviderId | undefined;
              let autoModelId: string | undefined;
              if (data.defaultModel) {
                const parsedDefault = parseModelString(data.defaultModel);
                if (hasProviderId(newProvidersConfig, parsedDefault.providerId)) {
                  const defaultProvider = parsedDefault.providerId as ProviderId;
                  const allowedModels = newProvidersConfig[defaultProvider]?.models ?? [];
                  const hasDefaultModel = allowedModels.some((m) => m.id === parsedDefault.modelId);
                  if (hasDefaultModel) {
                    const currentModelAvailable = allowedModels.some((m) => m.id === state.modelId);
                    const defaultChanged = state.lastAppliedDefaultModel !== data.defaultModel;
                    if (!state.autoConfigApplied || defaultChanged || !currentModelAvailable) {
                      autoProviderId = defaultProvider;
                      autoModelId = parsedDefault.modelId;
                    }
                  }
                }
              }
              if (!state.providerId && !state.modelId) {
                for (const [pid, cfg] of Object.entries(newProvidersConfig)) {
                  if (cfg.isServerConfigured) {
                    const serverModels = cfg.serverModels;
                    const modelId = serverModels?.length
                      ? serverModels[0]
                      : PROVIDERS[pid as ProviderId]?.models[0]?.id;
                    if (modelId) {
                      autoProviderId = pid as ProviderId;
                      autoModelId = modelId;
                      break;
                    }
                  }
                }
              }

              return {
                providersConfig: newProvidersConfig,
                autoConfigApplied: true,
                lastAppliedDefaultModel: data.defaultModel || state.lastAppliedDefaultModel,
                ...(validLLMProvider !== state.providerId && {
                  providerId: validLLMProvider as ProviderId,
                }),
                ...(validLLMModel !== state.modelId && { modelId: validLLMModel }),
                ...(autoProviderId && { providerId: autoProviderId }),
                ...(autoModelId && { modelId: autoModelId }),
              };
            });
          } catch (e) {
            // Silently fail — server providers are optional
            log.warn('Failed to fetch server providers:', e);
          }
        },
      };
    },
    {
      name: 'settings-storage',
      version: 2,
      // Migrate persisted state
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<SettingsState>;

        // v0 → v1: clear hardcoded default model so user must actively select
        if (version === 0) {
          if (state.providerId === 'openai' && state.modelId === 'gpt-4o-mini') {
            state.modelId = '';
          }
        }

        // Ensure providersConfig has all built-in providers (also in merge below)
        ensureBuiltInProviders(state);

        // v1 → v2: Replace deep research with web search
        if (version < 2) {
          delete (state as Record<string, unknown>).deepResearchProviderId;
          delete (state as Record<string, unknown>).deepResearchProvidersConfig;
        }

        // Existing users already have their config set up — mark auto-config as done
        if ((state as Record<string, unknown>).autoConfigApplied === undefined) {
          (state as Record<string, unknown>).autoConfigApplied = true;
        }
        if ((state as Record<string, unknown>).lastAppliedDefaultModel === undefined) {
          (state as Record<string, unknown>).lastAppliedDefaultModel = '';
        }

        if ((state as Record<string, unknown>).agentMode === undefined) {
          (state as Record<string, unknown>).agentMode = 'preset';
        }
        if ((state as Record<string, unknown>).autoAgentCount === undefined) {
          (state as Record<string, unknown>).autoAgentCount = 3;
        }

        return state;
      },
      // Custom merge: always sync built-in providers on every rehydrate,
      // so newly added providers/models appear without clearing cache.
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as object) };
        ensureBuiltInProviders(merged as Partial<SettingsState>);
        return merged as SettingsState;
      },
    },
  ),
);

import type { TTSProviderId } from '@/lib/audio/types';

export interface AgentConfig {
  id?: string;
  name?: string;
  ttsVoice?: string;
  voice?: string;
  voiceConfig?: {
    providerId: TTSProviderId;
    modelId?: string;
    voiceId: string;
  };
}

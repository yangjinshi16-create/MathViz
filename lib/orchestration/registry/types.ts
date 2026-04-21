export interface AgentConfig {
  id?: string;
  name?: string;
  ttsVoice?: string;
  voice?: string;
  voiceConfig?: {
    providerId: string;
    modelId?: string;
    voiceId: string;
  };
}

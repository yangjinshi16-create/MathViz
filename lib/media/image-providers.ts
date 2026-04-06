import type { ImageProviderConfig, ImageProviderId } from './types';

export const IMAGE_PROVIDERS: Record<ImageProviderId, ImageProviderConfig> = {
  seedream: {
    id: 'seedream',
    name: 'Seedream',
    requiresApiKey: true,
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com',
    models: [{ id: 'doubao-seedream-5-0-260128', name: 'Seedream 5.0 Lite' }],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '9:16'],
  },
  'qwen-image': {
    id: 'qwen-image',
    name: 'Qwen Image',
    requiresApiKey: true,
    defaultBaseUrl: 'https://dashscope.aliyuncs.com',
    models: [{ id: 'qwen-image-max', name: 'Qwen Image Max' }],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '9:16'],
  },
  'nano-banana': {
    id: 'nano-banana',
    name: 'Nano Banana (Gemini)',
    requiresApiKey: true,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    models: [{ id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image' }],
    supportedAspectRatios: ['16:9', '4:3', '1:1'],
  },
  'minimax-image': {
    id: 'minimax-image',
    name: 'MiniMax Image',
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.minimaxi.com',
    models: [{ id: 'image-01', name: 'Image 01' }],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '9:16'],
  },
  'grok-image': {
    id: 'grok-image',
    name: 'Grok Image (xAI)',
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.x.ai/v1',
    models: [{ id: 'grok-imagine-image', name: 'Grok Imagine Image' }],
    supportedAspectRatios: ['16:9', '4:3', '1:1', '9:16'],
  },
};

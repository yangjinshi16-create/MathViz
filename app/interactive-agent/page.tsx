'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Check, ChevronDown, ChevronLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getCurrentModelConfig } from '@/lib/utils/model-config';
import { SettingsDialog } from '@/components/settings';
import type { SettingsSection } from '@/lib/types/settings';
import { useSettingsStore } from '@/lib/store/settings';
import type { ProviderId } from '@/lib/ai/providers';
import { cn } from '@/lib/utils';

interface InteractiveDiagnostics {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Mathematical floating symbols for background
const MathSymbols = [
  { symbol: '∫', x: '10%', y: '15%', delay: '0s', duration: '20s' },
  { symbol: '∑', x: '85%', y: '20%', delay: '-5s', duration: '18s' },
  { symbol: '∂', x: '75%', y: '70%', delay: '-3s', duration: '22s' },
  { symbol: 'π', x: '20%', y: '75%', delay: '-8s', duration: '19s' },
  { symbol: '∞', x: '50%', y: '10%', delay: '-2s', duration: '21s' },
  { symbol: 'Δ', x: '90%', y: '55%', delay: '-10s', duration: '17s' },
  { symbol: '∇', x: '5%', y: '45%', delay: '-7s', duration: '23s' },
  { symbol: 'θ', x: '60%', y: '85%', delay: '-4s', duration: '20s' },
  { symbol: 'e', x: '35%', y: '5%', delay: '-12s', duration: '18s' },
  { symbol: 'φ', x: '15%', y: '60%', delay: '-6s', duration: '24s' },
  { symbol: 'λ', x: '70%', y: '40%', delay: '-9s', duration: '19s' },
  { symbol: 'Ω', x: '45%', y: '90%', delay: '-11s', duration: '21s' },
];

export default function InteractiveAgentPage() {
  const currentProviderId = useSettingsStore((s) => s.providerId);
  const currentModelId = useSettingsStore((s) => s.modelId);
  const providersConfig = useSettingsStore((s) => s.providersConfig);
  const setModel = useSettingsStore((s) => s.setModel);

  const [conceptName, setConceptName] = useState('');
  const [conceptOverview, setConceptOverview] = useState('');
  const [designIdea, setDesignIdea] = useState('');
  const [subject, setSubject] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [language, setLanguage] = useState<'zh-CN' | 'en-US'>('zh-CN');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<InteractiveDiagnostics | null>(null);
  const [error, setError] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');

  // Timer for generation time
  const [timerActive, setTimerActive] = useState(false);
  const [timerStart, setTimerStart] = useState(0);

  // Load server-side default config on mount (runs once)
  useEffect(() => {
    const loadServerConfig = async () => {
      try {
        const res = await fetch('/api/server-providers');
        if (!res.ok) return;
        const data = await res.json();
        const defaultModel = data?.defaultModel as string | undefined;

        // Load server providers (sets isServerConfigured, serverBaseUrl, serverModels)
        await useSettingsStore.getState().fetchServerProviders?.();

        // Apply default model from server env if user has no model selected
        if (defaultModel) {
          const [pid, mid] = defaultModel.split(':');
          if (pid && mid) {
            // Only auto-set if no model is currently selected
            const currentModel = useSettingsStore.getState().modelId;
            if (!currentModel) {
              useSettingsStore.getState().setModel(pid as ProviderId, mid);
            }
          }
        }
      } catch {
        // Silently fail - server config is optional
      }
    };
    loadServerConfig();
  }, []);

  // Update timer every 100ms when active
  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - timerStart) / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [timerActive, timerStart]);

  const configuredProviders = useMemo(
    () =>
      providersConfig
        ? Object.entries(providersConfig)
            .filter(
              // Keep current provider even if it doesn't fully meet requirements
              ([id, config]) =>
                id === currentProviderId ||
                (
                  (!config.requiresApiKey || config.apiKey || config.isServerConfigured) &&
                  config.models.length >= 1 &&
                  (config.baseUrl || config.defaultBaseUrl || config.serverBaseUrl)
                ),
            )
            .map(([id, config]) => ({
              id: id as ProviderId,
              name: config.name,
              icon: config.icon,
              isServerConfigured: config.isServerConfigured,
              models:
                config.isServerConfigured && !config.apiKey && config.serverModels?.length
                  ? config.models.filter((m) => new Set(config.serverModels).has(m.id))
                  : config.models,
            }))
        : [],
    [providersConfig, currentProviderId],
  );

  const currentProviderConfig = providersConfig?.[currentProviderId];
  const iframeSrcDoc = useMemo(() => (html ? html : undefined), [html]);

  const canSubmit = conceptName.trim().length > 0;

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setWarnings([]);
    setDiagnostics(null);
    setTimerStart(Date.now());
    setTimerActive(true);
    setElapsedTime(0);
    setLoadingStage('正在准备请求...');

    try {
      const modelConfig = getCurrentModelConfig();
      const points = keyPoints
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      setLoadingStage('正在调用 AI 模型...');
      const resp = await fetch('/api/interactive/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-model': modelConfig.modelString || '',
          'x-api-key': modelConfig.apiKey || '',
          'x-base-url': modelConfig.baseUrl || '',
          'x-provider-type': modelConfig.providerType || '',
          'x-requires-api-key': String(modelConfig.requiresApiKey ?? false),
        },
        body: JSON.stringify({
          conceptName: conceptName.trim(),
          conceptOverview: conceptOverview.trim() || undefined,
          designIdea: designIdea.trim() || undefined,
          subject: subject.trim() || undefined,
          keyPoints: points.length > 0 ? points : undefined,
          language,
          model: {
            providerId: modelConfig.providerId,
            model: modelConfig.modelId,
            apiKey: modelConfig.apiKey,
            baseUrl: modelConfig.baseUrl,
            requiresApiKey: modelConfig.requiresApiKey,
          },
        }),
      });

      if (!resp.ok) {
        // Try to parse error from non-SSE response
        let errorMsg = `Request failed (${resp.status})`;
        try {
          const errData = await resp.json();
          if (errData.error) errorMsg = errData.error;
          if (errData.details) errorMsg += `: ${errData.details}`;
        } catch {
          errorMsg = `Request failed (${resp.status}): Server returned an invalid response. Please check your API configuration.`;
        }
        throw new Error(errorMsg);
      }

      // Read SSE stream
      const reader = resp.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalHtml = '';
      let finalWarnings: string[] = [];
      let finalDiagnostics: InteractiveDiagnostics | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines (\n\n)
        // Process complete messages only; keep incomplete tail in buffer
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          if (!message.trim()) continue;

          let eventType = '';
          let eventData = '';

          // Parse all lines within one SSE message
          for (const line of message.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData += line.slice(6);
            } else if (line.startsWith('data:')) {
              // Handle "data:" without space (no data on this line = empty string)
              eventData += line.slice(5);
            }
          }

          if (!eventType || !eventData) continue;

          try {
            const data = JSON.parse(eventData);

            if (eventType === 'progress') {
              if (data.message) {
                setLoadingStage(data.message);
              }
            } else if (eventType === 'heartbeat') {
              // Connection alive, no UI update needed
            } else if (eventType === 'start') {
              setLoadingStage('已连接服务器，开始生成...');
            } else if (eventType === 'result') {
              if (data.success && data.data?.html) {
                finalHtml = data.data.html;
                finalWarnings = data.data.warnings || [];
                finalDiagnostics = data.data.diagnostics || null;
              } else {
                throw new Error(data.error || 'Generation failed with no result');
              }
            } else if (eventType === 'error') {
              throw new Error(data.details || data.error || 'Server error');
            }
          } catch (parseErr) {
            // Re-throw our own business errors
            if (parseErr instanceof Error && !parseErr.message.includes('JSON')) {
              throw parseErr;
            }
            // Log and skip malformed SSE data
            console.warn('[SSE] Failed to parse event:', eventType, eventData?.substring(0, 200));
          }
        }
      }

      if (!finalHtml) {
        throw new Error('生成完成但未获得有效结果，请重试');
      }

      setLoadingStage('正在渲染预览...');
      setHtml(finalHtml);
      setWarnings(finalWarnings);
      setDiagnostics(finalDiagnostics);
      setTimerActive(false);
    } catch (e) {
      setHtml('');
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setTimerActive(false);
      if (/api key required|model not configured|provider/i.test(message)) {
        setSettingsSection('providers');
        setSettingsOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conceptName.trim() || 'interactive-page'}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Mathematical background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-100/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-100/40 via-transparent to-transparent" />
        {MathSymbols.map((item, i) => (
          <div
            key={i}
            className="absolute text-blue-200/20 font-serif select-none pointer-events-none animate-float"
            style={{
              left: item.x,
              top: item.y,
              animationDelay: item.delay,
              animationDuration: item.duration,
            }}
          >
            {item.symbol}
          </div>
        ))}
      </div>

      <main className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="MathViz Logo"
              className="w-12 h-12 rounded-xl shadow-lg shadow-blue-500/20"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                MathViz
              </h1>
              <p className="text-sm bg-gradient-to-r from-violet-600/80 via-blue-600/80 to-cyan-600/80 bg-clip-text text-transparent font-medium">
                数学学习 AI 动画助手
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSettingsSection('providers');
                setSettingsOpen(true);
              }}
              className="gap-2 bg-white/80 backdrop-blur border-blue-200 hover:bg-blue-50"
            >
              <Settings className="size-4" />
              模型设置
            </Button>
            <Button asChild variant="outline" className="bg-white/80 backdrop-blur border-blue-200 hover:bg-blue-50">
              <a href="https://futtcm0cbr4u.meoo.zone/" target="_blank" rel="noopener noreferrer">
                返回首页
              </a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
          {/* Left Panel - Form */}
          <Card className="border-blue-200/50 bg-white/90 shadow-lg backdrop-blur shadow-blue-500/5">
            <CardHeader className="border-b border-blue-100/50 bg-gradient-to-r from-blue-50/50 to-violet-50/30">
              <CardTitle className="text-xl text-blue-700">生成参数</CardTitle>
              <CardDescription>输入数学概念即可生成交互式动画网页</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label htmlFor="conceptName" className="text-sm font-medium text-slate-700">
                  你想学习的概念 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="conceptName"
                  value={conceptName}
                  onChange={(e) => setConceptName(e.target.value)}
                  placeholder="例如：傅里叶变换 / 导数的概念 / Stokes公式"
                  className="border-blue-200 focus:border-blue-400 bg-white/80"
                />
              </div>

              <div className="flex items-center gap-2">
                {configuredProviders.length > 0 ? (
                  <InlineModelSwitcher
                    configuredProviders={configuredProviders}
                    currentProviderId={currentProviderId}
                    currentModelId={currentModelId}
                    currentProviderConfig={currentProviderConfig}
                    setModel={setModel}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSettingsSection('providers');
                      setSettingsOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Bot className="size-3.5" />
                    配置模型服务商
                  </Button>
                )}
                <span className="text-xs text-muted-foreground truncate">
                  当前：{currentProviderConfig?.name || currentProviderId} / {currentModelId}
                </span>
              </div>

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger className="w-full border border-blue-200/60 rounded-lg px-4 py-2.5 text-sm flex items-center justify-between hover:bg-blue-50/50 transition-all bg-gradient-to-r from-blue-50/30 to-violet-50/30">
                  <span className="font-medium text-blue-700">高级可选参数</span>
                  <ChevronDown
                    className={`size-4 text-blue-500 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-sm font-medium text-slate-700">
                      学科领域
                    </Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="例如：高等数学 / 线性代数 / 概率论"
                      className="border-blue-200 focus:border-blue-400 bg-white/80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="overview" className="text-sm font-medium text-slate-700">
                      概念概述
                    </Label>
                    <Textarea
                      id="overview"
                      value={conceptOverview}
                      onChange={(e) => setConceptOverview(e.target.value)}
                      placeholder="描述你想学习的核心内容和目标..."
                      className="border-blue-200 focus:border-blue-400 bg-white/80 min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idea" className="text-sm font-medium text-slate-700">
                      设计思路
                    </Label>
                    <Textarea
                      id="idea"
                      value={designIdea}
                      onChange={(e) => setDesignIdea(e.target.value)}
                      placeholder="描述你期望的可视化风格和交互方式..."
                      className="border-blue-200 focus:border-blue-400 bg-white/80 min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="points" className="text-sm font-medium text-slate-700">
                      关键知识点
                    </Label>
                    <Textarea
                      id="points"
                      value={keyPoints}
                      onChange={(e) => setKeyPoints(e.target.value)}
                      placeholder={'周期与频率的关系\n复数形式表示\n频谱分析方法'}
                      className="border-blue-200 focus:border-blue-400 bg-white/80 min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lang" className="text-sm font-medium text-slate-700">
                      界面语言
                    </Label>
                    <select
                      id="lang"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'zh-CN' | 'en-US')}
                      className="border border-blue-200 focus:border-blue-400 h-9 w-full rounded-md bg-white/80 px-2.5 text-sm outline-none shadow-sm"
                    >
                      <option value="zh-CN">简体中文</option>
                      <option value="en-US">English</option>
                    </select>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex gap-2 pt-2">
                <Button
                  disabled={!canSubmit || loading}
                  onClick={handleGenerate}
                  className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      生成中...
                    </>
                  ) : (
                    '生成网页'
                  )}
                </Button>
                <Button
                  variant="outline"
                  disabled={!html || loading}
                  onClick={handleDownload}
                  className="border-blue-200 hover:bg-blue-50 bg-white/80"
                >
                  下载 HTML
                </Button>
              </div>

              {error ? (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
              ) : null}
              {warnings.length > 0 ? (
                <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 space-y-1">
                  {warnings.map((w, i) => (
                    <p key={`${w}-${i}`}>• {w}</p>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Right Panel - Preview */}
          <Card className="border-blue-200/50 bg-white/90 shadow-lg backdrop-blur shadow-blue-500/5 min-h-[640px]">
            <CardHeader className="border-b border-blue-100/50 bg-gradient-to-r from-blue-50/50 to-violet-50/30">
              <CardTitle className="text-xl text-blue-700">实时预览</CardTitle>
              <CardDescription>
                {diagnostics ? `质量校验：${diagnostics.valid ? '通过' : '未通过'}` : '尚未生成'}
                {loading && elapsedTime > 0 && (
                  <span className="ml-2 text-blue-500/70">| 生成耗时：{elapsedTime}s</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-full space-y-3 pt-5">
              {loading ? (
                <div className="h-[520px] border border-blue-200/30 rounded-lg bg-gradient-to-br from-blue-50/50 to-violet-50/40 relative overflow-hidden">
                  {/* Animated background grid */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="grid grid-cols-8 grid-rows-8 h-full">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className="border border-blue-300" />
                      ))}
                    </div>
                  </div>
                  {/* Loading content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {/* Animated brain/AI icon */}
                    <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-blue-200/50 animate-ping" />
                      <div className="absolute inset-2 rounded-full border-4 border-violet-200/50 animate-ping" style={{ animationDelay: '0.5s' }} />
                      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-12 h-12 text-blue-600/60 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 2a8 8 0 0 1 8 8c0 3-1.5 5.5-4 7v3a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-3c-2.5-1.5-4-4-4-7a8 8 0 0 1 8-8z" />
                          <path d="M12 18v4M8 22h8" />
                          <circle cx="9" cy="9" r="1" fill="currentColor" />
                          <circle cx="15" cy="9" r="1" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                    {/* Typing animation */}
                    <div className="h-8 flex items-center">
                      <span className="text-blue-700/80 text-lg font-medium">{loadingStage}</span>
                      <span className="ml-1 w-2 h-6 bg-blue-500 animate-blink" />
                    </div>
                    {/* Math symbols floating */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <span className="absolute top-1/4 left-1/4 text-3xl text-blue-400/30 animate-float-slow">∫</span>
                      <span className="absolute top-1/3 right-1/4 text-2xl text-violet-400/30 animate-float-medium">∑</span>
                      <span className="absolute bottom-1/3 left-1/3 text-2xl text-blue-400/20 animate-float-fast">∂</span>
                      <span className="absolute bottom-1/4 right-1/3 text-3xl text-violet-400/25 animate-float-slow" style={{ animationDelay: '1s' }}>π</span>
                      <span className="absolute top-1/2 right-1/4 text-xl text-blue-300/20 animate-float-medium" style={{ animationDelay: '0.5s' }}>∞</span>
                    </div>
                    {/* Progress bar */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48">
                      <div className="h-1 bg-blue-200/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 animate-progress" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : iframeSrcDoc ? (
                <iframe
                  title="Interactive HTML Preview"
                  srcDoc={iframeSrcDoc}
                  className="w-full h-[520px] border border-blue-200/50 rounded-lg bg-white shadow-inner"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : (
                <div className="h-[520px] border border-blue-200/30 rounded-lg grid place-items-center text-sm text-muted-foreground bg-gradient-to-br from-blue-50/30 to-violet-50/20">
                  <div className="text-center space-y-3">
                    <div className="text-5xl opacity-30">∫</div>
                    <p>输入概念后将在此处显示预览</p>
                  </div>
                </div>
              )}

              {diagnostics && diagnostics.errors.length > 0 ? (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 space-y-1">
                  {diagnostics.errors.map((err, i) => (
                    <p key={`${err}-${i}`}>• {err}</p>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 text-sm text-slate-500/70">
          <p>© 2026 James Young</p>
        </footer>
      </main>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) setSettingsSection(undefined);
        }}
        initialSection={settingsSection}
      />

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.15;
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
            opacity: 0.25;
          }
          50% {
            transform: translateY(-10px) rotate(-3deg);
            opacity: 0.2;
          }
          75% {
            transform: translateY(-25px) rotate(3deg);
            opacity: 0.25;
          }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 0.8s ease-in-out infinite;
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-slow 4s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-slow 3s ease-in-out infinite;
        }
        @keyframes progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 100%; margin-left: 0; }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

interface InlineConfiguredProvider {
  id: ProviderId;
  name: string;
  icon?: string;
  isServerConfigured?: boolean;
  models: { id: string; name: string }[];
}

function InlineModelSwitcher({
  configuredProviders,
  currentProviderId,
  currentModelId,
  currentProviderConfig,
  setModel,
}: {
  configuredProviders: InlineConfiguredProvider[];
  currentProviderId: ProviderId;
  currentModelId: string;
  currentProviderConfig: { name: string; icon?: string } | undefined;
  setModel: (providerId: ProviderId, modelId: string) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [drillProvider, setDrillProvider] = useState<ProviderId | null>(null);

  const activeProvider = useMemo(
    () => configuredProviders.find((p) => p.id === drillProvider),
    [configuredProviders, drillProvider],
  );

  return (
    <Popover
      open={popoverOpen}
      onOpenChange={(open) => {
        setPopoverOpen(open);
        if (open) setDrillProvider(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center justify-center size-8 rounded-full transition-all cursor-pointer select-none',
            'ring-1 ring-blue-300/60 hover:ring-blue-400 hover:bg-blue-50 shadow-sm bg-white',
            currentModelId && 'ring-violet-400 bg-violet-50',
          )}
          aria-label="切换模型"
        >
          {currentProviderConfig?.icon ? (
            <img src={currentProviderConfig.icon} alt={currentProviderConfig.name} className="size-4 rounded-sm" />
          ) : (
            <Bot className="size-3.5 text-blue-500" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0 shadow-xl border-blue-200">
        {!drillProvider && (
          <div className="max-h-72 overflow-y-auto">
            <div className="px-3 py-2 border-b bg-gradient-to-r from-blue-50/50 to-violet-50/30">
              <span className="text-xs font-semibold text-blue-700">选择模型服务商</span>
            </div>
            {configuredProviders.map((provider) => {
              const isActive = currentProviderId === provider.id;
              return (
                <button
                  key={provider.id}
                  onClick={() => setDrillProvider(provider.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-border/30',
                    isActive ? 'bg-violet-50/50' : 'hover:bg-blue-50/50',
                  )}
                >
                  {provider.icon ? (
                    <img src={provider.icon} alt={provider.name} className="size-5 rounded-sm shrink-0" />
                  ) : (
                    <Bot className="size-5 text-blue-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{provider.name}</span>
                    {provider.isServerConfigured && (
                      <span className="text-[9px] px-1 py-0 rounded border text-blue-500 ml-1.5">
                        server
                      </span>
                    )}
                  </div>
                  {isActive && currentModelId && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                      {currentModelId}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {drillProvider && activeProvider && (
          <div className="max-h-72 overflow-y-auto">
            <button
              onClick={() => setDrillProvider(null)}
              className="w-full flex items-center gap-2 px-3 py-2 border-b bg-gradient-to-r from-blue-50/40 to-violet-50/20 hover:bg-blue-50/60 transition-colors"
            >
              <ChevronLeft className="size-3.5 text-blue-500" />
              {activeProvider.icon ? (
                <img src={activeProvider.icon} alt={activeProvider.name} className="size-4 rounded-sm" />
              ) : (
                <Bot className="size-4 text-blue-500" />
              )}
              <span className="text-xs font-semibold">{activeProvider.name}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {activeProvider.models.length} models
              </span>
            </button>
            {activeProvider.models.map((model) => {
              const isSelected = currentProviderId === drillProvider && currentModelId === model.id;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    setModel(drillProvider, model.id);
                    setPopoverOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-blue-50/50 transition-colors border-b border-border/20',
                    isSelected && 'bg-violet-50',
                  )}
                >
                  <span className="flex-1 truncate font-mono text-xs">{model.name}</span>
                   {isSelected && <Check className="size-3.5 text-violet-600" />}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

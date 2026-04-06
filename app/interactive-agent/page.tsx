'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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

interface GenerateResponse {
  success: boolean;
  data?: {
    html: string;
    warnings?: string[];
    diagnostics?: InteractiveDiagnostics;
  };
  error?: string;
  details?: string;
}

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

  const configuredProviders = useMemo(
    () =>
      providersConfig
        ? Object.entries(providersConfig)
            .filter(
              ([, config]) =>
                (!config.requiresApiKey || config.apiKey || config.isServerConfigured) &&
                config.models.length >= 1 &&
                (config.baseUrl || config.defaultBaseUrl || config.serverBaseUrl),
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
    [providersConfig],
  );

  const currentProviderConfig = providersConfig?.[currentProviderId];
  const iframeSrcDoc = useMemo(() => (html ? html : undefined), [html]);

  const canSubmit = conceptName.trim().length > 0;

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setWarnings([]);
    setDiagnostics(null);

    try {
      const modelConfig = getCurrentModelConfig();
      const points = keyPoints
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

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
        }),
      });

      const result = (await resp.json()) as GenerateResponse;
      if (!resp.ok || !result.success || !result.data?.html) {
        const msg = result.error || `Request failed (${resp.status})`;
        const details = result.details ? `: ${result.details}` : '';
        throw new Error(`${msg}${details}`);
      }

      setHtml(result.data.html);
      setWarnings(result.data.warnings || []);
      setDiagnostics(result.data.diagnostics || null);
    } catch (e) {
      setHtml('');
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
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
    <main className="mx-auto w-full max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
            zju_math_helper
          </h1>
          <p className="text-sm text-muted-foreground">
            输入概念即可生成交互式动画网页，支持模型服务商快速切换。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSettingsSection('providers');
              setSettingsOpen(true);
            }}
            className="gap-2"
          >
            <Settings className="size-4" />
            模型设置
          </Button>
          <Button asChild variant="outline">
            <Link href="/">返回首页</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>生成参数</CardTitle>
            <CardDescription>概念为必填，其余均可选</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conceptName">你想学习的概念 *</Label>
              <Input
                id="conceptName"
                value={conceptName}
                onChange={(e) => setConceptName(e.target.value)}
                placeholder="例如：简谐运动 / 光合作用 / 二叉树遍历"
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
              <CollapsibleTrigger className="w-full border rounded-md px-3 py-2 text-sm flex items-center justify-between hover:bg-muted/40 transition-colors">
                <span>高级可选参数（不填也可生成）</span>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject（可选）</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="例如：Physics"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overview">Concept Overview（可选）</Label>
                  <Textarea
                    id="overview"
                    value={conceptOverview}
                    onChange={(e) => setConceptOverview(e.target.value)}
                    placeholder="留空时将自动推断概念说明"
                    className="min-h-20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idea">Design Idea（可选）</Label>
                  <Textarea
                    id="idea"
                    value={designIdea}
                    onChange={(e) => setDesignIdea(e.target.value)}
                    placeholder="留空时将自动使用默认交互设计策略"
                    className="min-h-20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points">Key Points（可选，每行一个）</Label>
                  <Textarea
                    id="points"
                    value={keyPoints}
                    onChange={(e) => setKeyPoints(e.target.value)}
                    placeholder={'振幅影响位移上限\n频率影响振动快慢'}
                    className="min-h-20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lang">Language（可选）</Label>
                  <select
                    id="lang"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'zh-CN' | 'en-US')}
                    className="border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-2.5 text-sm outline-none"
                  >
                    <option value="zh-CN">zh-CN</option>
                    <option value="en-US">en-US</option>
                  </select>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex gap-2 pt-2">
              <Button disabled={!canSubmit || loading} onClick={handleGenerate}>
                {loading ? '生成中...' : '生成网页'}
              </Button>
              <Button variant="outline" disabled={!html || loading} onClick={handleDownload}>
                下载 HTML
              </Button>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {warnings.length > 0 ? (
              <div className="text-xs text-amber-600 space-y-1">
                {warnings.map((w, i) => (
                  <p key={`${w}-${i}`}>• {w}</p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-h-[640px]">
          <CardHeader>
            <CardTitle>实时预览</CardTitle>
            <CardDescription>
              {diagnostics ? `质量校验：${diagnostics.valid ? '通过' : '未通过'}` : '尚未生成'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-full space-y-3">
            {iframeSrcDoc ? (
              <iframe
                title="Interactive HTML Preview"
                srcDoc={iframeSrcDoc}
                className="w-full h-[520px] border rounded-md bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="h-[520px] border rounded-md grid place-items-center text-sm text-muted-foreground">
                生成后将在此处显示预览
              </div>
            )}

            {diagnostics && diagnostics.errors.length > 0 ? (
              <div className="text-xs text-destructive space-y-1">
                {diagnostics.errors.map((err, i) => (
                  <p key={`${err}-${i}`}>• {err}</p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) setSettingsSection(undefined);
        }}
        initialSection={settingsSection}
      />
    </main>
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
            'ring-1 ring-border/60 hover:ring-border hover:bg-muted/60',
            currentModelId && 'ring-violet-300 dark:ring-violet-700 bg-violet-50 dark:bg-violet-950/20',
          )}
          aria-label="切换模型"
        >
          {currentProviderConfig?.icon ? (
            <img src={currentProviderConfig.icon} alt={currentProviderConfig.name} className="size-4 rounded-sm" />
          ) : (
            <Bot className="size-3.5 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0">
        {!drillProvider && (
          <div className="max-h-72 overflow-y-auto">
            <div className="px-3 py-2 border-b">
              <span className="text-xs font-semibold text-muted-foreground">选择模型服务商</span>
            </div>
            {configuredProviders.map((provider) => {
              const isActive = currentProviderId === provider.id;
              return (
                <button
                  key={provider.id}
                  onClick={() => setDrillProvider(provider.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-border/30',
                    isActive ? 'bg-violet-50/50 dark:bg-violet-950/10' : 'hover:bg-muted/50',
                  )}
                >
                  {provider.icon ? (
                    <img src={provider.icon} alt={provider.name} className="size-5 rounded-sm shrink-0" />
                  ) : (
                    <Bot className="size-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{provider.name}</span>
                    {provider.isServerConfigured && (
                      <span className="text-[9px] px-1 py-0 rounded border text-muted-foreground ml-1.5">
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
              className="w-full flex items-center gap-2 px-3 py-2 border-b bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <ChevronLeft className="size-3.5 text-muted-foreground" />
              {activeProvider.icon ? (
                <img src={activeProvider.icon} alt={activeProvider.name} className="size-4 rounded-sm" />
              ) : (
                <Bot className="size-4 text-muted-foreground" />
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
                    'w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/20',
                    isSelected && 'bg-violet-50 dark:bg-violet-950/20',
                  )}
                >
                  <span className="flex-1 truncate font-mono text-xs">{model.name}</span>
                  {isSelected && <Check className="size-3.5 text-violet-600 dark:text-violet-400" />}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

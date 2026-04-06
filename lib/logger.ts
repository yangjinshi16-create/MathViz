const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

function getMinLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return env in LOG_LEVELS ? (env as LogLevel) : 'info';
}

export function createLogger(tag: string) {
  const emit = (level: LogLevel, args: unknown[]) => {
    if (LOG_LEVELS[level] < LOG_LEVELS[getMinLevel()]) return;
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${tag}] ${args
      .map((a) => (a instanceof Error ? (a.stack ?? a.message) : typeof a === 'string' ? a : JSON.stringify(a)))
      .join(' ')}`;
    const fn = level === 'debug' ? console.debug : level === 'warn' ? console.warn : level === 'error' ? console.error : console.log;
    fn(line);
  };
  return {
    debug: (...args: unknown[]) => emit('debug', args),
    info: (...args: unknown[]) => emit('info', args),
    warn: (...args: unknown[]) => emit('warn', args),
    error: (...args: unknown[]) => emit('error', args),
  };
}

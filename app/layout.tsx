import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/hooks/use-i18n';
import { ServerProvidersInit } from '@/components/server-providers-init';

export const metadata: Metadata = {
  title: 'MathViz - 数学学习AI动画助手',
  description: '输入数学概念即可生成交互式动画网页，让抽象的数学知识变得生动直观。',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50/40">
        <I18nProvider>
          <ServerProvidersInit />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
